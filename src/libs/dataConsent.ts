import { ref } from 'vue';
import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';

// Consent is per feature. Firefox 140+ also has built-in consent by data category
// (`data_collection_permissions`), so there a feature needs both.
export type DataFeature = 'weather' | 'calendar' | 'github';

type DataCategory = 'locationInfo' | 'searchTerms' | 'authenticationInfo';

export const DATA_FEATURES: Record<DataFeature, { title: string; detail: string; categories: DataCategory[] }> = {
  weather: {
    title: 'Weather',
    detail: 'Sends the place you choose, and what you type when searching for it, to Open-Meteo for its forecast.',
    categories: ['locationInfo', 'searchTerms'],
  },
  calendar: {
    title: 'Calendar holidays',
    detail: 'Sends your country to Nager.Date to mark public holidays.',
    categories: ['locationInfo'],
  },
  github: {
    title: 'GitHub',
    detail: 'Sends your access token to GitHub, and only GitHub, to read your pull requests and notifications (Release Radar uses it for private repos).',
    categories: ['authenticationInfo'],
  },
};

const recorded = storage.defineItem<DataFeature[]>('local:data-consent', {
  fallback: [],
  // Version 1 recorded data categories shared between features; per-feature consent must be asked again.
  version: 2,
  migrations: { 2: () => [] },
});

const allowedFeatures = ref(new Set<DataFeature>());
const grantedCategories = ref(new Set<DataCategory>());
let native = false;

// Only the newest of overlapping reads applies, so a stale read can't revive a withdrawn consent.
let refreshes = 0;
const refresh = async () => {
  const id = ++refreshes;
  const features = await recorded.getValue();
  const granted = native ? (((await browser.permissions.getAll()) as { data_collection?: DataCategory[] }).data_collection ?? []) : [];
  if (id !== refreshes) return;
  allowedFeatures.value = new Set(features);
  grantedCategories.value = new Set(granted);
};

// Locked across tabs, so a grant in one can't overwrite a simultaneous withdrawal in another.
const update = (change: (features: DataFeature[]) => DataFeature[]) =>
  navigator.locks.request('data-consent', async () => {
    const next = change(await recorded.getValue());
    await recorded.setValue(next);
    return next;
  });

export const ready = (async () => {
  try {
    native = 'data_collection' in ((await browser.permissions.getAll()) as object);
  } catch {
    native = false;
  }
  await refresh();
  recorded.watch(refresh);
  if (native) {
    browser.permissions.onAdded.addListener(refresh);
    browser.permissions.onRemoved.addListener(refresh);
  }
})();

export const hasConsent = (feature?: DataFeature) =>
  !feature || (allowedFeatures.value.has(feature) && (!native || DATA_FEATURES[feature].categories.every((c) => grantedCategories.value.has(c))));

// Call straight from the click with no await before it: browsers only prompt during a user gesture.
export const requestConsent = (feature: DataFeature, also?: { permissions?: string[]; origins?: string[] }): Promise<boolean> => {
  const ask = () => {
    if (native)
      return browser.permissions.request({
        permissions: also?.permissions ?? [],
        origins: also?.origins ?? [],
        data_collection: DATA_FEATURES[feature].categories,
      } as Parameters<typeof browser.permissions.request>[0]);
    if (also?.permissions?.length || also?.origins?.length) return browser.permissions.request(also as Parameters<typeof browser.permissions.request>[0]);
    // The click on the explained "Allow" button is the consent.
    return Promise.resolve(true);
  };
  return ask().then(async (granted) => {
    if (granted) await update((features) => [...new Set([...features, feature])]);
    await refresh();
    return granted && hasConsent(feature);
  });
};

// Firefox's category grant is left alone: categories are shared, so removing one could undo
// another feature's grant, and the per-feature record already stops the sending.
export const revokeConsent = async (feature: DataFeature) => {
  await update((features) => features.filter((f) => f !== feature));
  await refresh();
};
