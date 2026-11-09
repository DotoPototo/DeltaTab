import { blend } from './blend';
import { hueFamily } from './colour';
import { ACCENT_CONFIG } from './config';
import { measure, type AccentPixels, type Bucket } from './measure';
import { smartAverage } from './stages/average';

const MIN_SAT = 0.25;
const MIN_SHARE = 0.002;

// Ranked by saturation and brightness, not area: vivid, bright colour catches the eye at a fraction of the area.
export const accentCandidates = (pixels: AccentPixels, max = 6): string[] => {
  const config = ACCENT_CONFIG;
  const { buckets, totalPixels } = measure(pixels);
  const families = new Map<string, { score: number; pixels: number; buckets: Bucket[] }>();
  for (const bk of buckets) {
    const fam = hueFamily(bk);
    if (fam === 'grey' || bk.sat < MIN_SAT || bk.vmax < config.darkWarmVmax) continue;
    let f = families.get(fam);
    if (!f) families.set(fam, (f = { score: 0, pixels: 0, buckets: [] }));
    f.score += bk.freq * Math.pow(bk.sat, 2) * Math.pow(bk.vmax / 255, 2);
    f.pixels += bk.freq;
    f.buckets.push(bk);
  }
  const vivid = [...families.values()]
    .filter((f) => f.pixels / totalPixels >= MIN_SHARE)
    .sort((a, b) => b.score - a.score)
    .map((f) => blend(f.buckets, config));
  return [...vivid.slice(0, max - 1), smartAverage(buckets, config).colour];
};
