import { describe, test, expect, beforeEach } from 'bun:test';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { migrateLegacyWallpapers } from '@/libs/migrations/wallpapers';
import { libraryItem, type Wallpaper } from '@/libs/wallpaper/library';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const failing = () => Promise.reject(new Error('out of memory'));
const local = () => fakeBrowser.storage.local.get(null) as Promise<Record<string, unknown>>;

beforeEach(() => fakeBrowser.reset());

describe('migrateLegacyWallpapers', () => {
  test('a failed conversion keeps the original to retry', async () => {
    await fakeBrowser.storage.local.set({ backgrounds: ['a'], 'bg-data-a': PIXEL, bingImage: 'x' });
    await migrateLegacyWallpapers(failing);
    const stored = await local();
    expect(stored['bg-data-a']).toBe(PIXEL);
    expect(stored.backgrounds).toEqual(['a']);
    expect(stored['legacy-wallpaper-attempts']).toEqual({ a: 1 });
  });

  test('after repeated failures the image is left alone, never deleted', async () => {
    await fakeBrowser.storage.local.set({ backgrounds: ['a'], 'bg-data-a': PIXEL });
    for (let i = 0; i < 5; i++) await migrateLegacyWallpapers(failing);
    const stored = await local();
    expect(stored['bg-data-a']).toBe(PIXEL);
    expect(stored['legacy-wallpaper-attempts']).toEqual({ a: 3 });
  });

  test('an image converted before an interruption is not imported again', async () => {
    await libraryItem.setValue([{ id: 'x', fingerprint: 'legacy:a' } as Wallpaper]);
    await fakeBrowser.storage.local.set({ backgrounds: ['a'], 'bg-data-a': PIXEL, bingImage: 'x' });
    await migrateLegacyWallpapers(failing); // would fail if it tried
    const stored = await local();
    expect(stored['bg-data-a']).toBeUndefined();
    expect(stored.backgrounds).toBeUndefined();
    expect(stored.bingImage).toBeUndefined();
  });
});
