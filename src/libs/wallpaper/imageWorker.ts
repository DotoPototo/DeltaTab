import { processImage, type ProcessOptions, type ProcessedImage } from '@/libs/wallpaper/image';
import type { ImageJob, ImageJobResult } from '@/workers/image.worker';
import ImageWorker from '@/workers/image.worker?worker';

// Dev builds process on the main thread: Vite serves workers cross-origin to the extension page,
// and Chromium 150+ kills the renderer for that before any catchable error.

interface QueuedJob {
  blob: Blob;
  options: ProcessOptions;
  resolve: (result: ProcessedImage) => void;
  reject: (error: Error) => void;
}

interface PooledWorker {
  worker: Worker;
  job?: QueuedJob & { id: number };
}

// Half the cores less one: a bulk import on every core starves the browser's own drawing.
export const POOL_SIZE = Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2) - 1));

const pool: PooledWorker[] = [];
const queue: QueuedJob[] = [];
let nextId = 0;

const spawn = (): PooledWorker => {
  const slot: PooledWorker = { worker: new ImageWorker() };
  slot.worker.onmessage = ({ data }: MessageEvent<ImageJobResult>) => {
    const { job } = slot;
    if (!job || data.id !== job.id) return;
    slot.job = undefined;
    if ('error' in data) job.reject(new Error(data.error));
    else job.resolve(data.result);
    dispatch();
  };
  slot.worker.onerror = (event) => {
    pool.splice(pool.indexOf(slot), 1);
    slot.worker.terminate();
    slot.job?.reject(new Error(event.message || 'Image worker crashed'));
    dispatch();
  };
  pool.push(slot);
  return slot;
};

const dispatch = () => {
  while (queue.length) {
    const slot = pool.find((w) => !w.job) ?? (pool.length < POOL_SIZE ? spawn() : undefined);
    if (!slot) return;
    const job = { ...queue.shift()!, id: nextId++ };
    slot.job = job;
    slot.worker.postMessage({ id: job.id, blob: job.blob, options: job.options } satisfies ImageJob);
  }
};

export const processInWorker = (blob: Blob, options: ProcessOptions): Promise<ProcessedImage> => {
  if (import.meta.env.DEV || typeof Worker === 'undefined') return processImage(blob, options);
  return new Promise((resolve, reject) => {
    queue.push({ blob, options, resolve, reject });
    dispatch();
  });
};

export const displayTarget = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return {
    width: Math.min(3840, Math.round(screen.width * dpr)),
    height: Math.min(3840, Math.round(screen.height * dpr)),
  };
};
