import { describe, test, expect } from 'bun:test';
import { accentCandidates, displayColour, extractAccent, pickAccent, ACCENT_SAMPLE_SIZE } from '@/libs/accent';
import golden from '../../fixtures/accent-golden.json';
import { synthetic } from '../../fixtures/syntheticWallpapers';

const channels = (rgba: string) => rgba.match(/\d+/g)!.slice(0, 3).map(Number) as [number, number, number];

describe('extractAccent', () => {
  // `bun scripts/update-accent-golden.ts` regenerates the fixture from the current picker.
  test('picks what it picked before (300 synthetic images; regenerate the fixture only for a deliberate picker change)', () => {
    for (let seed = 1; seed <= 300; seed++) expect(`${seed}: ${extractAccent(synthetic(seed))}`).toBe(`${seed}: ${golden[seed - 1]}`);
  });

  test('says which stage decided', () => {
    const grey = synthetic(0);
    for (let i = 0; i < grey.data.length; i += 4) grey.data.set([120, 120, 125, 255], i);
    expect(pickAccent(grey).stage).toBe('average');
    for (let y = 50; y < 90; y++) for (let x = 50; x < 90; x++) grey.data.set([220, 20, 30, 255], (y * ACCENT_SAMPLE_SIZE + x) * 4);
    expect(pickAccent(grey)).toMatchObject({ stage: 'centre ladder', detail: expect.stringContaining('red') });
  });

  test('a vivid red object on grey wins; a plain grey image averages to grey', () => {
    const grey = synthetic(0);
    for (let i = 0; i < grey.data.length; i += 4) grey.data.set([120, 120, 125, 255], i);
    expect(extractAccent(grey)).toMatch(/^rgba\(1[0-9]{2},1[0-9]{2},1[0-9]{2},1\)$/);
    const red = { ...grey, data: grey.data.slice() };
    for (let y = 50; y < 90; y++) for (let x = 50; x < 90; x++) red.data.set([220, 20, 30, 255], (y * ACCENT_SAMPLE_SIZE + x) * 4);
    const [r, g, b] = extractAccent(red).match(/\d+/g)!.map(Number) as [number, number, number];
    expect(r).toBeGreaterThan(150);
    expect(g + b).toBeLessThan(120);
  });
});

describe('accentCandidates', () => {
  test('offers each visible colour, most eye-catching first, then the average', () => {
    const size = ACCENT_SAMPLE_SIZE;
    const data = new Uint8ClampedArray(size * size * 4);
    const colourAt = (i: number) => {
      if (i < 600) return [230, 30, 30];
      if (i < 3000) return [70, 120, 70];
      return [110, 120, 135];
    };
    for (let i = 0; i < size * size; i++) data.set([...colourAt(i), 255], i * 4);
    const list = accentCandidates({ data, width: size, height: size });
    expect(list.length).toBeGreaterThanOrEqual(3);
    const [r, g] = channels(list[0]!);
    expect(r > 2 * g).toBe(true);
  });
});

describe('displayColour', () => {
  const brightness = ([r, g, b]: [number, number, number]) => (r * 299 + g * 587 + b * 114) / 1000;

  test('leaves a colour in the sweet spot (mid brightness, modest saturation) alone', () => {
    expect(displayColour('rgb(140, 130, 120)')).toBe('rgb(140, 130, 120)');
  });

  test('lightens very dark colours and tones down glaring ones', () => {
    expect(brightness(channels(displayColour('rgb(20, 20, 30)')))).toBeGreaterThan(60);
    expect(brightness(channels(displayColour('rgba(230, 220, 215, 1)')))).toBeLessThan(220);
  });

  test('gives flat grey a faint cool tint', () => {
    const [r, g, b] = channels(displayColour('rgb(80, 80, 80)'));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  test('always returns valid channels', () => {
    for (const input of ['rgba(30, 200, 50, 1)', '#000000', '#ffffff', '#ff00ff'])
      for (const c of channels(displayColour(input))) expect(c >= 0 && c <= 255).toBe(true);
  });
});
