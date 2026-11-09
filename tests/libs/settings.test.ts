import { beforeEach, describe, expect, test } from 'bun:test';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { defaultSettings, readSettings, sanitiseSettings, settingsFrom } from '@/libs/settings';

describe('sanitiseSettings', () => {
  test('valid settings pass through unchanged', () => {
    const settings = defaultSettings();
    settings.theme = 'retro';
    settings.wallpaper.dim = 0.4;
    expect(sanitiseSettings(settings)).toEqual(settings);
  });

  test('unknown choices fall back to the defaults', () => {
    const damaged = {
      theme: 'oled',
      accent: { source: 'rainbow' },
      wallpaper: { source: 'unsplash', rotate: 'week', resolution: '16k' },
      clock: { format: '36' },
      start: { clockSize: 'xl' },
      units: 'furlongs',
    };
    expect(settingsFrom(damaged)).toEqual(defaultSettings());
  });

  test('numbers are clamped to the range the UI offers', () => {
    const { wallpaper } = settingsFrom({ wallpaper: { dim: 5, blur: -3, quality: Number.NaN } });
    expect(wallpaper).toMatchObject({ dim: 0.7, blur: 0, quality: defaultSettings().wallpaper.quality });
  });

  test('an accent that is not a hex colour is replaced', () => {
    expect(settingsFrom({ accent: { custom: 'red' } }).accent.custom).toBe(defaultSettings().accent.custom);
  });

  test('a partial backup keeps its values and gains the rest from the defaults', () => {
    const defaults = defaultSettings();
    expect(settingsFrom({ theme: 'dark', wallpaper: { blur: 12 } })).toEqual({ ...defaults, theme: 'dark', wallpaper: { ...defaults.wallpaper, blur: 12 } });
  });

  test('values of the wrong type are replaced by the defaults', () => {
    expect(settingsFrom({ theme: 7, wallpaper: 'bing', clock: null, start: [] })).toEqual(defaultSettings());
  });

  test('nothing stored gives the defaults', () => {
    expect(settingsFrom(null)).toEqual(defaultSettings());
  });
});

describe('readSettings', () => {
  beforeEach(() => fakeBrowser.reset());

  test('reads and repairs what storage holds', async () => {
    await fakeBrowser.storage.local.set({ settings: { wallpaper: { source: 'library', dim: 2 } } });
    expect((await readSettings()).wallpaper).toMatchObject({ source: 'library', dim: 0.7 });
  });
});
