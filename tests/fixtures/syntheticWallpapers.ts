import { ACCENT_SAMPLE_SIZE } from '@/libs/accent';

const mulberry32 = (start: number) => {
  let seed = start | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const synthetic = (seed: number) => {
  const rand = mulberry32(seed);
  const size = ACCENT_SAMPLE_SIZE;
  const data = new Uint8ClampedArray(size * size * 4);
  const colour = () => [rand() * 255, rand() * 255, rand() * 255] as const;
  const bg = rand() < 0.5 ? colour() : ([1, 1, 1].map(() => 60 + rand() * 120) as unknown as readonly [number, number, number]);
  const blobs = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => ({ c: colour(), x: rand() * size, y: rand() * size, r: 3 + rand() * size * 0.3 }));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = bg;
      for (const b of blobs) if ((x - b.x) ** 2 + (y - b.y) ** 2 < b.r ** 2) c = b.c;
      const i = (y * size + x) * 4;
      const n = (rand() - 0.5) * 24;
      data.set([c[0] + n, c[1] + n, c[2] + n, 255], i);
    }
  }
  return { data, width: size, height: size };
};
