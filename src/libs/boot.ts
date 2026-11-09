import { textColourOn } from '@/libs/colour';

// localStorage is synchronous, so first-frame values are mirrored here and applied before Vue mounts.

export interface BootWallpaper {
  id: string;
  accent: string;
}

export interface BootCache {
  theme?: string;
  accent?: string;
  next?: BootWallpaper;
}

const KEY = 'deltatab:boot';

export const readBoot = (): BootCache => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as BootCache) : {};
  } catch {
    return {};
  }
};

export const writeBoot = (patch: Partial<BootCache>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readBoot(), ...patch }));
  } catch {
    // Storage full or disabled: first paint falls back to defaults.
  }
};

const root = () => document.documentElement;

export const applyTheme = (theme: string) => {
  root().dataset.theme = theme;
};

export const applyAccent = (accent: string) => {
  root().style.setProperty('--accent', accent);
  root().style.setProperty('--accent-text', textColourOn(accent));
};

export const applyBoot = () => {
  const boot = readBoot();
  if (boot.theme) applyTheme(boot.theme);
  if (boot.accent) applyAccent(boot.accent);
  return boot;
};
