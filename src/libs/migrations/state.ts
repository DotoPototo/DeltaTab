import { browser } from 'wxt/browser';
import { WELCOME, createPad, type Pad, type ScratchpadState } from '@/widgets/scratchpad/pads';
import { CLASSIC, createInstance, defaultDashboard, type DashboardState } from '@/stores/dashboard';
import { THEMES, defaultSettings, type Settings, type ThemeId } from '@/libs/settings';
import { siteName } from '@/libs/text';
import { source, type FeedsConfig } from '@/widgets/feeds';
import type { RecentConfig } from '@/widgets/recent';
import type { ShortcutsConfig } from '@/widgets/shortcuts';

// One-time import of the 1.x extension's localStorage state. Existing data is never overwritten.

interface LegacySettings {
  storeTheme?: string;
  storeAccentColor?: string;
  storeUseImageAccentColor?: boolean;
  storeSubreddits?: string[];
  storeWordFilters?: string[];
  storeFavouriteSites?: string[];
  storeHistoryProviders?: { domain: string }[];
  storeDarkenImageOverlay?: boolean;
  storeUseCustomBackground?: boolean;
  storeBgSlowZoom?: boolean;
}

interface LegacyUserData {
  notes?: { id: string; title: string; content: string }[];
  todos?: { todo: string; completed: boolean }[];
}

export interface LegacyState {
  settings?: LegacySettings;
  userdata?: LegacyUserData;
  sections?: Record<string, string>;
}

const LEGACY_KEYS = ['settings', 'userdata', 'sections', 'reddit', 'weather', '__deltatab_store_secret'];
const WELCOME_NOTE_ID = '123456789-abcdegfhi';
const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

const SECTION_WIDGETS: Record<string, string> = {
  reddit: 'feeds',
  notes: 'scratchpad',
  todo: 'scratchpad',
  weathertime: 'weather',
  favourites: 'shortcuts',
  history: 'recent',
  calendar: 'calendar',
};

const FILLER_WIDGETS = ['releases', 'clocks', 'calendar', 'countdown'];

const parseJson = <T>(raw: string | null): T | undefined => {
  try {
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
};

// 1.x wrapped settings as `{ data, sig }` in its signed storage.
export const readLegacyState = (store: Pick<Storage, 'getItem'> = localStorage): LegacyState | undefined => {
  const signed = parseJson<{ data?: string }>(store.getItem('settings'));
  const state: LegacyState = {
    settings: parseJson<LegacySettings>(signed?.data ?? null),
    userdata: parseJson<LegacyUserData>(store.getItem('userdata')),
    sections: parseJson<{ storeSections?: Record<string, string> }>(store.getItem('sections'))?.storeSections,
  };
  return state.settings || state.userdata || state.sections ? state : undefined;
};

export const settingsFromLegacy = (legacy: LegacySettings = {}): Settings => {
  const settings = defaultSettings();
  if (legacy.storeTheme && THEME_IDS.has(legacy.storeTheme)) settings.theme = legacy.storeTheme as ThemeId;
  if (legacy.storeUseImageAccentColor === false) settings.accent.source = 'custom';
  if (legacy.storeAccentColor) settings.accent.custom = legacy.storeAccentColor;
  if (legacy.storeUseCustomBackground) settings.wallpaper.source = 'library';
  if (legacy.storeDarkenImageOverlay) settings.wallpaper.dim = 0.5;
  if (legacy.storeBgSlowZoom) settings.wallpaper.motion = true;
  return settings;
};

export const scratchpadFromLegacy = (userdata: LegacyUserData = {}): ScratchpadState | undefined => {
  const pads: Pad[] = (userdata.notes ?? []).filter((n) => n.id !== WELCOME_NOTE_ID).map((n) => createPad(`# ${n.title}\n${n.content}`));
  if (userdata.todos?.length) pads.push(createPad(['# Todo', ...userdata.todos.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.todo}`)].join('\n')));
  return pads.length ? { pads, active: pads[0]!.id } : undefined;
};

export const dashboardFromLegacy = (legacy: LegacyState): DashboardState => {
  const dashboard = defaultDashboard();
  const { settings = {} } = legacy;

  if (legacy.sections) {
    const used = new Set<string>();
    const types = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((slot) => {
      const type = SECTION_WIDGETS[legacy.sections?.[slot] ?? ''];
      if (!type || used.has(type)) return null;
      used.add(type);
      return type;
    });
    // Sections with no counterpart get a filler widget rather than a hole.
    const fillers = FILLER_WIDGETS.filter((t) => !used.has(t));
    for (let i = 0; i < types.length; i++) types[i] ??= fillers.shift() ?? null;
    dashboard.instances = types.filter((t): t is string => !!t).map(createInstance);
    const queue = [...dashboard.instances];
    dashboard.preset = CLASSIC.id;
    dashboard.columns = [...CLASSIC.columns];
    dashboard.rows = CLASSIC.rows.map((r) => [...r]);
    let index = 0;
    dashboard.slots = CLASSIC.rows.map((column) => column.map(() => (types[index++] ? queue.shift()!.id : null)));
  }

  for (const instance of dashboard.instances) {
    if (instance.type === 'weather') instance.glance = true;
    if (instance.type === 'feeds' && settings.storeSubreddits) {
      const config = instance.config as unknown as FeedsConfig;
      config.sources = [
        source('reddit', settings.storeSubreddits.join('+'), 'Favourites'),
        source('reddit', 'all', 'r/all'),
        source('hn', 'front_page', 'Hacker News'),
      ];
      config.filters = settings.storeWordFilters ?? [];
    }
    if (instance.type === 'shortcuts' && settings.storeFavouriteSites) {
      const config = instance.config as unknown as ShortcutsConfig;
      config.topSites = false;
      config.pinned = settings.storeFavouriteSites.map((url) => ({ url, title: siteName(url) }));
    }
    if (instance.type === 'recent' && settings.storeHistoryProviders) {
      const config = instance.config as unknown as RecentConfig;
      config.custom = settings.storeHistoryProviders
        .filter((p) => !['github.com', 'stackoverflow.com'].includes(p.domain))
        .map((p) => ({ id: crypto.randomUUID(), label: p.domain, pattern: `${p.domain}/*` }));
    }
  }
  return dashboard;
};

// Tabs opened together take turns under a lock and re-read inside it, so a second tab can't redo
// the migration over edits made since.
export const migrateLegacyState = async () => {
  if (!readLegacyState()) return;
  await navigator.locks.request('legacy-state-migration', migrate);
};

const migrate = async () => {
  const legacy = readLegacyState();
  if (!legacy) return;
  const existing = await browser.storage.local.get(['settings', 'dashboard', 'scratchpad']);
  // An unknown theme or a welcome-only scratchpad means a pre-release build: legacy state wins.
  const hasSettings = THEME_IDS.has((existing.settings as Partial<Settings> | undefined)?.theme ?? '');
  const hasNotes = (existing.scratchpad as ScratchpadState | undefined)?.pads.some((p) => p.content.trim() && p.content !== WELCOME);
  const scratchpad = scratchpadFromLegacy(legacy.userdata);
  await browser.storage.local.set({
    ...(hasSettings ? {} : { settings: settingsFromLegacy(legacy.settings) }),
    ...(existing.dashboard ? {} : { dashboard: dashboardFromLegacy(legacy) }),
    ...(hasNotes || !scratchpad ? {} : { scratchpad }),
  });
  await browser.storage.local.remove('layout');
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
};
