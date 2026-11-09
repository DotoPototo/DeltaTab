import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fillMissing, persistent } from '@/libs/persist';
import { widgetDefinition } from '@/widgets';
import type { WidgetInstance } from '@/widgets/types';

export interface LayoutPreset {
  id: string;
  label: string;
  columns: number[];
  rows: number[][];
}

// Matches the 1.x extension's seven sections.
export const CLASSIC: LayoutPreset = {
  id: 'classic',
  label: 'Classic',
  columns: [0.35, 0.3, 0.35],
  rows: [
    [0.68, 0.32],
    [0.36, 0.31, 0.33],
    [0.6, 0.4],
  ],
};

export const PRESETS: LayoutPreset[] = [
  CLASSIC,
  { id: 'wide', label: 'Wide feed', columns: [0.6, 0.4], rows: [[1], [0.34, 0.33, 0.33]] },
  { id: 'focus', label: 'Focus', columns: [0.26, 0.48, 0.26], rows: [[0.5, 0.5], [1], [0.5, 0.5]] },
  {
    id: 'grid',
    label: 'Grid',
    columns: [0.5, 0.5],
    rows: [
      [0.5, 0.5],
      [0.5, 0.5],
    ],
  },
  {
    id: 'four',
    label: 'Four columns',
    columns: [0.25, 0.25, 0.25, 0.25],
    rows: [
      [0.5, 0.5],
      [0.5, 0.5],
      [0.5, 0.5],
      [0.5, 0.5],
    ],
  },
];

export interface SlotRef {
  column: number;
  row: number;
}

export interface DashboardState {
  preset: string;
  columns: number[];
  rows: number[][];
  slots: (string | null)[][];
  // Widgets bumped off by a preset with fewer slots, restored when there's room again.
  overflow: string[];
  instances: WidgetInstance[];
}

export type Arrangement = Pick<DashboardState, 'preset' | 'columns' | 'rows' | 'slots' | 'overflow'>;

const cloneArrangement = ({ preset, columns, rows, slots, overflow }: Arrangement): Arrangement => ({
  preset,
  columns: [...columns],
  rows: rows.map((r) => [...r]),
  slots: slots.map((c) => [...c]),
  overflow: [...overflow],
});

const arrangedIds = (arrangement: Arrangement) => [...arrangement.slots.flat().filter((id): id is string => !!id), ...arrangement.overflow];

export const reconcile = (remembered: Arrangement, current: Arrangement): Arrangement => {
  const next = cloneArrangement(remembered);
  const live = new Set(arrangedIds(current));
  next.slots = next.slots.map((column) => column.map((id) => (id && live.has(id) ? id : null)));
  next.overflow = next.overflow.filter((id) => live.has(id));
  const known = new Set(arrangedIds(next));
  const missing = arrangedIds(current).filter((id) => !known.has(id));
  for (const column of next.slots) {
    for (let row = 0; row < column.length && missing.length; row++) column[row] ??= missing.shift() ?? null;
  }
  next.overflow.push(...missing);
  return next;
};

export const MIN_FRACTION = 0.12;

export const createInstance = (type: string): WidgetInstance => ({
  id: crypto.randomUUID(),
  type,
  glance: false,
  config: (widgetDefinition(type)?.defaults() ?? {}) as Record<string, unknown>,
});

const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? CLASSIC;

const layOut = (preset: LayoutPreset, ids: string[]) => {
  const queue = [...ids];
  const slots = preset.rows.map((column) => column.map(() => queue.shift() ?? null));
  return { slots, overflow: queue };
};

export const defaultDashboard = (): DashboardState => {
  const preset = CLASSIC;
  const instances = ['feeds', 'scratchpad', 'weather', 'shortcuts', 'calendar', 'recent', 'releases'].map(createInstance);
  const weather = instances.find((i) => i.type === 'weather');
  if (weather) weather.glance = true;
  return {
    preset: preset.id,
    columns: [...preset.columns],
    rows: preset.rows.map((r) => [...r]),
    ...layOut(
      preset,
      instances.map((i) => i.id)
    ),
    instances,
  };
};

