// Pixels are bucketed per region (full, centre, tighter centre), each bucket named from swatches.json,
// then the stages run in order and the first answer wins:
//   1. centre ladder       strong colours, then regular warm ones
//   2. full frame strong   a vivid colour outside the centre
//   3. full frame guarded  regular colours not outweighed by others
//   4. only colour         one saturated colour owns the image
//   5. family              a compact eye-catching hue family (small subjects)
//   6. average             the dominant tone, within one hue family
// Regions are measured on first use, so an image the first stage settles never pays for the rest.
import { classify, type ClassStats } from './classify';
import { ACCENT_CONFIG, type AccentConfig } from './config';
import { cropPixels, measure, type AccentPixels, type Region } from './measure';
import { average } from './stages/average';
import { familyStage } from './stages/family';
import { centreLadder, fullStrong, guarded, onlyColour } from './stages/ladder';
import type { RegionName, Stage, StageContext } from './stages/types';

const STAGES: Stage[] = [centreLadder, fullStrong, guarded, onlyColour, familyStage, average];

export interface AccentPick {
  // Raw pick: pass it through displayColour for the UI.
  colour: string;
  stage: string;
  detail: string;
}

const createContext = (pixels: AccentPixels, config: AccentConfig): StageContext => {
  const regions = new Map<RegionName, Region>();
  const classes = new Map<RegionName, ClassStats>();
  const crops: Record<RegionName, number> = { full: 0, centre: config.centreCrop, familyCentre: config.familyCrop };
  const region = (name: RegionName) => {
    let r = regions.get(name);
    if (!r) regions.set(name, (r = measure(crops[name] ? cropPixels(pixels, crops[name]) : pixels)));
    return r;
  };
  return {
    pixels,
    config,
    region,
    classes: (name) => {
      let c = classes.get(name);
      if (!c) classes.set(name, (c = classify(region(name), config)));
      return c;
    },
  };
};

export const pickAccent = (pixels: AccentPixels): AccentPick => {
  const ctx = createContext(pixels, ACCENT_CONFIG);
  for (const stage of STAGES) {
    const pick = stage.run(ctx);
    if (pick) return { ...pick, stage: stage.name };
  }
  throw new Error('The average stage always answers');
};
