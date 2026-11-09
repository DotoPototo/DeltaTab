import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { ACCENT_VERSION } from '@/libs/accent';
import { MINUTE, isSameDay } from '@/libs/time';
import { idbDelete, idbGet, idbKeys, idbPut } from '@/libs/wallpaper/idb';
import type { ProcessedImage } from '@/libs/wallpaper/image';

export type DailySource = 'bing' | 'wikimedia';
export type WallpaperSource = 'library' | DailySource;

export interface Wallpaper {
  id: string;
  origin: 'upload' | DailySource;
  width: number;
  height: number;
  bytes: number;
  accent: string;
  average: string;
  addedAt: number;
  title?: string;
  credit?: string;
  link?: string;
  day?: string;
  accentVersion?: number;
  accentPicked?: boolean;
  // Name, size and mtime of the uploaded file, to skip re-adding the same image.
  fingerprint?: string;
}

export const isAccentStale = (wallpaper: Wallpaper) => !wallpaper.accentPicked && (wallpaper.accentVersion ?? 0) < ACCENT_VERSION;

export const REFRESH_ACCENTS_MESSAGE = 'refresh-accents';
// New tabs never analyse images themselves; the background worker serialises refreshes.
export const requestAccentRefresh = (first: string) =>
  browser.runtime.sendMessage({ type: REFRESH_ACCENTS_MESSAGE, first }).catch((error) => console.warn('[accent] Refresh request failed:', error));

export const findRecord = (id: string, library: Wallpaper[], daily: Partial<Record<DailySource, Wallpaper>>) =>
  library.find((w) => w.id === id) ?? Object.values(daily).find((w) => w?.id === id);

// Library copies of a daily image get a random id, so they aren't daily.
export const isDaily = (wallpaper: Wallpaper) => wallpaper.id.startsWith('daily-');

export const libraryItem = storage.defineItem<Wallpaper[]>('local:wallpapers', { fallback: [] });
export const dailyItem = storage.defineItem<Partial<Record<DailySource, Wallpaper>>>('local:wallpapers-daily', { fallback: {} });
export const displayItem = storage.defineItem<{ width: number; height: number }>('local:display', { fallback: { width: 2560, height: 1440 } });
const queueItem = storage.defineItem<string[]>('local:wallpaper-queue', { fallback: [] });
export const shownItem = storage.defineItem<{ id: string; at: number } | null>('local:wallpaper-shown', { fallback: null });
// Removal times, so the sweep leaves those blobs for Undo.
const removedItem = storage.defineItem<Record<string, number>>('local:wallpapers-removed', { fallback: {} });

export const UNDO_WINDOW = 15_000;
// Far beyond the toast, so a toast held open by hovering can't outlive the data it would restore.
export const REMOVED_RETENTION = 5 * MINUTE;

export const isStillCurrent = (rotate: 'tab' | 'hour' | 'day', at: number, now = Date.now()) => {
  if (rotate === 'tab') return false;
  const shown = new Date(at);
  const current = new Date(now);
  const sameDay = isSameDay(shown, current);
  return rotate === 'day' ? sameDay : sameDay && shown.getHours() === current.getHours();
};

const locked = <T>(name: string, fn: () => Promise<T>) => navigator.locks.request(name, fn) as Promise<T>;

// Blob-then-record writes and the orphan sweep share this, so a sweep never sees blobs whose records are on their way.
const LIBRARY_LOCK = 'wallpaper-library';

export const toWallpaper = (id: string, processed: ProcessedImage, origin: Wallpaper['origin'], extra: Partial<Wallpaper> = {}): Wallpaper => ({
  id,
  origin,
  width: processed.width,
  height: processed.height,
  bytes: processed.image.size + processed.thumb.size,
  accent: processed.accent,
  average: processed.average,
  addedAt: Date.now(),
  accentVersion: ACCENT_VERSION,
  ...extra,
});

const storeImage = (id: string, { image, thumb }: Pick<ProcessedImage, 'image' | 'thumb'>) =>
  idbPut([
    { store: 'images', key: id, value: image },
    { store: 'thumbs', key: id, value: thumb },
  ]);

export const getImage = (id: string) => idbGet<Blob>('images', id);
export const getThumb = (id: string) => idbGet<Blob>('thumbs', id);

export interface NewWallpaper {
  processed: ProcessedImage;
  extra?: Partial<Wallpaper>;
}

// One metadata write for the batch: otherwise every open tab is notified once per image.
export const addManyToLibrary = async (entries: NewWallpaper[]): Promise<Wallpaper[]> => {
  if (!entries.length) return [];
  const all = entries.map(({ processed, extra }) => toWallpaper(crypto.randomUUID(), processed, 'upload', extra));
  let wallpapers: Wallpaper[] = [];
  await locked(LIBRARY_LOCK, async () => {
    // Rechecked under the lock: another tab may have added the same file meanwhile.
    const library = await libraryItem.getValue();
    const known = new Set(library.map((w) => w.fingerprint).filter(Boolean));
    wallpapers = all.filter((w) => !w.fingerprint || (!known.has(w.fingerprint) && known.add(w.fingerprint)));
    const kept = new Set(wallpapers);
    await idbPut(
      entries.flatMap(({ processed }, i) =>
        kept.has(all[i]!)
          ? [
              { store: 'images' as const, key: all[i]!.id, value: processed.image },
              { store: 'thumbs' as const, key: all[i]!.id, value: processed.thumb },
            ]
          : []
      )
    );
    await libraryItem.setValue([...library, ...wallpapers]);
  });
  return wallpapers;
};

export const addToLibrary = async (processed: ProcessedImage, extra: Partial<Wallpaper> = {}): Promise<Wallpaper> =>
  (await addManyToLibrary([{ processed, extra }]))[0]!;

