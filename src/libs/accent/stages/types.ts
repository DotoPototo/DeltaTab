import type { ClassStats } from '../classify';
import type { AccentConfig } from '../config';
import type { AccentPixels, Region } from '../measure';

export interface StagePick {
  colour: string;
  detail: string;
}

export interface StageContext {
  pixels: AccentPixels;
  config: AccentConfig;
  region: (name: RegionName) => Region;
  classes: (name: RegionName) => ClassStats;
}

export type RegionName = 'full' | 'centre' | 'familyCentre';

export interface Stage {
  name: string;
  run: (ctx: StageContext) => StagePick | null;
}
