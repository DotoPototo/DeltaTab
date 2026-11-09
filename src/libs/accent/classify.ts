import { hsv, hueDiff, hueFamily, WARM_FAMILIES } from './colour';
import type { AccentConfig } from './config';
import type { Bucket, Region } from './measure';
import swatches from './swatches.json';

export interface ClassStat {
  cls: string;
  pixels: number;
  share: number;
  buckets: Bucket[];
}

export type ClassStats = Map<string, ClassStat>;

export const baseOf = (cls: string) => cls.replace(/^strong-/, '');

const SAMPLES = Object.entries(swatches as Record<string, string>).map(([hex, name]) => {
  const n = parseInt(hex.slice(1), 16);
  return { ...hsv((n >> 16) & 255, (n >> 8) & 255, n & 255), name };
});

// One distance unit is about 24° hue, 0.2 saturation or 0.3 value.
const knn = (r: number, g: number, b: number): string | null => {
  const q = hsv(r, g, b);
  const nearest = SAMPLES.map((s) => ({ name: s.name, d: (hueDiff(q.hue, s.hue) / 24) ** 2 + ((q.sat - s.sat) / 0.2) ** 2 + ((q.v - s.v) / 0.3) ** 2 }))
    .sort((x, y) => x.d - y.d)
    .slice(0, 3);
  if (!nearest.length || nearest[0]!.d > 3) return null;
  // Distance-weighted votes: strong-red and red splitting a region must not lose to one skin sample.
  const votes: Record<string, number> = {};
  for (const s of nearest) votes[s.name] = (votes[s.name] ?? 0) + 1 / (s.d + 0.05);
  return Object.entries(votes).sort((x, y) => y[1] - x[1])[0]![0];
};

// Colours far from every swatch: grey is neutral, muddy warm is skin.
const byRule = (r: number, g: number, b: number) => {
  const { hue, sat } = hsv(r, g, b);
  if (sat < 0.2) return 'neutral';
  const warmish = hue >= 320 || hue < 50;
  if (warmish && sat < (hue >= 5 && hue < 50 ? 0.6 : 0.45)) return 'skin';
  return hueFamily({ hue, sat });
};

const nameCache = new Map<number, string>();
const nameOf = (bk: Pick<Bucket, 'r' | 'g' | 'b'>) => {
  // Quantising rounds 255 up to 256; name the colour as it displays.
  const [r, g, b] = [bk.r, bk.g, bk.b].map((c) => Math.min(255, c)) as [number, number, number];
  const key = (r << 16) | (g << 8) | b;
  let name = nameCache.get(key);
  if (name === undefined) nameCache.set(key, (name = knn(r, g, b) ?? byRule(r, g, b)));
  return name;
};

export const classify = (region: Region, config: AccentConfig): ClassStats => {
  const stats: ClassStats = new Map();
  const add = (cls: string, buckets: Bucket[], pixels: number) => {
    let st = stats.get(cls);
    if (!st) stats.set(cls, (st = { cls, pixels: 0, share: 0, buckets: [] }));
    st.pixels += pixels;
    st.buckets.push(...buckets);
  };
  for (const bk of region.buckets) {
    const name = nameOf(bk);
    add(WARM_FAMILIES.has(baseOf(name)) && bk.vmax < config.darkWarmVmax ? 'neutral' : name, [bk], bk.freq);
  }
  // A class dark everywhere is shadow too: near-black foliage isn't green.
  for (const st of stats.values()) {
    if (st.cls === 'neutral' || Math.max(...st.buckets.map((bk) => bk.vmax)) >= config.darkClassVmax) continue;
    stats.delete(st.cls);
    add('neutral', st.buckets, st.pixels);
  }
  for (const st of stats.values()) st.share = st.pixels / region.totalPixels;
  return stats;
};
