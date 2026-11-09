import { blend } from '../blend';
import { hueFamily, WARM_FAMILIES } from '../colour';
import { FALLBACK_COLOUR, type AccentConfig } from '../config';
import type { Bucket } from '../measure';
import type { Stage } from './types';

// Averaged within one hue family so it's never a muddy cross-family mix.
export const smartAverage = (buckets: Bucket[], config: AccentConfig): { colour: string; family: string } => {
  const groups = new Map<string, { w: number; buckets: Bucket[] }>();
  for (const bk of buckets) {
    if (bk.vmax < config.avgVmaxMin || bk.vmax > config.avgVmaxMax) continue;
    const fam = hueFamily(bk);
    let group = groups.get(fam);
    if (!group) groups.set(fam, (group = { w: 0, buckets: [] }));
    group.w += bk.freq * (config.satBias + bk.sat) * (WARM_FAMILIES.has(fam) ? config.warmAvgBias : 1);
    group.buckets.push(bk);
  }
  const [best] = [...groups.entries()].sort((a, b) => b[1].w - a[1].w);
  return best ? { colour: blend(best[1].buckets, config), family: best[0] } : { colour: FALLBACK_COLOUR, family: 'none' };
};

export const average: Stage = {
  name: 'average',
  run: ({ region, config }) => {
    const { colour, family } = smartAverage(region('full').buckets, config);
    return { colour, detail: family };
  },
};
