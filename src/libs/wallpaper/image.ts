import { ACCENT_SAMPLE_SIZE, accentCandidates, displayColour, extractAccent } from '@/libs/accent';
import { toHex } from '@/libs/colour';

// Runs once at upload or download, so a new tab never decodes, resizes or analyses anything.

export interface ProcessOptions {
  // Usually the display size × devicePixelRatio.
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  keepOriginal?: boolean;
}

export type ImageResolution = 'auto' | '720p' | '1080p' | '1440p' | '4k' | 'original';

export const RESOLUTIONS: Record<Exclude<ImageResolution, 'auto' | 'original'>, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 },
};

export const DEFAULT_RESOLUTION: ImageResolution = 'auto';
export const DEFAULT_QUALITY = 0.9;

export const storageOptions = (resolution: ImageResolution, quality: number, display: { width: number; height: number }): ProcessOptions => {
  if (resolution === 'original') return { maxWidth: Infinity, maxHeight: Infinity, quality, keepOriginal: true };
  const { width, height } = resolution === 'auto' ? display : RESOLUTIONS[resolution];
  return { maxWidth: width, maxHeight: height, quality };
};

export interface ProcessedImage {
  image: Blob;
  thumb: Blob;
  width: number;
  height: number;
  accent: string;
  // Painted behind everything on the very first frame.
  average: string;
}

const THUMB_SIZE = 360;
const KEEP_ORIGINAL_MAX_BYTES = 4 * 1024 * 1024;
const PASSTHROUGH_TYPES = new Set(['image/jxl', 'image/avif', 'image/webp', 'image/jpeg']);

// Browsers ship only WebP, JPEG and PNG encoders today; an unsupported type silently falls back to
// PNG, which is how support is detected.
const ENCODE_CANDIDATES = ['image/jxl', 'image/avif', 'image/webp'];
let preferredType: Promise<string> | undefined;

const encodeType = () =>
  (preferredType ??= (async () => {
    const canvas = new OffscreenCanvas(1, 1);
    canvas.getContext('2d'); // convertToBlob needs a rendering context
    for (const type of ENCODE_CANDIDATES) {
      try {
        if ((await canvas.convertToBlob({ type })).type === type) return type;
      } catch {
        // Detection must never break processing.
      }
    }
    return 'image/jpeg';
  })());

export const coverScale = (width: number, height: number, maxWidth: number, maxHeight: number): number =>
  Math.min(1, Math.max(maxWidth / width, maxHeight / height));

export const fitWithin = (width: number, height: number, size: number): [number, number] => {
  const scale = Math.min(1, size / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
};

const canvasFor = (source: ImageBitmap, width: number, height: number) => {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, ctx };
};

const accentSample = (source: ImageBitmap) => ({
  data: canvasFor(source, ACCENT_SAMPLE_SIZE, ACCENT_SAMPLE_SIZE).ctx.getImageData(0, 0, ACCENT_SAMPLE_SIZE, ACCENT_SAMPLE_SIZE).data,
  width: ACCENT_SAMPLE_SIZE,
  height: ACCENT_SAMPLE_SIZE,
});

const accentOf = (sample: ReturnType<typeof accentSample>) => toHex(displayColour(extractAccent(sample)));

export const accentOfBitmap = (source: ImageBitmap) => accentOf(accentSample(source));

export const accentCandidatesOfBitmap = (source: ImageBitmap) => [...new Set(accentCandidates(accentSample(source)).map((c) => toHex(displayColour(c))))];

const encode = async (source: ImageBitmap, width: number, height: number, quality: number) =>
  canvasFor(source, width, height).canvas.convertToBlob({ type: await encodeType(), quality });

const averageColour = (data: Uint8ClampedArray) => {
  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
  }
  return toHex(`rgb(${Math.round(r / pixels)}, ${Math.round(g / pixels)}, ${Math.round(b / pixels)})`);
};

export const processImage = async (
  source: Blob,
  { maxWidth, maxHeight, quality = DEFAULT_QUALITY, keepOriginal: keepAlways }: ProcessOptions
): Promise<ProcessedImage> => {
  const original = await createImageBitmap(source);
  const scale = coverScale(original.width, original.height, maxWidth, maxHeight);
  const width = Math.round(original.width * scale);
  const height = Math.round(original.height * scale);

  let sized = original;
  try {
    // Beats a drawImage downscale, and avoids decoding the (often 10+ MB) source twice.
    if (scale < 1) sized = await createImageBitmap(original, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });

    // Re-encoding an already-optimal JPEG/WebP only loses quality, unless a lower quality was asked for.
    const passthrough = scale === 1 && PASSTHROUGH_TYPES.has(source.type);
    const keepOriginal = passthrough && (keepAlways || (quality >= DEFAULT_QUALITY && source.size <= KEEP_ORIGINAL_MAX_BYTES));
    const image = keepOriginal ? source : await encode(sized, width, height, quality);
    const thumb = await encode(sized, ...fitWithin(width, height, THUMB_SIZE), 0.8);
    const sample = accentSample(sized);
    return { image, thumb, width, height, accent: accentOf(sample), average: averageColour(sample.data) };
  } finally {
    original.close();
    if (sized !== original) sized.close();
  }
};
