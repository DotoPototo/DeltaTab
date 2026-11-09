import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { browser } from 'wxt/browser';
import { hasConsent, requestConsent, type DataFeature } from '@/libs/dataConsent';

// Browsers only allow `request()` during a user gesture, so call it from a click.

export interface PermissionSpec {
  permissions?: string[];
  origins?: string[];
  consent?: DataFeature;
}

export const originPattern = (url: string): string | null => {
  try {
    const { protocol, host } = new URL(url);
    return protocol === 'https:' ? `${protocol}//${host}/*` : null;
  } catch {
    return null;
  }
};

export const originsFor = (urls: string[]): string[] => [...new Set(urls.map(originPattern).filter((o): o is string => !!o))];

type BrowserPermissions = Parameters<typeof browser.permissions.request>[0];

const normalise = (spec: PermissionSpec) => ({ permissions: spec.permissions ?? [], origins: spec.origins ?? [] }) as BrowserPermissions;

const needsBrowser = (spec: PermissionSpec) => !!(spec.permissions?.length || spec.origins?.length);

const hasBrowserPermissions = async (spec: PermissionSpec): Promise<boolean> => !needsBrowser(spec) || browser.permissions.contains(normalise(spec));

export const requestPermissions = (spec: PermissionSpec): Promise<boolean> => {
  if (spec.consent) return requestConsent(spec.consent, normalise(spec));
  return needsBrowser(spec) ? browser.permissions.request(normalise(spec)) : Promise.resolve(true);
};

// An async check that lands after a newer check or a request is discarded.
export const usePermissions = (spec: MaybeRefOrGetter<PermissionSpec>) => {
  const browserGranted = ref<boolean | null>(null);
  let generation = 0;
  const check = async () => {
    const mine = ++generation;
    const result = await hasBrowserPermissions(toValue(spec));
    if (mine === generation) browserGranted.value = result;
  };
  watch(
    () => JSON.stringify(toValue(spec)),
    () => {
      browserGranted.value = null; // pending until this spec's answer arrives
      check();
    },
    { immediate: true }
  );
  browser.permissions.onAdded.addListener(check);
  browser.permissions.onRemoved.addListener(check);
  onScopeDispose(() => {
    generation++; // any check still in flight lands nowhere
    browser.permissions.onAdded.removeListener(check);
    browser.permissions.onRemoved.removeListener(check);
  });

  const granted = computed(() => (browserGranted.value === null ? null : browserGranted.value && hasConsent(toValue(spec).consent)));

  return {
    granted,
    request: async () => {
      const mine = ++generation;
      const result = await requestPermissions(toValue(spec));
      const now = await hasBrowserPermissions(toValue(spec));
      if (mine === generation) browserGranted.value = now;
      return result;
    },
  };
};
