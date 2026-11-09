import { describe, test, expect, beforeEach } from 'bun:test';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ACCENT_VERSION } from '@/libs/accent';
import { refreshStaleAccents } from '@/libs/accent/refresh';
import { libraryItem, type Wallpaper } from '@/libs/wallpaper/library';

const stale = (id: string, extra: Partial<Wallpaper> = {}) => ({ id, accent: '#111111', accentVersion: ACCENT_VERSION - 1, ...extra }) as Wallpaper;
const stored = async () => Object.fromEntries((await libraryItem.getValue()).map((w) => [w.id, w]));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('refreshStaleAccents', () => {
  beforeEach(() => fakeBrowser.reset());

  test('an image that fails to decode is skipped; the others are saved', async () => {
    await libraryItem.setValue([stale('a'), stale('broken'), stale('c')]);
    const accentOf = async (id: string) => {
      if (id === 'broken') throw new Error('decode failed');
      return '#ff0000';
    };
    expect(await refreshStaleAccents(undefined, { accentOf, saveAfterMs: 1000 })).toBe(2);
    const after = await stored();
    expect(after.a).toMatchObject({ accent: '#ff0000', accentVersion: ACCENT_VERSION });
    expect(after.c).toMatchObject({ accent: '#ff0000', accentVersion: ACCENT_VERSION });
    expect(after.broken!.accentVersion).toBe(ACCENT_VERSION - 1);
  });

  test('finished work is saved while a slow decode is still running', async () => {
    await libraryItem.setValue([stale('fast'), stale('slow')]);
    let releaseSlow!: () => void;
    const slowDone = new Promise<void>((resolve) => (releaseSlow = resolve));
    const accentOf = async (id: string) => {
      if (id === 'slow') await slowDone;
      return '#00ff00';
    };
    const run = refreshStaleAccents(undefined, { accentOf, saveAfterMs: 20 });
    await sleep(80);
    // the worker could be stopped here: 'fast' must already be stored
    expect((await stored()).fast!.accentVersion).toBe(ACCENT_VERSION);
    expect((await stored()).slow!.accentVersion).toBe(ACCENT_VERSION - 1);
    releaseSlow();
    expect(await run).toBe(2);
    expect((await stored()).slow!.accentVersion).toBe(ACCENT_VERSION);
  });

  test('does the wallpaper on screen first, and never touches an accent picked by hand', async () => {
    await libraryItem.setValue([stale('a'), stale('picked', { accentPicked: true }), stale('shown')]);
    const order: string[] = [];
    const accentOf = async (id: string) => {
      order.push(id);
      return '#0000ff';
    };
    await refreshStaleAccents('shown', { accentOf, saveAfterMs: 1000 });
    expect(order).toEqual(['shown', 'a']);
    expect((await stored()).picked!.accent).toBe('#111111');
  });
});
