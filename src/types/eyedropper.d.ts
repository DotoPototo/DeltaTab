// Chromium only, and not in TypeScript's DOM types yet.
declare class EyeDropper {
  open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }>;
}
