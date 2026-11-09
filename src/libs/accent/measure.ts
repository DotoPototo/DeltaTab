import { brightness, clamp01, hsv } from './colour';

export interface AccentPixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Bucket extends Moments {
  r: number;
  g: number;
  b: number;
  freq: number;
  hue: number;
  sat: number;
  bright: number;
  // max(r, g, b), 0 to 255: BT.601 underweights blue 5:1, this doesn't.
  vmax: number;
  // Histogram-contrast saliency, filled in by addRarity.
  rarity: number;
  compactness: number;
  borderFrac: number;
  centreFrac: number;
  // Kept with the moments so a group of buckets' geometry can be aggregated exactly.
  borderCount: number;
}

export interface Region {
  buckets: Bucket[];
  // Opaque pixels only.
  totalPixels: number;
  width: number;
  height: number;
}

const QUANT_STEP = 16;
const ALPHA_MIN = 128;
const BORDER_BAND = 0.08;
const CENTRE_SIGMA = 0.28;

export interface Moments {
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
}

export const maxSpreadOf = (width: number, height: number) => Math.sqrt((width * width + height * height) / 12);

// 1 = every pixel at one point, 0 = spread as widely as an even fill of the region.
export const compactnessOf = (m: Moments, count: number, maxSpread: number) => {
  const meanX = m.sumX / count;
  const meanY = m.sumY / count;
  const varX = Math.max(0, m.sumX2 / count - meanX * meanX);
  const varY = Math.max(0, m.sumY2 / count - meanY * meanY);
  return clamp01(1 - Math.sqrt(varX + varY) / maxSpread);
};

export const cropPixels = ({ data, width, height }: AccentPixels, fraction: number): AccentPixels => {
  const [x0, y0] = [Math.floor(width * fraction), Math.floor(height * fraction)];
  const [w, h] = [width - 2 * x0, height - 2 * y0];
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) out.set(data.subarray(((y + y0) * width + x0) * 4, ((y + y0) * width + x0 + w) * 4), y * w * 4);
  return { data: out, width: w, height: h };
};

export const measure = ({ data, width, height }: AccentPixels): Region => {
  interface Acc {
    r: number;
    g: number;
    b: number;
    freq: number;
    sumX: number;
    sumY: number;
    sumX2: number;
    sumY2: number;
    borderCount: number;
    centreWeight: number;
  }
  const accs = new Map<number, Acc>();
  const bandX = width * BORDER_BAND;
  const bandY = height * BORDER_BAND;
  const cx = width / 2;
  const cy = height / 2;
  const twoSigmaSq = 2 * CENTRE_SIGMA * CENTRE_SIGMA;
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < ALPHA_MIN) continue;
    const px = (i / 4) % width;
    const py = Math.floor(i / 4 / width);
    const qr = Math.round(data[i]! / QUANT_STEP) * QUANT_STEP;
    const qg = Math.round(data[i + 1]! / QUANT_STEP) * QUANT_STEP;
    const qb = Math.round(data[i + 2]! / QUANT_STEP) * QUANT_STEP;
    const key = (qr << 16) | (qg << 8) | qb;
    const nx = (px - cx) / width;
    const ny = (py - cy) / height;
    let acc = accs.get(key);
    if (!acc) accs.set(key, (acc = { r: qr, g: qg, b: qb, freq: 0, sumX: 0, sumY: 0, sumX2: 0, sumY2: 0, borderCount: 0, centreWeight: 0 }));
    acc.freq++;
    acc.sumX += px;
    acc.sumY += py;
    acc.sumX2 += px * px;
    acc.sumY2 += py * py;
    if (px < bandX || px >= width - bandX || py < bandY || py >= height - bandY) acc.borderCount++;
    acc.centreWeight += Math.exp(-(nx * nx + ny * ny) / twoSigmaSq);
    totalPixels++;
  }

  const maxSpread = maxSpreadOf(width, height);
  const buckets: Bucket[] = [];
  for (const acc of accs.values()) {
    const { hue, sat } = hsv(acc.r, acc.g, acc.b);
    buckets.push({
      r: acc.r,
      g: acc.g,
      b: acc.b,
      freq: acc.freq,
      hue,
      sat,
      bright: brightness(acc.r, acc.g, acc.b),
      vmax: Math.max(acc.r, acc.g, acc.b),
      rarity: 0,
      compactness: compactnessOf(acc, acc.freq, maxSpread),
      borderFrac: acc.borderCount / acc.freq,
      centreFrac: acc.centreWeight / acc.freq,
      sumX: acc.sumX,
      sumY: acc.sumY,
      sumX2: acc.sumX2,
      sumY2: acc.sumY2,
      borderCount: acc.borderCount,
    });
  }
  return { buckets, totalPixels, width, height };
};

// Perceptually weighted RGB distance, normalised to 0 to 1.
const MAX_DIST = Math.sqrt(2 + 4 + 3) * 255;
const colourDist = (a: Bucket, b: Bucket) => {
  const [dr, dg, db] = [a.r - b.r, a.g - b.g, a.b - b.b];
  // Plain multiplication, not **: JavaScriptCore can round them differently in the last bit.
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / MAX_DIST;
};

const withRarity = new WeakSet<Region>();
// O(buckets²), so only the family stage asks for it.
export const addRarity = (region: Region) => {
  if (withRarity.has(region)) return region;
  for (const bk of region.buckets) {
    let sum = 0;
    for (const other of region.buckets) if (other !== bk) sum += (other.freq / region.totalPixels) * colourDist(bk, other);
    bk.rarity = sum;
  }
  withRarity.add(region);
  return region;
};
