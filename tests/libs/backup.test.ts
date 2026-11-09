import { describe, test, expect, beforeEach } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createBackup, parseBackup, resetPreferences, restoreBackup } from '@/libs/backup';
import { persistent, undoReplacement } from '@/libs/persist';
import { useSettingsStore } from '@/stores/settings';

beforeEach(() => {
  fakeBrowser.reset();
  setActivePinia(createPinia());
});

describe('backup', () => {
  test('round-trips settings, layout and notes but never secrets or caches', async () => {
    await fakeBrowser.storage.local.set({
      settings: { theme: 'oled' },
      dashboard: { preset: 'classic' },
      scratchpad: { pads: [], active: '' },
      secrets: { github: 'ghp_secret' },
      'cache:feeds:x': { data: 1 },
    });
    const backup = await createBackup();
    expect(Object.keys(backup.data).sort()).toEqual(['dashboard', 'scratchpad', 'settings']);
    expect(JSON.stringify(backup)).not.toContain('ghp_secret');

    fakeBrowser.reset();
    await restoreBackup(parseBackup(JSON.stringify(backup)));
    expect(await fakeBrowser.storage.local.get('settings')).toEqual({ settings: { theme: 'oled' } });
  });

  test('restore ignores unknown keys', async () => {
    await restoreBackup(
      parseBackup(JSON.stringify({ format: 'delta-tab-backup', version: 1, exportedAt: '', data: { secrets: { github: 'x' }, settings: {} } }))
    );
    expect(await fakeBrowser.storage.local.get('secrets')).toEqual({});
  });

  test('rejects foreign and future files', () => {
    expect(() => parseBackup('{"hello":1}')).toThrow('isn’t a Delta Tab backup');
    expect(() => parseBackup(JSON.stringify({ format: 'delta-tab-backup', version: 99, data: {} }))).toThrow('newer version');
    expect(() => parseBackup('not json')).toThrow();
  });

  test('reset keeps notes', async () => {
    await fakeBrowser.storage.local.set({ settings: { theme: 'blue' }, dashboard: { preset: 'grid' }, scratchpad: { pads: [1] } });
    await resetPreferences();
    const stored = await fakeBrowser.storage.local.get(['settings', 'dashboard', 'scratchpad']);
    expect(stored).toEqual({ scratchpad: { pads: [1] } });
  });
});

const backupOf = (data: object) => parseBackup(JSON.stringify({ format: 'delta-tab-backup', version: 1, exportedAt: '', data }));
const stored = async (key: string) => (await fakeBrowser.storage.local.get(key))[key];

describe('undo', () => {
  test('undoing a settings-only reset leaves notes edited since untouched', async () => {
    await fakeBrowser.storage.local.set({ settings: { theme: 'blue' }, scratchpad: { note: 'old' } });
    const undo = await resetPreferences();
    await fakeBrowser.storage.local.set({ scratchpad: { note: 'written after the reset' } });
    await undoReplacement(undo);
    expect(await stored('settings')).toEqual({ theme: 'blue' });
    expect(await stored('scratchpad')).toEqual({ note: 'written after the reset' });
  });

  test('undoing an import into a fresh install removes what the import added', async () => {
    const undo = await restoreBackup(backupOf({ settings: { theme: 'retro' } }));
    expect(await stored('settings')).toEqual({ theme: 'retro' });
    await undoReplacement(undo);
    expect(await stored('settings')).toBeUndefined();
  });

  test('undo keeps edits made since the import', async () => {
    await fakeBrowser.storage.local.set({ settings: { theme: 'blue', clock: 12 } });
    const undo = await restoreBackup(backupOf({ settings: { theme: 'retro', clock: 12 } }));
    await fakeBrowser.storage.local.set({ settings: { theme: 'retro', clock: 24 } });
    await undoReplacement(undo);
    expect(await stored('settings')).toEqual({ theme: 'blue', clock: 24 });
  });
});

