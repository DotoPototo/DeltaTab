import { describe, test, expect } from 'bun:test';
import { DARK_TEXT, LIGHT_TEXT, contrast, parseRgb, textColourOn, toHex } from '@/libs/colour';

describe('parseRgb', () => {
  test('parses 6-char hex', () => {
    expect(parseRgb('#ff0080')).toEqual({ r: 255, g: 0, b: 128 });
  });

  test('parses 3-char hex by doubling each digit', () => {
    expect(parseRgb('#f08')).toEqual({ r: 255, g: 0, b: 136 });
  });

  test('parses rgb() format', () => {
    expect(parseRgb('rgb(120, 200, 30)')).toEqual({ r: 120, g: 200, b: 30 });
  });

  test('parses rgba() format and discards alpha', () => {
    expect(parseRgb('rgba(180, 45, 90, 0.8)')).toEqual({ r: 180, g: 45, b: 90 });
  });

  test('throws on invalid hex length', () => {
    expect(() => parseRgb('#abcd')).toThrow('Invalid hex colour format');
  });

  test('throws on unrecognised format', () => {
    expect(() => parseRgb('hsl(0, 100%, 50%)')).toThrow('Invalid colour format');
  });
});

describe('toHex', () => {
  test('converts rgba to hex, discarding alpha', () => {
    expect(toHex('rgba(255, 0, 128, 1)')).toBe('#ff0080');
  });

  test('round-trips a 6-char hex unchanged', () => {
    expect(toHex('#abcdef')).toBe('#abcdef');
  });

  test('pads single-digit channels with leading zero', () => {
    expect(toHex('rgb(1, 2, 3)')).toBe('#010203');
  });
});

describe('textColourOn', () => {
  test('light text on black, dark text on white', () => {
    expect(textColourOn('#000000')).toBe(LIGHT_TEXT);
    expect(textColourOn('#ffffff')).toBe(DARK_TEXT);
  });

  test('mid-grey gets the dark text, which actually contrasts more', () => {
    expect(textColourOn('#808080')).toBe(DARK_TEXT);
    expect(contrast('#808080', DARK_TEXT)).toBeGreaterThan(contrast('#808080', LIGHT_TEXT));
  });

  test('always picks the higher-contrast option', () => {
    for (const bg of ['#718c4d', '#3b82f6', '#e11d48', '#facc15', '#5b5b5b', 'rgba(20, 30, 40, 1)']) {
      const chosen = textColourOn(bg);
      const other = chosen === DARK_TEXT ? LIGHT_TEXT : DARK_TEXT;
      expect(contrast(bg, chosen)).toBeGreaterThanOrEqual(contrast(bg, other));
    }
  });
});

describe('contrast', () => {
  test('matches WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
