import { describe, test, expect, beforeEach } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { MIN_FRACTION, defaultDashboard, reconcile, sanitiseDashboard, shiftFraction, useDashboardStore, type DashboardState } from '@/stores/dashboard';

const types = (store: ReturnType<typeof useDashboardStore>) => store.state.slots.map((column) => column.map((id) => store.find(id)?.type ?? null));

beforeEach(() => {
  fakeBrowser.reset();
  setActivePinia(createPinia());
});

describe('shiftFraction', () => {
  test('moves share between neighbours, never below the minimum', () => {
    expect(shiftFraction(0.5, 0.5, 0.1)).toEqual([0.6, 0.4]);
    const [a, b] = shiftFraction(0.5, 0.5, 0.9);
    expect(b).toBeCloseTo(MIN_FRACTION);
    expect(a + b).toBeCloseTo(1);
  });
});

describe('dashboard store', () => {
  test('a smaller preset parks widgets and a larger one brings them back', async () => {
    const store = useDashboardStore();
    await store.ready;
    const before = types(store).flat();
    store.setPreset('grid'); // 4 slots
    expect(store.state.overflow).toHaveLength(3);
    store.setPreset('classic'); // 7 slots
    expect(types(store).flat().sort()).toEqual([...before].sort());
    expect(store.state.overflow).toHaveLength(0);
  });

  test('assigning a type reuses its parked instance and its settings', async () => {
    const store = useDashboardStore();
    await store.ready;
    const weather = store.state.instances.find((i) => i.type === 'weather')!;
    weather.config.location = { name: 'Oslo', latitude: 59.9, longitude: 10.7 };
    store.clear({ column: 1, row: 0 });
    const reused = store.assign({ column: 2, row: 1 }, 'weather');
    expect(reused.id).toBe(weather.id);
    expect(reused.config.location).toMatchObject({ name: 'Oslo' });
  });

  test('clear returns an undo', async () => {
    const store = useDashboardStore();
    await store.ready;
    const id = store.state.slots[0]![0];
    const undo = store.clear({ column: 0, row: 0 });
    expect(store.state.slots[0]![0]).toBeNull();
    undo();
    expect(store.state.slots[0]![0]).toBe(id);
  });

  test('undo after the widget was reused elsewhere does not place it twice', async () => {
    const store = useDashboardStore();
    await store.ready;
    const weather = store.locate(store.state.instances.find((i) => i.type === 'weather')!.id)!;
    const undo = store.clear(weather);
    const elsewhere = store.clear({ column: 0, row: 0 });
    store.assign({ column: 0, row: 0 }, 'weather');
    undo();
    expect(store.state.slots[weather.column]![weather.row]).toBeNull();
    elsewhere(); // slot taken again, so this is a no-op too
    expect(store.find(store.state.slots[0]![0])?.type).toBe('weather');
  });

  test('undo survives commit, and is a no-op after a preset change or cancel', async () => {
    const store = useDashboardStore();
    await store.ready;
    const id = store.state.slots[2]![0];

    store.beginEdit();
    const afterCommit = store.clear({ column: 2, row: 0 });
    store.commitEdit();
    afterCommit();
    expect(store.state.slots[2]![0]).toBe(id);

    store.beginEdit();
    const afterPreset = store.clear({ column: 2, row: 0 });
    store.setPreset('wide');
    expect(() => afterPreset()).not.toThrow();
    store.cancelEdit();
    afterPreset();
    expect(store.state.slots[2]![0]).toBe(id);
  });

  test('swap exchanges two slots', async () => {
    const store = useDashboardStore();
    await store.ready;
    const [a, b] = [store.state.slots[0]![0], store.state.slots[2]![1]];
    store.swap({ column: 0, row: 0 }, { column: 2, row: 1 });
    expect([store.state.slots[0]![0], store.state.slots[2]![1]]).toEqual([b, a]);
  });
});

describe('layout editing', () => {
  test('nothing is saved until commit; cancel restores everything', async () => {
    const store = useDashboardStore();
    await store.ready;
    const saved = JSON.stringify(store.state.slots);
    store.beginEdit();
    store.setPreset('wide');
    store.swap({ column: 0, row: 0 }, { column: 1, row: 0 });
    expect(JSON.stringify(store.state.slots)).toBe(saved);
    store.cancelEdit();
    expect(store.layout.preset).toBe('classic');
    expect(JSON.stringify(store.layout.slots)).toBe(saved);
  });

  test('flipping presets while editing returns to the exact arrangement', async () => {
    const store = useDashboardStore();
    await store.ready;
    store.beginEdit();
    store.swap({ column: 0, row: 0 }, { column: 2, row: 1 }); // customise classic first
    const customised = JSON.stringify(store.layout.slots);
    store.setPreset('wide');
    store.setPreset('classic');
    expect(JSON.stringify(store.layout.slots)).toBe(customised);
  });

  test('commit saves the draft', async () => {
    const store = useDashboardStore();
    await store.ready;
    store.beginEdit();
    store.setPreset('grid');
    store.commitEdit();
    expect(store.state.preset).toBe('grid');
    expect(store.editing).toBe(false);
  });
});