describe('explicit actions win', () => {
  test('an import drops another tab’s unsaved edit instead of being overwritten by it', async () => {
    await fakeBrowser.storage.local.set({ dashboard: { preset: 'classic', title: 'old' } });
    const otherTab = persistent('local:dashboard', () => ({ preset: 'classic', title: '' }), { debounce: 10_000 });
    await otherTab.ready;
    otherTab.state.value.title = 'unsaved in another tab';
    await restoreBackup(backupOf({ dashboard: { preset: 'grid', title: 'imported' } }));
    await otherTab.flush();
    await new Promise((r) => setTimeout(r, 0));
    expect(await stored('dashboard')).toEqual({ preset: 'grid', title: 'imported' });
    expect(otherTab.state.value).toEqual({ preset: 'grid', title: 'imported' });
  });

  test('export includes what’s on screen even when saving is failing', async () => {
    await fakeBrowser.storage.local.set({ scratchpad: { note: 'saved' } });
    const notes = persistent('local:scratchpad', () => ({ note: '' }), { debounce: 10_000 });
    await notes.ready;
    const realSet = fakeBrowser.storage.local.set;
    fakeBrowser.storage.local.set = (() => Promise.reject(new Error('quota'))) as typeof realSet;
    try {
      notes.state.value.note = 'critical unsaved edit';
      const backup = await createBackup();
      expect(backup.data.scratchpad).toEqual({ note: 'critical unsaved edit' });
    } finally {
      fakeBrowser.storage.local.set = realSet;
    }
  });
});

const settle = () => new Promise((r) => setTimeout(r, 0));

const pauseWriteOf = (key: string) => {
  const realSet = fakeBrowser.storage.local.set;
  let reached!: () => void;
  let resume!: () => void;
  const held = new Promise<void>((r) => (resume = r));
  const hit = new Promise<void>((r) => (reached = r));
  let paused = false;
  fakeBrowser.storage.local.set = (async (items: Record<string, unknown>) => {
    if (!paused && key in items) {
      paused = true;
      reached();
      await held;
    }
    return realSet(items);
  }) as typeof realSet;
  return { hit, resume, restore: () => (fakeBrowser.storage.local.set = realSet) };
};

describe('concurrent replacements', () => {
  test('notes typed after an import survive a settings replacement that was in flight', async () => {
    const settings = useSettingsStore();
    await settings.ready;
    const notes = persistent('local:scratchpad', () => ({ note: '' }), { debounce: 10_000 });
    await notes.ready;
    const pause = pauseWriteOf('settings');
    try {
      const settingsImport = restoreBackup(backupOf({ settings: { theme: 'retro' } }));
      await pause.hit;
      await restoreBackup(backupOf({ scratchpad: { note: 'imported' } }));
      await settle();
      notes.state.value.note = 'typed after the import';
      pause.resume();
      await settingsImport;
      await settle();
      await notes.flush();
    } finally {
      pause.restore();
    }
    expect(notes.state.value.note).toBe('typed after the import');
    expect(await stored('scratchpad')).toEqual({ note: 'typed after the import' });
    expect(settings.settings.theme).toBe('retro');
  });

  test('replacements of different keys both bump their generation', async () => {
    const pause = pauseWriteOf('persist-generations');
    try {
      const settingsImport = restoreBackup(backupOf({ settings: { theme: 'retro' } }));
      await pause.hit;
      const notesImport = restoreBackup(backupOf({ scratchpad: { note: 'imported' } }));
      await settle();
      pause.resume();
      await Promise.all([settingsImport, notesImport]);
    } finally {
      pause.restore();
    }
    expect(await stored('persist-generations')).toEqual({ settings: 1, scratchpad: 1 });
  });
});

describe('undo with a live store', () => {
  test('undoing a reset puts back the settings the store showed', async () => {
    await fakeBrowser.storage.local.set({ settings: { theme: 'retro', units: 'imperial' } });
    const store = useSettingsStore();
    await store.ready;
    const undo = await resetPreferences();
    await settle();
    expect(store.settings.theme).toBe('transparent');
    await undoReplacement(undo);
    await settle();
    expect(store.settings).toMatchObject({ theme: 'retro', units: 'imperial' });
    expect(await stored('settings')).toMatchObject({ theme: 'retro', units: 'imperial' });
  });

  test('undoing a reset keeps a setting changed since', async () => {
    await fakeBrowser.storage.local.set({ settings: { theme: 'retro', units: 'imperial' } });
    const store = useSettingsStore();
    await store.ready;
    const undo = await resetPreferences();
    await settle();
    store.settings.units = 'metric';
    await undoReplacement(undo);
    await settle();
    expect(store.settings).toMatchObject({ theme: 'retro', units: 'metric' });
    expect(await stored('settings')).toMatchObject({ theme: 'retro', units: 'metric' });
  });
});
