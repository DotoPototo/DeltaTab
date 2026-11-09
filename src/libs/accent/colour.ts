import { parseRgb, toHex } from '@/libs/colour';

export const hsv = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b) / 255;
  const delta = max - Math.min(r, g, b) / 255;
  let hue = 0;
  if (delta !== 0) {
    if (max === r / 255) hue = ((g - b) / 255 / delta) % 6;
    else if (max === g / 255) hue = (b - r) / 255 / delta + 2;
    else hue = (r - g) / 255 / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return { hue, sat: max === 0 ? 0 : delta / max, v: max };
};

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

// BT.601 luma, 0 to 255.
export const brightness = (r: number, g: number, b: number) => (r * 299 + g * 587 + b * 114) / 1000;

export const hueDiff = (a: number, b: number) => {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
};

export type HueFamily = 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink';

// Warm families can be skin, wood or shadow as well as accent.
export const WARM_FAMILIES: ReadonlySet<string> = new Set<HueFamily>(['red', 'orange', 'yellow', 'pink']);

export const hueFamily = ({ hue, sat }: { hue: number; sat: number }): HueFamily => {
  if (sat < 0.12) return 'grey';
  if (hue >= 345 || hue < 20) return 'red';
  if (hue < 50) return 'orange';
  if (hue < 70) return 'yellow';
  if (hue < 165) return 'green';
  if (hue < 200) return 'cyan';
  if (hue < 255) return 'blue';
  if (hue < 290) return 'purple';
  return 'pink';
};

export const describeColour = (colour: string) => {
  const { r, g, b } = parseRgb(colour);
  const { hue, sat, v } = hsv(r, g, b);
  const family = hueFamily({ hue, sat });
  const tone = () => {
    if (v < 0.4) return 'Dark ';
    if (sat < 0.35) return 'Muted ';
    if (v > 0.85 && sat < 0.5) return 'Light ';
    return '';
  };
  const name = `${tone()}${family}`;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}, ${toHex(colour)}`;
};