export const shiftFraction = (a: number, b: number, delta: number): [number, number] => {
  const clamped = Math.max(MIN_FRACTION - a, Math.min(b - MIN_FRACTION, delta));
  return [a + clamped, b - clamped];
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const fractionsFit = (values: unknown, count: number): values is number[] =>
  Array.isArray(values) &&
  values.length === count &&
  values.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1) &&
  Math.abs(values.reduce((sum, v) => sum + v, 0) - 1) < 0.01;

export const MAX_TITLE = 40;

// Unknown widget types are kept so data from a newer version survives a round trip.
export const sanitiseDashboard = (dashboard: DashboardState): DashboardState => {
  const ids = new Set<string>();
  const instances = (Array.isArray(dashboard.instances) ? (dashboard.instances as unknown[]) : []).flatMap((raw): WidgetInstance[] => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.type !== 'string' || ids.has(raw.id)) return [];
    ids.add(raw.id);
    const config = isRecord(raw.config) ? raw.config : {};
    const defaults = widgetDefinition(raw.type)?.defaults() as Record<string, unknown> | undefined;
    return [
      {
        id: raw.id,
        type: raw.type,
        glance: raw.glance === true,
        ...(typeof raw.title === 'string' && raw.title.trim() && { title: raw.title.trim().slice(0, MAX_TITLE) }),
        config: defaults ? fillMissing(defaults, config) : config,
      },
    ];
  });

  const preset = presetById(dashboard.preset);
  const placed = new Set<string>();
  const take = (id: unknown) => {
    if (typeof id !== 'string' || !ids.has(id) || placed.has(id)) return null;
    placed.add(id);
    return id;
  };
  const storedSlots = Array.isArray(dashboard.slots) ? (dashboard.slots as unknown[]) : [];
  const storedOverflow = Array.isArray(dashboard.overflow) ? (dashboard.overflow as unknown[]) : [];
  const shapeFits =
    storedSlots.length === preset.rows.length && preset.rows.every((rows, c) => Array.isArray(storedSlots[c]) && storedSlots[c].length === rows.length);
  const arrangement = shapeFits
    ? { slots: (storedSlots as unknown[][]).map((column) => column.map(take)), overflow: storedOverflow.map(take).filter((id): id is string => !!id) }
    : layOut(
        preset,
        [...storedSlots.flat(), ...storedOverflow].map(take).filter((id): id is string => !!id)
      );

  return {
    ...dashboard,
    preset: preset.id,
    columns: fractionsFit(dashboard.columns, preset.columns.length) ? dashboard.columns : [...preset.columns],
    rows: preset.rows.map((defaults, c) => {
      const stored = dashboard.rows?.[c];
      return fractionsFit(stored, defaults.length) ? stored : [...defaults];
    }),
    ...arrangement,
    instances,
  };
};

