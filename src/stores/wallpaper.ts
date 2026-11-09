import { computed, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';
import { readBoot, writeBoot } from '@/libs/boot';
import { DAILY_SOURCES, isOutdated, refreshDaily } from '@/libs/wallpaper/daily';
import { displayTarget, processInWorker } from '@/libs/wallpaper/imageWorker';
import {
  dailyItem,
  displayItem,
  findRecord,
  getImage,
  isAccentStale,
  isDaily,
  isStillCurrent,
  libraryItem,
  requestAccentRefresh,
  saveToLibrary,
  shownItem,
  takeFromQueue,
  type DailySource,
  type Wallpaper,
  type WallpaperSource,
} from '@/libs/wallpaper/library';
import { useSettingsStore } from '@/stores/settings';

const OLD_URL_GRACE = 2000;

export const useWallpaperStore = defineStore('wallpaper', () => {
  const settingsStore = useSettingsStore();
  const library = shallowRef<Wallpaper[]>([]);
  const daily = shallowRef<Partial<Record<DailySource, Wallpaper>>>({});
  const current = shallowRef<Wallpaper | null>(null);
  const upcoming = shallowRef<Wallpaper | null>(null);
  const url = ref<string>();
  const error = ref<string>();

  const source = computed<WallpaperSource>(() => {
    const selected = settingsStore.settings.wallpaper.source;
    return selected === 'library' && !library.value.length ? 'wikimedia' : selected;
  });

  // Only the newest display() commits, so a slow decode can't overwrite a later choice.
  let displayRequest = 0;

  const display = async (wallpaper: Wallpaper): Promise<'gone' | void> => {
    const request = ++displayRequest;
    if (current.value?.id === wallpaper.id && url.value) return;
    const blob = await getImage(wallpaper.id);
    if (!blob) throw new Error(`Wallpaper ${wallpaper.id} has no image data`);
    const next = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = next;
      await img.decode();
    } catch (e) {
      URL.revokeObjectURL(next);
      throw e;
    }
    // Re-read: the record may have been edited or deleted while decoding.
    const record = findRecord(wallpaper.id, library.value, daily.value) ?? (isDaily(wallpaper) ? wallpaper : null);
    if (request !== displayRequest || !record) {
      URL.revokeObjectURL(next);
      return request === displayRequest ? 'gone' : undefined;
    }
    const previous = url.value;
    url.value = next;
    current.value = record;
    // The outgoing image is still fading out, so its URL has to outlive the swap.
    if (previous) setTimeout(() => URL.revokeObjectURL(previous), OLD_URL_GRACE);
    if (isAccentStale(record)) requestAccentRefresh(record.id);
  };

  const fromQueue = async (avoid?: string) => {
    const id = await takeFromQueue(
      library.value.map((w) => w.id),
      avoid
    );
    return library.value.find((w) => w.id === id) ?? null;
  };

  const rotation = computed(() => settingsStore.settings.wallpaper.rotate);

  const prepareUpcoming = async () => {
    const src = source.value;
    if (src !== 'library') upcoming.value = daily.value[src] ?? null;
    // With hourly/daily rotation the next tab most likely shows this same image.
    else if (rotation.value !== 'tab') upcoming.value = current.value;
    else upcoming.value = await fromQueue(current.value?.id);
    if (upcoming.value) {
      const { id, accent } = upcoming.value;
      writeBoot({ next: { id, accent } });
    }
  };

  const requestDaily = async (src: DailySource) => {
    error.value = undefined;
    try {
      await refreshDaily(src, processInWorker);
    } catch (e) {
      console.warn(`[wallpaper] ${src} unavailable:`, e);
      const fallback = DAILY_SOURCES.find((s) => s !== src);
      if (!current.value && fallback && !daily.value[fallback]) await refreshDaily(fallback, processInWorker).catch(() => undefined);
      if (!current.value) error.value = 'Couldn’t fetch today’s image. Check your connection or content blocker.';
    }
  };

  const show = async (preferredId?: string, forceNew = false) => {
    const src = source.value;
    let wallpaper: Wallpaper | null;
    if (src === 'library') {
      const shown = await shownItem.getValue();
      const keep = !forceNew && shown && isStillCurrent(rotation.value, shown.at) ? library.value.find((w) => w.id === shown.id) : undefined;
      wallpaper = keep ?? library.value.find((w) => w.id === preferredId) ?? (await fromQueue(current.value?.id));
      if (wallpaper && !keep) shownItem.setValue({ id: wallpaper.id, at: Date.now() });
    } else {
      const own = daily.value[src];
      if (!own || isOutdated(own, src)) requestDaily(src);
      wallpaper = own ?? DAILY_SOURCES.map((s) => daily.value[s]).find(Boolean) ?? null;
    }
    try {
      // Deleted while decoding: it's no longer in the library, so this recursion ends.
      if (wallpaper && (await display(wallpaper)) === 'gone') return show(undefined, forceNew);
    } catch (e) {
      console.error('[wallpaper] Failed to display:', e);
      error.value = 'This wallpaper could not be opened';
    }
    await prepareUpcoming();
  };

  const init = async () => {
    const [lib, dly, storedDisplay] = await Promise.all([libraryItem.getValue(), dailyItem.getValue(), displayItem.getValue()]);
    library.value = lib;
    daily.value = dly;
    libraryItem.watch((value) => (library.value = value));
    dailyItem.watch((value) => (daily.value = value));
    watch([library, daily], ([lib, dly]) => {
      const fresh = (w: Wallpaper | null) => (w && [...lib, ...Object.values(dly)].find((x) => x?.id === w.id)) || w;
      current.value = fresh(current.value);
      upcoming.value = fresh(upcoming.value);
    });

    const target = displayTarget();
    if (target.width !== storedDisplay.width || target.height !== storedDisplay.height) displayItem.setValue(target);

    await show(readBoot().next?.id);

    watch(source, () => show());
    watch(daily, (value) => {
      const src = source.value;
      const latest = src !== 'library' ? value[src] : undefined;
      if ((latest && latest.id !== current.value?.id) || !current.value) show();
    });
    watch(library, (value) => {
      if (current.value && !isDaily(current.value) && !value.some((w) => w.id === current.value?.id)) show();
    });
  };

  return {
    library,
    daily,
    current,
    upcoming,
    url,
    source,
    error,
    init,
    next: () => (rotation.value === 'tab' ? show(upcoming.value?.id) : show(undefined, true)),
    showNow: async (id: string) => {
      const wallpaper = library.value.find((w) => w.id === id);
      if (!wallpaper) return;
      await shownItem.setValue({ id, at: Date.now() });
      await display(wallpaper);
      await prepareUpcoming();
    },
    saveCurrent: () => (current.value ? saveToLibrary(current.value) : Promise.reject(new Error('Nothing to save'))),
  };
});
