// The colour the eye is drawn to in a wallpaper; pipeline.ts describes how it's picked.
import { pickAccent } from './pipeline';
import type { AccentPixels } from './measure';

export { ACCENT_SAMPLE_SIZE, ACCENT_VERSION } from './config';
export type { AccentPixels } from './measure';
export { pickAccent } from './pipeline';
export { accentCandidates } from './candidates';
export { displayColour } from './display';
export { describeColour } from './colour';

// Expects the image squeezed to ACCENT_SAMPLE_SIZE square.
export const extractAccent = (pixels: AccentPixels): string => pickAccent(pixels).colour;
