import { describe, test, expect } from 'bun:test';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ACCENT_VERSION } from '@/libs/accent';
import { findRecord, isAccentStale, isStillCurrent, libraryItem, shuffled, updateAccents, type Wallpaper } from '@/libs/wallpaper/library';

describe('shuffled', () => {
  const seq = (values: number[]) => () => values.shift() ?? 0;

  test('is a permutation', () => {
    expect(shuffled(['a', 'b', 'c', 'd']).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  test('avoids repeating the previous image at a bag boundary', () => {
    const result = shuffled(['a', 'b', 'c'], 'c', seq([0.99, 0.99]));
    expect(result[0]).not.toBe('c');
    expect(result.sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('isStillCurrent', () => {
  const at = new Date(2026, 9, 29, 10, 15).getTime();
  test('every tab never keeps the same image', () => {
    expect(isStillCurrent('tab', at, at)).toBe(false);
  });

  test('hourly keeps it within the same clock hour', () => {
    expect(isStillCurrent('hour', at, new Date(2026, 9, 29, 10, 59).getTime())).toBe(true);
    expect(isStillCurrent('hour', at, new Date(2026, 9, 29, 11, 0).getTime())).toBe(false);
  });

  test('daily keeps it until midnight', () => {
    expect(isStillCurrent('day', at, new Date(2026, 9, 29, 23, 59).getTime())).toBe(true);
    expect(isStillCurrent('day', at, new Date(2026, 9, 30, 0, 1).getTime())).toBe(false);
  });
});

describe('updateAccents', () => {
  test('a recompute never replaces a hand-picked accent', async () => {
    fakeBrowser.reset();
    await libraryItem.setValue([{ id: 'a', accent: '#111111' } as Wallpaper, { id: 'b', accent: '#222222' } as Wallpaper]);

    await updateAccents(new Map([['a', '#ff0000']]), true);
    await updateAccents(
      new Map([
        ['a', '#00ff00'],
        ['b', '#0000ff'],
      ])
    );
    const [a, b] = await libraryItem.getValue();
    expect(a).toMatchObject({ accent: '#ff0000', accentPicked: true });
    expect(b!.accent).toBe('#0000ff');

    await updateAccents(new Map([['a', '#00ff00']]), false);
    const [reset] = await libraryItem.getValue();
    expect(reset!.accent).toBe('#00ff00');
    expect(reset!.accentPicked).toBeUndefined();
  });
});

describe('isAccentStale', () => {
  test('an accent from an older picker is due a recompute, unless the user picked it', () => {
    expect(isAccentStale({ id: 'a', accentVersion: ACCENT_VERSION - 1 } as Wallpaper)).toBe(true);
    expect(isAccentStale({ id: 'a' } as Wallpaper)).toBe(true); // made before versioning
    expect(isAccentStale({ id: 'a', accentVersion: ACCENT_VERSION } as Wallpaper)).toBe(false);
    expect(isAccentStale({ id: 'a', accentVersion: 1, accentPicked: true } as Wallpaper)).toBe(false);
  });
});

describe('findRecord', () => {
  test('finds the latest library or daily record, or nothing once deleted', () => {
    const older = { id: 'a', accent: '#111111' } as Wallpaper;
    const latest = { id: 'a', accent: '#ff0000', accentPicked: true } as Wallpaper;
    const daily = { id: 'daily-bing-x', accent: '#00ff00' } as Wallpaper;
    expect(findRecord(older.id, [latest], {})).toBe(latest);
    expect(findRecord(daily.id, [latest], { bing: daily })).toBe(daily);
    expect(findRecord('gone', [latest], { bing: daily })).toBeUndefined();
  });
});
