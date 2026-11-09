// Bump whenever a change here or in stages/ can change picks: stored accents are then recomputed.
export const ACCENT_VERSION = 5;

// Every image is squeezed to this square; the thresholds assume this size.
export const ACCENT_SAMPLE_SIZE = 140;

const STRONG_LADDER = ['strong-red', 'strong-pink', 'strong-purple', 'strong-orange', 'strong-green', 'strong-yellow'];

export const ACCENT_CONFIG = {
  // Fraction trimmed from each side for the centre regions: the eye rarely rests on the edges.
  centreCrop: 0.15,
  familyCrop: 0.2,

  // Shadow, by HSV value (0 to 255): dark warm reads brown or black, and near-black foliage isn't green.
  darkWarmVmax: 70,
  darkClassVmax: 0.27 * 255,

  // Priority ladders, highest first. Orange and blue can't win as the only colour: they can be skin or sky.
  strongLadder: STRONG_LADDER,
  centreLadder: [...STRONG_LADDER, 'red', 'pink', 'purple', 'orange'],
  guardedLadder: ['red', 'pink', 'purple', 'orange', 'green', 'strong-blue', 'strong-cyan'],
  loneEligible: ['red', 'pink', 'purple', 'green', 'strong-red', 'strong-pink', 'strong-purple', 'strong-green'],

  // Significance floors: the share of the region's pixels a class needs to count.
  strongShare: 0.005,
  strongShareFull: 0.015,
  colourShare: 0.07,
  greenShare: 0.04,
  strongBlueShare: 0.015,

  // A much bigger lower rung leapfrogs; a guarded rung yields to a lower rung or a chunk of non-ladder colour.
  boostRatio: 4.5,
  outweighRatio: 0.7,
  neutralOutweighRatio: 1.5,

  // The only colour must own most coloured pixels, be visible somewhere and be saturated: a tint is not a colour.
  loneMinShare: 0.02,
  loneDominance: 0.6,
  loneVmax: 0.5,
  loneSat: 0.6,

  // The family stage's wider-crop retry takes only a compact subject, never scattered edge texture.
  familyWiderObjectness: 0.4,

  // Blend: strong-red absorbs some red; bright saturated buckets dominate; too dark to read as text is lifted.
  mergeSameBase: 0.7,
  satBias: 0.2,
  satProm: 2.2,
  valProm: 2,
  minOutVmax: 145,
  maxLift: 3,

  // The average ignores near-black and near-white and leans warm.
  avgVmaxMin: 30,
  avgVmaxMax: 245,
  warmAvgBias: 1.25,
};

export type AccentConfig = typeof ACCENT_CONFIG;

export const FALLBACK_COLOUR = 'rgba(100,110,120,1)';
