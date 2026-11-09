// A class fires when it covers its floor share; the highest firing rung wins unless a lower rung dwarfs it.
import { blend } from '../blend';
import { baseOf, type ClassStats } from '../classify';
import { hueFamily } from '../colour';
import type { AccentConfig } from '../config';
import type { Stage, StagePick } from './types';

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

const isStrong = (cls: string) => cls.startsWith('strong-');

const floorFor = (cls: string, config: AccentConfig, fullFrame: boolean) => {
  if (cls === 'green') return config.greenShare;
  if (cls === 'strong-blue' || cls === 'strong-cyan') return config.strongBlueShare;
  if (isStrong(cls)) return fullFrame ? config.strongShareFull : config.strongShare;
  return config.colourShare;
};

const pickOf = (stats: ClassStats, cls: string, config: AccentConfig): StagePick => {
  const sibling = isStrong(cls) ? stats.get(baseOf(cls)) : undefined;
  const winner = stats.get(cls)!;
  return {
    colour: blend(winner.buckets, config, sibling ? { buckets: sibling.buckets, weight: config.mergeSameBase } : undefined),
    detail: `${cls} (${percent(winner.share)})`,
  };
};

const runLadder = (stats: ClassStats, ladder: readonly string[], config: AccentConfig, fullFrame: boolean): StagePick | null => {
  const firing = ladder.filter((cls) => (stats.get(cls)?.share ?? 0) >= floorFor(cls, config, fullFrame));
  if (!firing.length) return null;
  let winner = firing[0]!;
  for (const cls of firing.slice(1)) {
    const { share } = stats.get(cls)!;
    if (firing.slice(0, firing.indexOf(cls)).every((h) => share >= config.boostRatio * stats.get(h)!.share)) winner = cls;
  }
  return pickOf(stats, winner, config);
};

export const centreLadder: Stage = {
  name: 'centre ladder',
  run: ({ classes, config }) => runLadder(classes('centre'), config.centreLadder, config, false),
};

export const fullStrong: Stage = {
  name: 'full frame strong',
  run: ({ classes, config }) => runLadder(classes('full'), config.strongLadder, config, true),
};

export const guarded: Stage = {
  name: 'full frame guarded',
  run: ({ classes, region, config }) => {
    const stats = classes('full');
    const total = region('full').totalPixels;
    const ladderClasses = new Set([...config.strongLadder, ...config.guardedLadder]);
    const outside = new Map<string, number>();
    for (const [cls, st] of stats) {
      if (ladderClasses.has(cls)) continue;
      for (const bk of st.buckets) {
        const fam = hueFamily(bk);
        if (fam !== 'grey') outside.set(fam, (outside.get(fam) ?? 0) + bk.freq / total);
      }
    }
    const maxOutside = Math.max(0, ...outside.values());
    const ladder = config.guardedLadder;
    const firing = ladder.filter((cls) => (stats.get(cls)?.share ?? 0) >= floorFor(cls, config, false));
    for (const cls of firing) {
      const { share } = stats.get(cls)!;
      const lowerRungMax = Math.max(0, ...ladder.slice(ladder.indexOf(cls) + 1).map((c) => stats.get(c)?.share ?? 0));
      // No leapfrog here: a lower rung big enough to leapfrog has already outweighed this one.
      if (lowerRungMax > share * config.outweighRatio || maxOutside > share * config.neutralOutweighRatio) continue;
      return pickOf(stats, cls, config);
    }
    return null;
  },
};

const satQuantile = (buckets: { sat: number; freq: number }[], q: number) => {
  const sorted = [...buckets].sort((a, b) => a.sat - b.sat);
  const total = sorted.reduce((sum, b) => sum + b.freq, 0);
  let seen = 0;
  for (const b of sorted) if ((seen += b.freq) >= q * total) return b.sat;
  return sorted.at(-1)?.sat ?? 0;
};

export const onlyColour: Stage = {
  name: 'only colour',
  run: ({ classes, config }) => {
    const stats = classes('full');
    const coloured = [...stats.values()].filter((st) => st.cls !== 'neutral').sort((a, b) => b.share - a.share);
    const [top] = coloured;
    if (!top || !config.loneEligible.includes(top.cls)) return null;
    const visible = top.buckets.filter((b) => b.vmax >= config.loneVmax * 255);
    if (!visible.length || satQuantile(visible, 0.9) < config.loneSat) return null;
    const colourTotal = coloured.reduce((sum, st) => sum + st.share, 0);
    if (top.share < config.loneMinShare || top.share < config.loneDominance * colourTotal) return null;
    return pickOf(stats, top.cls, config);
  },
};