export const useDashboardStore = defineStore('dashboard', () => {
  const { state, ready } = persistent<DashboardState>('local:dashboard', defaultDashboard, { sanitise: sanitiseDashboard });

  const draft = ref<Arrangement | null>(null);
  // Per preset, so flipping presets to compare during an edit is lossless.
  const remembered = new Map<string, Arrangement>();

  const layout = computed<Arrangement>(() => draft.value ?? state.value);
  const editing = computed(() => !!draft.value);

  const byId = computed(() => new Map(state.value.instances.map((i) => [i.id, i])));
  const find = (id: string | null | undefined) => (id ? byId.value.get(id) : undefined);

  const placed = computed(() =>
    layout.value.slots
      .flat()
      .map(find)
      .filter((i): i is WidgetInstance => !!i && !!widgetDefinition(i.type))
  );

  const beginEdit = () => {
    remembered.clear();
    draft.value = cloneArrangement(state.value);
  };

  const commitEdit = () => {
    if (draft.value) Object.assign(state.value, cloneArrangement(draft.value));
    draft.value = null;
  };

  const cancelEdit = () => {
    draft.value = null;
  };

  const setPreset = (id: string) => {
    const target = layout.value;
    if (id === target.preset) return;
    remembered.set(target.preset, cloneArrangement(target));
    const previous = remembered.get(id);
    if (previous) {
      Object.assign(target, reconcile(previous, target));
      return;
    }
    const preset = presetById(id);
    const { slots, overflow } = layOut(preset, arrangedIds(target));
    Object.assign(target, { preset: preset.id, columns: [...preset.columns], rows: preset.rows.map((r) => [...r]), slots, overflow });
  };

  const resetSizes = () => {
    const preset = presetById(layout.value.preset);
    layout.value.columns = [...preset.columns];
    layout.value.rows = preset.rows.map((r) => [...r]);
  };

  // A slot chosen earlier may no longer exist after a preset change.
  const columnOf = ({ column, row }: SlotRef) => {
    const ids = layout.value.slots[column];
    return ids?.[row] === undefined ? undefined : ids;
  };
  const isSlot = (slot: SlotRef) => !!columnOf(slot);

  // Reuses an unplaced instance of the type so its settings survive.
  const assign = (slot: SlotRef, type: string) => {
    const ids = columnOf(slot);
    if (!ids) throw new Error('That slot no longer exists');
    const target = layout.value;
    const onBoard = new Set(target.slots.flat());
    let instance = state.value.instances.find((i) => i.type === type && !onBoard.has(i.id));
    if (!instance) {
      instance = createInstance(type);
      state.value.instances.push(instance);
    }
    ids[slot.row] = instance.id;
    target.overflow = target.overflow.filter((id) => id !== instance.id);
    return instance;
  };

  const locate = (id: string): SlotRef | undefined => {
    for (const [column, rows] of layout.value.slots.entries()) {
      const row = rows.indexOf(id);
      if (row >= 0) return { column, row };
    }
    return undefined;
  };

  // Undo applies to whatever is on screen by then (the draft may be committed or discarded), and
  // only while the slot is still free and the widget hasn't been placed elsewhere.
  const clear = (slot: SlotRef) => {
    const ids = columnOf(slot);
    if (!ids) return () => undefined;
    const { preset } = layout.value;
    const previous = ids[slot.row] ?? null;
    ids[slot.row] = null;
    return () => {
      const current = layout.value;
      const column = columnOf(slot);
      if (!previous || current.preset !== preset || column?.[slot.row] !== null || locate(previous)) return;
      column[slot.row] = previous;
      current.overflow = current.overflow.filter((id) => id !== previous);
    };
  };

  const swap = (a: SlotRef, b: SlotRef) => {
    const [from, to] = [columnOf(a), columnOf(b)];
    if (!from || !to) return;
    [from[a.row], to[b.row]] = [to[b.row] ?? null, from[a.row] ?? null];
  };

  const resize = (sizes: number[] | undefined, index: number, delta: number) => {
    const [size, next] = [sizes?.[index], sizes?.[index + 1]];
    if (sizes && size !== undefined && next !== undefined) [sizes[index], sizes[index + 1]] = shiftFraction(size, next, delta);
  };

  const resizeColumns = (index: number, delta: number) => resize(layout.value.columns, index, delta);
  const resizeRows = (column: number, index: number, delta: number) => resize(layout.value.rows[column], index, delta);

  return {
    state,
    ready,
    layout,
    isSlot,
    editing,
    beginEdit,
    commitEdit,
    cancelEdit,
    find,
    locate,
    placed,
    setPreset,
    resetSizes,
    assign,
    clear,
    swap,
    resizeColumns,
    resizeRows,
  };
});
