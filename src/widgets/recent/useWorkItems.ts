import { computed, onScopeDispose, shallowRef, watch, type Ref } from 'vue';
import { browser } from 'wxt/browser';
import { useEventListener } from '@/composables/useEventListener';
import { DAY } from '@/libs/time';
import type { RecentConfig } from './index';
import { matchHistory, type WorkItem } from './match';
import { RECIPES, customRecipe, type Recipe } from './recipes';

const MAX_HISTORY = 5000;
const REFRESH_DELAY = 1500;

const activeRecipes = (config: RecentConfig): Recipe[] => [
  // Custom patterns first: they're more specific to the user than the generic catch-alls.
  ...config.custom.flatMap((c) => {
    try {
      return [customRecipe(c)];
    } catch {
      return [];
    }
  }),
  ...RECIPES.filter((r) => !config.disabled.includes(r.id)),
];

export const useWorkItems = (config: Ref<RecentConfig>) => {
  const items = shallowRef<WorkItem[]>([]);
  const loaded = shallowRef(false);

  // Only the newest load may land: an older search finishing late must never replace a newer result.
  let generation = 0;
  let disposed = false;
  const load = async () => {
    if (disposed) return;
    const mine = ++generation;
    const settings = config.value;
    try {
      const entries = await browser.history.search({ text: '', startTime: Date.now() - settings.days * DAY, maxResults: MAX_HISTORY });
      if (mine !== generation) return;
      items.value = matchHistory(
        entries.map((e) => ({ url: e.url ?? '', title: e.title, lastVisitTime: e.lastVisitTime, visitCount: e.visitCount })),
        activeRecipes(settings)
      );
    } catch (error) {
      // If permission was revoked meanwhile, keep what's shown rather than blanking the list.
      if (mine === generation) console.warn('[recent] History search failed:', error);
    }
    if (mine === generation) loaded.value = true;
  };

  // History changes refresh the list, but a hidden tab waits until it's seen again.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleLoad = () => {
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(load, REFRESH_DELAY);
  };

  watch(() => JSON.stringify([config.value.disabled, config.value.custom, config.value.days]), load, { immediate: true });
  browser.history.onVisited.addListener(scheduleLoad);
  browser.history.onVisitRemoved.addListener(scheduleLoad);
  useEventListener(document, 'visibilitychange', () => !document.hidden && load());
  onScopeDispose(() => {
    disposed = true;
    generation++;
    clearTimeout(timer);
    browser.history.onVisited.removeListener(scheduleLoad);
    browser.history.onVisitRemoved.removeListener(scheduleLoad);
  });

  const sorted = computed(() => [...items.value].sort((a, b) => (config.value.sort === 'frequent' ? b.score - a.score : b.lastVisit - a.lastVisit)));

  return { items: sorted, loaded };
};
