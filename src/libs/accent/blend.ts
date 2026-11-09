import { FALLBACK_COLOUR, type AccentConfig } from './config';
import type { Bucket } from './measure';

// Bright, saturated buckets dominate because the accent is used as text; too dark to read is lifted.
export const blend = (buckets: Bucket[], config: AccentConfig, extra?: { buckets: Bucket[]; weight: number }) => {
  let [r, g, b, w] = [0, 0, 0, 0];
  const add = (list: Bucket[], scale: number) => {
    for (const bk of list) {
      // Math.pow, not **: JavaScriptCore rounds them differently in the last bit, which can flip a channel by one.
      const wt = scale * bk.freq * Math.pow(config.satBias + bk.sat, config.satProm) * Math.pow(Math.max(bk.vmax, 1) / 255, config.valProm);
      r += bk.r * wt;
      g += bk.g * wt;
      b += bk.b * wt;
      w += wt;
    }
  };
  add(buckets, 1);
  if (extra) add(extra.buckets, extra.weight);
  if (w <= 0) return FALLBACK_COLOUR;
  [r, g, b] = [r / w, g / w, b / w];
  const mx = Math.max(r, g, b, 1);
  if (mx < config.minOutVmax) {
    const k = Math.min(config.minOutVmax / mx, config.maxLift);
    [r, g, b] = [r * k, g * k, b * k];
  }
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},1)`;
};
