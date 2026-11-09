// Pushes the accent into an HSL window that reads on the dark themes. It's a lightness window, not a
// contrast guarantee: some accents fall below 4.5:1 as text on the panels.
import { parseRgb } from '@/libs/colour';
import { brightness } from './colour';

const LIMITS = {
  veryDark: 50,
  dark: 90,
  slightlyDark: 105,
  sweetSpotMin: 105,
  sweetSpotMax: 160,
  sweetSpotSatMax: 0.5,
  lightnessMin: 0.38,
  lightnessMax: 0.55,
  saturationCap: 0.95,
};

// [above this saturation, multiply it by this]
const NEON_SOFTENING: Record<'veryDark' | 'bright', [number, number][]> = {
  veryDark: [
    [0.9, 0.8],
    [0.8, 0.85],
    [0.7, 0.9],
    [0.6, 0.95],
  ],
  bright: [
    [0.9, 0.85],
    [0.8, 0.9],
    [0.7, 0.95],
    [0.6, 0.98],
  ],
};

// By BT.601 luma: dark colours are lightened, glaring ones toned down.
const BANDS = [
  { below: LIMITS.veryDark, lightnessBoost: 0.25, saturation: 0.9 },
  { below: LIMITS.dark, lightnessBoost: 0.2, saturation: 0.9 },
  { below: LIMITS.slightlyDark, lightnessBoost: 0.18, saturation: 0.95 },
  { below: LIMITS.sweetSpotMax + 1e-9, lightnessBoost: 0, saturation: 0.95 },
  { below: Infinity, lightnessBoost: -0.1, saturation: 0.7 },
];

// h is in sextants (degrees / 60, 0 to 6); s and l are 0 to 1.
const rgbToHsl = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 510;
  const satDenominator = 1 - Math.abs(2 * l - 1);
  const s = d !== 0 && satDenominator > 0 ? d / (255 * satDenominator) : 0;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h, s, l };
};

const hslToRgb = (h: number, s: number, l: number) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = l - c / 2;
  const sectors = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ] as const;
  const [r1, g1, b1] = sectors[Math.min(5, Math.max(0, Math.floor(h)))]!;
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
};

// Returns the input unchanged when it already fits.
export const displayColour = (colour: string) => {
  const { r, g, b } = parseRgb(colour);
  const luma = brightness(r, g, b);
  const { h, s, l } = rgbToHsl(r, g, b);
  if (luma >= LIMITS.sweetSpotMin && luma <= LIMITS.sweetSpotMax && s < LIMITS.sweetSpotSatMax) return colour;

  // Flat grey reads as "dead"; give it a faint cool tint.
  const [hue, sat] = s < 0.05 ? [220 / 60, 0.08] : [h, s];
  const softening = NEON_SOFTENING[luma < LIMITS.veryDark ? 'veryDark' : 'bright'].find(([above]) => sat > above)?.[1] ?? 1;
  const band = BANDS.find((bd) => luma < bd.below)!;
  const lightness = Math.min(Math.max(l + band.lightnessBoost, LIMITS.lightnessMin), LIMITS.lightnessMax);
  const saturation = Math.min(sat * (band.saturation * softening), LIMITS.saturationCap);
  const out = hslToRgb(hue, saturation, lightness);
  return `rgba(${out.r},${out.g},${out.b},1)`;
};
