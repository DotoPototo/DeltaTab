import { ref, watchEffect } from 'vue';
import { dailyItem, getThumb, libraryItem, liveWallpaperIds } from '@/libs/wallpaper/library';

// Shared per page, so remounting a grid paints at once instead of re-reading IndexedDB and flashing.

const resolved = new Map<string, string>();
const pending = new Map<string, Promise<string | undefined>>();

const load = (id: string) => {
  let promise = pending.get(id);
  if (!promise) {
    promise = getThumb(id)
      .then((blob) => {
        if (!blob) return undefined;
        const url = URL.createObjectURL(blob);
        resolved.set(id, url);
        return url;
      })
      .catch(() => undefined)
      .finally(() => {
        // Failures aren't cached, so they're retried next time.
        if (!resolved.has(id)) pending.delete(id);
      });
    pending.set(id, promise);
  }
  return promise;
};

const release = async () => {
  const live = await liveWallpaperIds();
  for (const [id, url] of resolved) {
    if (live.has(id)) continue;
    URL.revokeObjectURL(url);
    resolved.delete(id);
    pending.delete(id);
  }
};
libraryItem.watch(release);
dailyItem.watch(release);

export const useThumbnail = (id: () => string | undefined) => {
  const url = ref(resolved.get(id() ?? ''));
  watchEffect(async () => {
    const current = id();
    if (current) url.value = resolved.get(current) ?? (await load(current));
  });
  return url;
};
