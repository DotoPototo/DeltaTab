import { describe, test, expect } from 'bun:test';
import { coverScale, fitWithin, storageOptions } from '@/libs/wallpaper/image';

describe('coverScale', () => {
  test('scales down to cover the target box', () => {
    expect(coverScale(6000, 4000, 3000, 1000)).toBe(0.5);
  });

  test('never upscales', () => {
    expect(coverScale(800, 600, 2560, 1440)).toBe(1);
  });
});

describe('fitWithin', () => {
  test('fits the long edge and keeps aspect', () => {
    expect(fitWithin(4000, 2000, 360)).toEqual([360, 180]);
    expect(fitWithin(1000, 3000, 24)).toEqual([8, 24]);
  });

  test('never returns zero', () => {
    expect(fitWithin(10000, 10, 24)).toEqual([24, 1]);
  });
});

describe('storageOptions', () => {
  const display = { width: 2880, height: 1800 };

  test('auto sizes to the screen, a preset to its resolution', () => {
    expect(storageOptions('auto', 0.9, display)).toEqual({ maxWidth: 2880, maxHeight: 1800, quality: 0.9 });
    expect(storageOptions('720p', 0.6, display)).toEqual({ maxWidth: 1280, maxHeight: 720, quality: 0.6 });
  });

  test('original never resizes and keeps the file', () => {
    expect(storageOptions('original', 1, display)).toEqual({ maxWidth: Infinity, maxHeight: Infinity, quality: 1, keepOriginal: true });
    expect(coverScale(6000, 4000, Infinity, Infinity)).toBe(1);
  });
});
