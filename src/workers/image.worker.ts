/// <reference lib="webworker" />

import { processImage, type ProcessOptions, type ProcessedImage } from '@/libs/wallpaper/image';
import { describeError } from '@/libs/text';

export interface ImageJob {
  id: number;
  blob: Blob;
  options: ProcessOptions;
}

export type ImageJobResult = { id: number; result: ProcessedImage } | { id: number; error: string };

self.onmessage = async ({ data: { id, blob, options } }: MessageEvent<ImageJob>) => {
  try {
    self.postMessage({ id, result: await processImage(blob, options) } satisfies ImageJobResult);
  } catch (error) {
    self.postMessage({ id, error: describeError(error) } satisfies ImageJobResult);
  }
};
