import { browser } from 'wxt/browser';
import { processImage } from '@/libs/wallpaper/image';
import { addToLibrary, displayItem, libraryItem } from '@/libs/wallpaper/library';

// Converts 1.x `bg-data-<id>` data URLs into the library. A `legacy:<id>` fingerprint stops an
// interrupted run importing one twice; a legacy image is deleted only once its replacement is saved.

const LEGACY_KEYS = [
  'backgrounds',
  'backgrounds-thumbnails',
  'backgrounds-sizes',
  'backgrounds-size',
  'shuffledIndices',
  'currentShuffleIndex',
  'bingImage',
  'bingLastFetch',
  'bingMetadata',
];
const ATTEMPTS_KEY = 'legacy-wallpaper-attempts';
const MAX_ATTEMPTS = 3;

export const migrateLegacyWallpapers = (process: typeof processImage = processImage) =>
  navigator.locks.request('legacy-wallpapers', async () => {
    const { backgrounds, [ATTEMPTS_KEY]: storedAttempts } = await browser.storage.local.get(['backgrounds', ATTEMPTS_KEY]);
    if (!Array.isArray(backgrounds)) return;

    const attempts = (storedAttempts ?? {}) as Record<string, number>;
    const display = await displayItem.getValue();
    const done = new Set((await libraryItem.getValue()).map((w) => w.fingerprint));
    const remaining: string[] = [];

    for (const id of backgrounds as string[]) {
      const key = `bg-data-${id}`;
      const fingerprint = `legacy:${id}`;
      const data = (await browser.storage.local.get(key))[key];
      if (!done.has(fingerprint) && typeof data === 'string') {
        if ((attempts[id] ?? 0) >= MAX_ATTEMPTS) {
          remaining.push(id);
          continue;
        }
        try {
          const blob = await (await fetch(data)).blob();
          await addToLibrary(await process(blob, { maxWidth: display.width, maxHeight: display.height }), { fingerprint });
        } catch (error) {
          console.error(`[migrate] Wallpaper ${id} could not be converted; keeping it to retry:`, error);
          attempts[id] = (attempts[id] ?? 0) + 1;
          remaining.push(id);
          continue;
        }
      }
      await browser.storage.local.remove(key);
    }

    if (remaining.length) await browser.storage.local.set({ backgrounds: remaining, [ATTEMPTS_KEY]: attempts });
    else await browser.storage.local.remove([...LEGACY_KEYS, ATTEMPTS_KEY]);
  });