// Blobs stay until the orphan sweep so `restoreToLibrary` can undo this.
export const removeFromLibrary = (ids: string[]) =>
  locked(LIBRARY_LOCK, async () => {
    const remove = new Set(ids);
    const now = Date.now();
    await removedItem.setValue({ ...(await removedItem.getValue()), ...Object.fromEntries(ids.map((id) => [id, now])) });
    await libraryItem.setValue((await libraryItem.getValue()).filter((w) => !remove.has(w.id)));
  });

// Under the sweep's lock, so an image is either restored or reported freed: never a record without its image.
export const restoreToLibrary = (wallpapers: Wallpaper[]) =>
  locked(LIBRARY_LOCK, async () => {
    const current = await libraryItem.getValue();
    const known = new Set(current.map((w) => w.id));
    const wanted = wallpapers.filter((w) => !known.has(w.id));
    const present = await Promise.all(wanted.map(async (w) => !!(await getImage(w.id))));
    const restorable = wanted.filter((_, i) => present[i]);
    await libraryItem.setValue([...current, ...restorable].sort((a, b) => a.addedAt - b.addedAt));
    const lost = wanted.length - restorable.length;
    if (lost) throw new Error(lost === wanted.length ? 'Too late to undo: the image data has been freed.' : `${lost} of them could no longer be restored.`);
  });

export const saveToLibrary = async (wallpaper: Wallpaper): Promise<Wallpaper> => {
  const [image, thumb] = await Promise.all([getImage(wallpaper.id), getThumb(wallpaper.id)]);
  if (!image || !thumb) throw new Error('Wallpaper data is missing');
  const copy: Wallpaper = { ...wallpaper, id: crypto.randomUUID(), addedAt: Date.now() };
  await locked(LIBRARY_LOCK, async () => {
    await storeImage(copy.id, { image, thumb });
    await libraryItem.setValue([...(await libraryItem.getValue()), copy]);
  });
  return copy;
};

export const setDaily = (source: DailySource, wallpaper: Wallpaper, processed: Pick<ProcessedImage, 'image' | 'thumb'>) =>
  locked(LIBRARY_LOCK, async () => {
    await storeImage(wallpaper.id, processed);
    await dailyItem.setValue({ ...(await dailyItem.getValue()), [source]: wallpaper });
  });

// Pre-release builds stored a placeholder image on every record, and every new tab parses the whole list.
export const stripPlaceholders = () =>
  locked(LIBRARY_LOCK, async () => {
    const strip = <W extends object>(w: W) => {
      const { placeholder: _, ...rest } = w as W & { placeholder?: string };
      return rest as W;
    };
    const [library, daily] = await Promise.all([libraryItem.getValue(), dailyItem.getValue()]);
    const has = (w: object | undefined) => !!w && 'placeholder' in w;
    if (library.some(has)) await libraryItem.setValue(library.map(strip));
    if (Object.values(daily).some(has)) await dailyItem.setValue(Object.fromEntries(Object.entries(daily).map(([k, w]) => [k, w && strip(w)])));
  });

// `picked` undefined is a recompute, which never overwrites an accent the user chose.
export const updateAccents = (accents: Map<string, string>, picked?: boolean) =>
  locked(LIBRARY_LOCK, async () => {
    const update = <W extends Wallpaper | undefined>(w: W): W => {
      if (!w || !accents.has(w.id) || (picked === undefined && w.accentPicked)) return w;
      const { accentPicked: _, ...rest } = w;
      return { ...rest, accent: accents.get(w.id)!, accentVersion: ACCENT_VERSION, ...(picked ? { accentPicked: true } : {}) } as W;
    };
    const [library, daily] = await Promise.all([libraryItem.getValue(), dailyItem.getValue()]);
    if (library.some((w) => accents.has(w.id))) await libraryItem.setValue(library.map(update));
    if (Object.values(daily).some((w) => w && accents.has(w.id)))
      await dailyItem.setValue(Object.fromEntries(Object.entries(daily).map(([k, w]) => [k, update(w)])));
  });

export const liveWallpaperIds = async () => {
  const [library, daily] = await Promise.all([libraryItem.getValue(), dailyItem.getValue()]);
  return new Set([...library.map((w) => w.id), ...Object.values(daily).map((w) => w!.id)]);
};

export const sweepOrphans = () =>
  locked(LIBRARY_LOCK, async () => {
    const [live, removed, keys] = await Promise.all([liveWallpaperIds(), removedItem.getValue(), idbKeys('images')]);
    const cutoff = Date.now() - REMOVED_RETENTION;
    const recent = Object.fromEntries(Object.entries(removed).filter(([, at]) => at > cutoff));
    await idbDelete(keys.filter((key) => !live.has(key) && !(key in recent)));
    await removedItem.setValue(recent);
  });

// Never starts with `avoidFirst`, so a bag boundary can't repeat an image.
export const shuffled = (ids: string[], avoidFirst?: string, random = Math.random): string[] => {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  if (result.length > 1 && result[0] === avoidFirst) result.push(result.shift()!);
  return result;
};

// A persisted shuffle bag: every wallpaper shows once before any repeats, across tabs and restarts.
export const takeFromQueue = (ids: string[], previous?: string): Promise<string | undefined> =>
  locked('wallpaper-queue', async () => {
    if (!ids.length) return undefined;
    const valid = new Set(ids);
    let queue = (await queueItem.getValue()).filter((id) => valid.has(id));
    if (!queue.length) queue = shuffled(ids, previous);
    const [next, ...rest] = queue;
    await queueItem.setValue(rest);
    return next;
  });