describe('reconcile', () => {
  test('drops removed widgets and fits new ones into gaps', () => {
    const remembered = { preset: 'p', columns: [1], rows: [[0.5, 0.5]], slots: [['a', 'b']], overflow: ['c'] };
    const current = { preset: 'q', columns: [1], rows: [[1]], slots: [['a']], overflow: ['d'] };
    expect(reconcile(remembered, current)).toMatchObject({ slots: [['a', 'd']], overflow: [] });
  });
});

describe('stored dashboard', () => {
  test('instances restored without newer config fields are backfilled', async () => {
    const store = useDashboardStore();
    await store.ready;
    const shortcuts = store.state.instances.find((i) => i.type === 'shortcuts')!;
    const saved = JSON.parse(JSON.stringify(store.state));
    delete saved.instances.find((i: { id: string }) => i.id === shortcuts.id).config.style;
    await fakeBrowser.storage.local.set({ dashboard: saved });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.find(shortcuts.id)!.config.style).toBe('tiles');
  });
});

describe('sanitiseDashboard', () => {
  const broken = (patch: Record<string, unknown>) => ({ ...defaultDashboard(), ...patch }) as unknown as DashboardState;

  test('drops malformed instances and the slots that pointed at them', () => {
    const fine = defaultDashboard();
    const result = sanitiseDashboard({ ...fine, instances: [null, 'x', { id: 1 }, ...fine.instances] as never });
    expect(result.instances).toHaveLength(fine.instances.length);
    expect(
      sanitiseDashboard(broken({ instances: [null] }))
        .slots.flat()
        .every((id) => id === null)
    ).toBe(true);
  });

  test('a slot grid that does not fit the preset is redone, keeping each widget once', () => {
    const fine = defaultDashboard();
    const [a, b] = fine.instances.map((i) => i.id) as [string, string];
    const result = sanitiseDashboard({ ...fine, slots: [[a, a, b]], overflow: ['missing'] });
    expect(result.slots.map((c) => c.length)).toEqual([2, 3, 2]);
    expect(result.slots.flat().filter(Boolean)).toEqual([a, b]);
    expect(result.overflow).toEqual([]);
  });

  test('sizes that do not add up are reset to the preset', () => {
    const result = sanitiseDashboard(broken({ columns: [0.9, 0.9, 0.9], rows: [['x'], [0.5, 0.5], null] }));
    expect(result.columns).toEqual([0.35, 0.3, 0.35]);
    expect(result.rows[0]).toEqual([0.68, 0.32]);
  });

  test('widget configs keep valid union values and gain missing fields', () => {
    const fine = defaultDashboard();
    const calendar = fine.instances.find((i) => i.type === 'calendar')!;
    calendar.config = { weekStart: 0, weekend: [5, 6] };
    const config = sanitiseDashboard(fine).instances.find((i) => i.type === 'calendar')!.config;
    expect(config).toMatchObject({ weekStart: 0, weekend: [5, 6] });
    expect(Object.keys(config).length).toBeGreaterThan(2);
  });

  test('a store hydrating from broken data still starts', async () => {
    await fakeBrowser.storage.local.set({ dashboard: { instances: [null] } });
    const store = useDashboardStore();
    await store.ready;
    expect(store.state.instances).toEqual([]);
    expect(store.state.slots.flat().every((id) => id === null)).toBe(true);
  });
});

describe('stale slots', () => {
  test('a slot lost to a narrower layout is invalid and actions on it do nothing', async () => {
    const store = useDashboardStore();
    await store.ready;
    store.beginEdit();
    store.setPreset('classic');
    const thirdColumn = { column: 2, row: 0 };
    expect(store.isSlot(thirdColumn)).toBe(true);
    store.setPreset('wide');
    expect(store.isSlot(thirdColumn)).toBe(false);
    const before = JSON.stringify(store.layout.slots);
    store.swap({ column: 0, row: 0 }, thirdColumn);
    store.clear(thirdColumn)();
    expect(JSON.stringify(store.layout.slots)).toBe(before);
    expect(() => store.assign(thirdColumn, 'feeds')).toThrow('no longer exists');
  });
});
