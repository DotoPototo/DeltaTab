import { storage } from 'wxt/utils/storage';
import { mergeDefaults } from '@/libs/persist';
import { DEFAULT_QUALITY, DEFAULT_RESOLUTION, RESOLUTIONS, type ImageResolution } from '@/libs/wallpaper/image';
import type { WallpaperSource } from '@/libs/wallpaper/library';

// No Pinia here, so the background worker shares one definition with the pages.

export const SETTINGS_KEY = 'local:settings';

export const DEFAULT_ACCENT = '#718c4d';

export const THEMES = [
  { id: 'transparent', label: 'Transparent' },
  { id: 'blue', label: 'Blue' },
  { id: 'grey', label: 'Grey' },
  { id: 'dark', label: 'Dark' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'retro', label: 'Retro' },
  { id: 'arctic', label: 'Arctic' },
  { id: 'bubblegum', label: 'Bubblegum' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export interface Settings {
  theme: ThemeId;
  accent: { source: 'wallpaper' | 'custom'; custom: string };
  wallpaper: {
    source: WallpaperSource;
    // 0 to 0.7
    dim: number;
    blur: number;
    motion: boolean;
    resolution: ImageResolution;
    // 0.5 to 1
    quality: number;
    rotate: 'tab' | 'hour' | 'day';
  };
  clock: { format: 'auto' | '12' | '24'; seconds: boolean };
  start: {
    clock: boolean;
    clockSize: 'sm' | 'md' | 'lg';
    date: boolean;
    glances: boolean;
    credit: boolean;
  };
  units: 'auto' | 'metric' | 'imperial';
  openDashboard: boolean;
  openLinksInNewTab: boolean;
}

export const defaultSettings = (): Settings => ({
  theme: 'transparent',
  accent: { source: 'wallpaper', custom: DEFAULT_ACCENT },
  wallpaper: { source: 'wikimedia', dim: 0, blur: 0, motion: false, rotate: 'tab', resolution: DEFAULT_RESOLUTION, quality: DEFAULT_QUALITY },
  clock: { format: 'auto', seconds: false },
  start: { clock: true, clockSize: 'lg', date: true, glances: true, credit: true },
  units: 'auto',
  openDashboard: false,
  openLinksInNewTab: false,
});

const oneOf = <V extends string>(value: V, allowed: readonly V[], fallback: V): V => (allowed.includes(value) ? value : fallback);
const clamp = (value: number, min: number, max: number, fallback: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback);

export const sanitiseSettings = (settings: Settings): Settings => {
  const d = defaultSettings();
  const { wallpaper, clock, start, accent } = settings;
  return {
    ...settings,
    theme: oneOf(
      settings.theme,
      THEMES.map((t) => t.id),
      d.theme
    ),
    accent: {
      source: oneOf(accent.source, ['wallpaper', 'custom'], d.accent.source),
      custom: /^#[0-9a-f]{6}$/i.test(accent.custom) ? accent.custom : d.accent.custom,
    },
    wallpaper: {
      ...wallpaper,
      source: oneOf(wallpaper.source, ['bing', 'wikimedia', 'library'], d.wallpaper.source),
      dim: clamp(wallpaper.dim, 0, 0.7, d.wallpaper.dim),
      blur: clamp(wallpaper.blur, 0, 30, d.wallpaper.blur),
      rotate: oneOf(wallpaper.rotate, ['tab', 'hour', 'day'], d.wallpaper.rotate),
      resolution: oneOf(wallpaper.resolution, ['auto', 'original', ...(Object.keys(RESOLUTIONS) as ImageResolution[])], d.wallpaper.resolution),
      quality: clamp(wallpaper.quality, 0.5, 1, d.wallpaper.quality),
    },
    clock: { ...clock, format: oneOf(clock.format, ['auto', '12', '24'], d.clock.format) },
    start: { ...start, clockSize: oneOf(start.clockSize, ['sm', 'md', 'lg'], d.start.clockSize) },
    units: oneOf(settings.units, ['auto', 'metric', 'imperial'], d.units),
  };
};

export const settingsFrom = (stored: unknown): Settings => sanitiseSettings(mergeDefaults(defaultSettings(), stored));

export const readSettings = async (): Promise<Settings> => settingsFrom(await storage.getItem(SETTINGS_KEY));
