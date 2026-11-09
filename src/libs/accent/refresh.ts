import { ACCENT_VERSION } from '@/libs/accent';
import { accentOfBitmap } from '@/libs/wallpaper/image';
import { dailyItem, getImage, isAccentStale, libraryItem, updateAccents, type Wallpaper } from '@/libs/wallpaper/library';

const SAVE_EVERY = 8;
const SAVE_AFTER_MS = 3000;

export interface RefreshDeps {
  accentOf: (id: string) => Promise<string | undefined>;
  saveAfterMs: number;
}

const accentOfStored = async (id: string) => {
  const image = await getImage(id);
  if (!image) return undefined;
  const bitmap = await createImageBitmap(image);
  try {
    return accentOfBitmap(bitmap);
  } finally {
    bitmap.close();
  }
};

// Uses the full stored image, never the 360px thumbnail, where small vivid subjects smudge and the pick flips.
// Saves as it goes: the browser may stop the worker mid-library, and the next run resumes.
export const refreshStaleAccents = async (
  first?: string,
  { accentOf, saveAfterMs }: RefreshDeps = { accentOf: accentOfStored, saveAfterMs: SAVE_AFTER_MS }
): Promise<number> => {
  const [library, daily] = await Promise.all([libraryItem.getValue(), dailyItem.getValue()]);
  const stale = [...library, ...Object.values(daily)].filter((w): w is Wallpaper => !!w && isAccentStale(w));
  stale.sort((a, b) => Number(b.id === first) - Number(a.id === first));
  const accents = new Map<string, string>();
  let updated = 0;
  // Saves are chained; the timer also saves during a slow decode in case the worker is stopped mid-decode.
  let saving = Promise.resolve();
  const flush = () =>
    (saving = saving.then(async () => {
      if (!accents.size) return;
      const batch = new Map(accents);
      accents.clear();
      try {
        // updateAccents re-reads storage and never overwrites an accent picked by hand meanwhile.
        await updateAccents(batch);
        updated += batch.size;
      } catch (error) {
        console.warn('[accent] Saving recomputed accents failed:', error);
        for (const [id, accent] of batch) if (!accents.has(id)) accents.set(id, accent);
      }
    }));
  const timer = setInterval(flush, saveAfterMs);
  try {
    for (const w of stale) {
      // A broken image mustn't stop the rest; it's retried next run.
      try {
        const accent = await accentOf(w.id);
        if (accent) accents.set(w.id, accent);
      } catch (error) {
        console.warn(`[accent] Couldn't recompute ${w.id}:`, error);
      }
      if (accents.size >= SAVE_EVERY || w.id === first) await flush();
    }
  } finally {
    clearInterval(timer);
    await flush();
  }
  if (updated) console.info(`[accent] Recomputed ${updated} of ${stale.length} stale accents with picker v${ACCENT_VERSION}`);
  return updated;
};

// Skipped if a refresh is running in any context: that run covers everything stale.
export const refreshStaleAccentsOnce = (first?: string) =>
  navigator.locks.request('accent-refresh', { ifAvailable: true }, (lock) => (lock ? refreshStaleAccents(first) : 0)) as Promise<number>;
