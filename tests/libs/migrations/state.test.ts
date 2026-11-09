import { describe, test, expect } from 'bun:test';
import { dashboardFromLegacy, readLegacyState, scratchpadFromLegacy, settingsFromLegacy } from '@/libs/migrations/state';

const storage = (entries: Record<string, unknown>) => ({
  getItem: (key: string) => (key in entries ? JSON.stringify(entries[key]) : null),
});

const LEGACY_SETTINGS = {
  storeTheme: 'retro',
  storeAccentColor: '#a54545',
  storeUseImageAccentColor: false,
  storeSubreddits: ['technology', 'rust'],
  storeWordFilters: ['crypto'],
  storeFavouriteSites: ['https://www.doto.gg'],
  storeHistoryProviders: [{ domain: 'github.com' }, { domain: 'gitlab.example.com' }],
  storeDarkenImageOverlay: true,
  storeUseCustomBackground: true,
  storeBgSlowZoom: true,
};

describe('readLegacyState', () => {
  test('unwraps the old signed settings envelope', () => {
    const state = readLegacyState(storage({ settings: { data: JSON.stringify(LEGACY_SETTINGS), sig: 'x' }, sections: { storeSections: { a: 'reddit' } } }));
    expect(state?.settings?.storeTheme).toBe('retro');
    expect(state?.sections).toEqual({ a: 'reddit' });
  });

  test('returns undefined when there is nothing to migrate', () => {
    expect(readLegacyState(storage({}))).toBeUndefined();
  });
});

describe('settingsFromLegacy', () => {
  test('maps theme, accent and background preferences', () => {
    expect(settingsFromLegacy(LEGACY_SETTINGS)).toMatchObject({
      theme: 'retro',
      accent: { source: 'custom', custom: '#a54545' },
      wallpaper: { source: 'library', dim: 0.5, motion: true },
    });
  });

  test('ignores unknown themes', () => {
    expect(settingsFromLegacy({ storeTheme: 'neon' }).theme).toBe('transparent');
  });
});

describe('scratchpadFromLegacy', () => {
  test('turns notes into pads and todos into a checklist, skipping the welcome note', () => {
    const state = scratchpadFromLegacy({
      notes: [
        { id: '123456789-abcdegfhi', title: 'Toggle Dashboard', content: 'Use Ctrl + Space' },
        { id: 'n1', title: 'Ideas', content: 'Build things' },
      ],
      todos: [
        { todo: 'Ship it', completed: false },
        { todo: 'Test it', completed: true },
      ],
    })!;
    expect(state.pads.map((p) => p.content)).toEqual(['# Ideas\nBuild things', '# Todo\n- [ ] Ship it\n- [x] Test it']);
    expect(state.active).toBe(state.pads[0]!.id);
  });

  test('nothing to import', () => {
    expect(scratchpadFromLegacy({ notes: [{ id: '123456789-abcdegfhi', title: '', content: '' }] })).toBeUndefined();
  });
});

describe('dashboardFromLegacy', () => {
  test('maps the 7 old slots onto the Classic preset and carries widget settings', () => {
    const dashboard = dashboardFromLegacy({
      settings: LEGACY_SETTINGS,
      sections: { a: 'reddit', b: 'notes', c: 'weathertime', d: 'favourites', e: 'snippets', f: 'history', g: 'todo' },
    });
    const typeAt = (c: number, r: number) => dashboard.instances.find((i) => i.id === dashboard.slots[c]![r])?.type ?? null;
    expect(dashboard.preset).toBe('classic');
    expect([
      [typeAt(0, 0), typeAt(0, 1)],
      [typeAt(1, 0), typeAt(1, 1), typeAt(1, 2)],
      [typeAt(2, 0), typeAt(2, 1)],
    ]).toEqual([
      ['feeds', 'scratchpad'],
      ['weather', 'shortcuts', 'releases'],
      ['recent', 'clocks'],
    ]);

    const feeds = dashboard.instances.find((i) => i.type === 'feeds')!.config as { sources: { value: string }[]; filters: string[] };
    expect(feeds.sources.map((s) => s.value)).toEqual(['technology+rust', 'all', 'front_page']);
    expect(feeds.filters).toEqual(['crypto']);

    const shortcuts = dashboard.instances.find((i) => i.type === 'shortcuts')!.config as { pinned: { title: string }[]; topSites: boolean };
    expect(shortcuts).toMatchObject({ topSites: false, pinned: [{ url: 'https://www.doto.gg', title: 'Doto' }] });

    const recent = dashboard.instances.find((i) => i.type === 'recent')!.config as { custom: { pattern: string }[] };
    expect(recent.custom.map((c) => c.pattern)).toEqual(['gitlab.example.com/*']);
  });
});
