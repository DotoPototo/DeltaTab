import { ref, watch, type Ref } from 'vue';
import { browser } from 'wxt/browser';
import { storage, type StorageItemKey } from 'wxt/utils/storage';

// Every write is a read-merge-write under a Web Lock shared by all tabs and the background, so two
// contexts saving at once both keep their changes. An explicit replacement (import, reset, Undo)
// bumps the key's generation instead, and every context drops drafts made against the old value.

export interface PersistentOptions<T> {
  debounce?: number;
  sanitise?: (value: T) => T;
  merge?: MergeOptions;
}

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface Persistent<T> {
  state: Ref<T>;
  ready: Promise<void>;
  status: Readonly<Ref<SaveStatus>>;
  flush: () => Promise<void>;
}

const RETRY_DELAY = 3000;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

const sameShape = (defaults: unknown, stored: unknown) => {
  if (defaults === null || defaults === undefined) return true;
  if (Array.isArray(defaults)) return Array.isArray(stored);
  if (isPlainObject(defaults)) return isPlainObject(stored);
  return typeof stored === typeof defaults;
};

// A stored value of the wrong type (corrupt or hand-edited backup) falls back to the default.
export const mergeDefaults = <T>(defaults: T, stored: unknown): T => {
  if (stored === null || stored === undefined || !sameShape(defaults, stored)) return defaults;
  if (!isPlainObject(defaults)) return stored as T;
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(stored)) {
    result[key] = key in defaults ? mergeDefaults((defaults as Record<string, unknown>)[key], value) : value;
  }
  return result as T;
};

// For union-typed fields (`'auto' | number`), where a default's type says nothing about what's valid.
export const fillMissing = <T>(defaults: T, stored: unknown): T => {
  if (!isPlainObject(defaults) || !isPlainObject(stored)) return (stored ?? defaults) as T;
  const result: Record<string, unknown> = { ...defaults, ...stored };
  for (const [key, value] of Object.entries(defaults)) if (key in stored) result[key] = fillMissing(value, stored[key]);
  return result as T;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Entity = Record<string, unknown> & { id: string };

export interface MergeOptions {
  entityConflict?: (merged: Entity, local: Entity, remote: Entity) => Entity[];
}

const isEntityList = (value: unknown): value is Entity[] => Array.isArray(value) && value.every((v) => isPlainObject(v) && typeof v.id === 'string');
const isStringSet = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string') && new Set(value).size === value.length;

const mergeEntities = (base: Entity[], local: Entity[], remote: Entity[], options: MergeOptions): Entity[] => {
  const byId = (list: Entity[]) => new Map(list.map((e) => [e.id, e]));
  const [b, l, r] = [byId(base), byId(local), byId(remote)];
  const ids = [...l.keys(), ...[...r.keys()].filter((id) => !l.has(id))];
  return ids.flatMap((id): Entity[] => {
    const [was, mine, theirs] = [b.get(id), l.get(id), r.get(id)];
    if (mine && theirs) {
      const merged = merge3(was, mine, theirs, options) as Entity;
      const conflict = was && !same(mine, was) && !same(theirs, was) && !same(mine, theirs);
      return conflict && options.entityConflict ? options.entityConflict(merged, mine, theirs) : [merged];
    }
    // On one side only: a new entity, or a deletion that loses to an edit made meanwhile.
    const kept = (mine ?? theirs)!;
    return !was || !same(kept, was) ? [kept] : [];
  });
};

// Anything both sides changed that can't be merged resolves to the local edit (the one in progress).
export const merge3 = (base: unknown, local: unknown, remote: unknown, options: MergeOptions = {}): unknown => {
  if (same(local, base)) return remote;
  if (same(remote, base) || same(local, remote)) return local;
  if (isPlainObject(local) && isPlainObject(remote)) {
    const was = isPlainObject(base) ? base : {};
    const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    return Object.fromEntries([...keys].map((key) => [key, merge3(was[key], local[key], remote[key], options)]).filter(([, value]) => value !== undefined));
  }
  const was = Array.isArray(base) ? base : [];
  if (isEntityList(local) && isEntityList(remote) && isEntityList(was)) return mergeEntities(was, local, remote, options);
  if (isStringSet(local) && isStringSet(remote) && isStringSet(was)) {
    const removed = new Set(was.filter((v) => !local.includes(v) || !remote.includes(v)));
    return [...new Set([...local, ...remote])].filter((v) => !removed.has(v));
  }
  return local;
};

const withLock = <R>(name: string, fn: () => Promise<R>): Promise<R> => navigator.locks.request(name, fn) as Promise<R>;

const pending = new Set<Promise<void>>();
const flushers = new Set<() => Promise<void>>();
const liveValues = new Map<string, () => unknown>();
const adopters = new Map<string, (value: unknown, generation: number) => unknown>();

const generationsItem = storage.defineItem<Record<string, number>>('local:persist-generations', { fallback: {} });

// Item definitions say `local:settings`; storage itself says `settings`.
const storageKey = (key: string) => key.replace(/^local:/, '');

export const liveValue = (key: string): unknown => liveValues.get(storageKey(key))?.();

export const allReady = () => Promise.all(pending).then(() => undefined);

export const flushAll = () => Promise.all([...flushers].map((f) => f())).then(() => undefined);

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushAll();
  });
}

export const persistent = <T>(key: StorageItemKey, defaults: () => T, options: PersistentOptions<T> = {}): Persistent<T> => {
  const { debounce = 250, sanitise = (value: T) => value, merge = {} } = options;
  const item = storage.defineItem<T | null>(key, { fallback: null });
  const state = ref(defaults()) as Ref<T>;
  const status = ref<SaveStatus>('saved');
  // What storage is known to hold; used to ignore this context's own change echoes.
  let committed = JSON.stringify(state.value);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();

  // Unloadable data is set aside rather than overwritten, so the page still mounts.
  const load = (value: T | null): T => {
    try {
      return sanitise(mergeDefaults(defaults(), value));
    } catch (error) {
      console.error(`[persist] ${key} could not be loaded; kept a copy under ${key}:recovered`, error);
      storage.setItem(`${key}:recovered`, value).catch(() => undefined);
      return sanitise(defaults());
    }
  };

  const apply = (value: T | null) => {
    const remote = load(value);
    const json = JSON.stringify(remote);
    if (json === committed) return;
    const base = JSON.parse(committed);
    const dirty = JSON.stringify(state.value) !== committed;
    committed = json;
    state.value = dirty ? (merge3(base, state.value, remote, merge) as T) : remote;
  };

  let generation = 0;

  const adopt = (value: T | null, nextGeneration: number) => {
    generation = nextGeneration;
    const fresh = load(value);
    committed = JSON.stringify(fresh);
    state.value = fresh;
    status.value = 'saved';
    return JSON.parse(committed) as T;
  };

  const write = async () => {
    clearTimeout(timer);
    timer = undefined;
    if (JSON.stringify(state.value) === committed) {
      status.value = 'saved';
      return;
    }
    status.value = 'saving';
    try {
      await withLock(`persist:${key}`, async () => {
        const current = (await generationsItem.getValue())[storageKey(key)] ?? 0;
        if (current !== generation) {
          // Replaced since these edits began: the import, reset or Undo wins.
          adopt(await item.getValue(), current);
          return;
        }
        const local = JSON.parse(JSON.stringify(state.value)) as T;
        const base = JSON.parse(committed) as T;
        // Nothing stored isn't a remote change: fresh defaults (new random ids) would read as one.
        const stored = await item.getValue();
        const merged = merge3(base, local, stored === null ? base : load(stored), merge) as T;
        await item.setValue(merged);
        committed = JSON.stringify(merged);
        // Keep anything typed while this write was in flight.
        if (!same(merged, local)) state.value = merge3(local, state.value, merged, merge) as T;
      });
      status.value = JSON.stringify(state.value) === committed ? 'saved' : 'saving';
    } catch (error) {
      console.warn(`[persist] ${key} failed to save, retrying:`, error);
      status.value = 'error';
      timer = setTimeout(flush, RETRY_DELAY);
    }
  };

  const flush = () => (queue = queue.then(write));

  const ready = Promise.all([item.getValue(), generationsItem.getValue()]).then(([value, generations]) => {
    generation = generations[storageKey(key)] ?? 0;
    apply(value);
    watch(
      state,
      () => {
        if (status.value === 'saved') status.value = 'saving';
        clearTimeout(timer);
        timer = setTimeout(flush, debounce);
      },
      { deep: true }
    );
    item.watch(apply);
    generationsItem.watch(async (generations) => {
      const next = generations?.[storageKey(key)] ?? 0;
      if (next === generation) return;
      const value = await item.getValue();
      // replaceStored may have adopted it directly meanwhile; adopting twice would regenerate random default ids.
      if (next !== generation) adopt(value, next);
    });
    flushers.add(flush);
    liveValues.set(storageKey(key), () => JSON.parse(JSON.stringify(state.value)));
    adopters.set(storageKey(key), (value, next) => adopt((value ?? null) as T | null, next));
  });
  pending.add(ready);
  ready.finally(() => pending.delete(ready)).catch(() => undefined);

  return { state, ready, status, flush };
};

// `undefined` means the key didn't exist. `baseline` is the live state right after (defaults filled
// in), which Undo compares later edits against instead of the raw stored value.
export type Replacement = Record<string, { before: unknown; after: unknown; baseline?: unknown }>;

// Sorted so two replacements can't deadlock.
const withLocks = <R>(keys: string[], fn: () => Promise<R>): Promise<R> =>
  [...keys]
    .map(storageKey)
    .sort()
    .reduceRight<() => Promise<R>>((inner, key) => () => withLock(`persist:local:${key}`, inner), fn)();

// `before` includes this context's unsaved edits, so Undo puts back what the user saw.
export const replaceStored = async (changes: Record<string, unknown>): Promise<Replacement> => {
  await flushAll().catch(() => undefined);
  const keys = Object.keys(changes);
  return withLocks(keys, async () => {
    const stored = await browser.storage.local.get(keys.map(storageKey));
    const replacement: Replacement = {};
    for (const key of keys) {
      const before = liveValue(key) ?? stored[storageKey(key)];
      if (!same(before, changes[key])) replacement[key] = { before, after: changes[key] };
    }
    const changed = Object.keys(replacement);
    if (!changed.length) return replacement;
    const toSet: Record<string, unknown> = {};
    for (const key of changed) if (changes[key] !== undefined) toSet[storageKey(key)] = changes[key];
    const toRemove = changed.filter((key) => changes[key] === undefined).map(storageKey);
    // Values first, then the generation bump that tells every context to adopt them.
    if (Object.keys(toSet).length) await browser.storage.local.set(toSet);
    if (toRemove.length) await browser.storage.local.remove(toRemove);
    // One map holds every key's generation, so replacements of different keys mustn't interleave here.
    const bumped = await withLock('persist:generations', async () => {
      const generations = await generationsItem.getValue();
      const next = Object.fromEntries(changed.map((key) => [storageKey(key), (generations[storageKey(key)] ?? 0) + 1]));
      await generationsItem.setValue({ ...generations, ...next });
      return next;
    });
    for (const key of changed) {
      const adopted = adopters.get(storageKey(key))?.(changes[key], bumped[storageKey(key)]!);
      if (adopted !== undefined) replacement[key]!.baseline = adopted;
    }
    return replacement;
  });
};

// Edits made since the replacement survive: a three-way merge with the replaced value as base.
export const undoReplacement = async (replacement: Replacement) => {
  await flushAll().catch(() => undefined);
  const keys = Object.keys(replacement);
  const stored = await browser.storage.local.get(keys.map(storageKey));
  const changes: Record<string, unknown> = {};
  for (const [key, { before, after: raw, baseline }] of Object.entries(replacement)) {
    // Compare like with like: live state against baseline, or storage against what was stored.
    const live = baseline === undefined ? undefined : liveValue(key);
    const [after, now] = live === undefined ? [raw, stored[storageKey(key)]] : [baseline, live];
    if (before === undefined) {
      // Back to "not stored", keeping only what changed since.
      const kept = merge3(after, now, isPlainObject(now) ? {} : undefined);
      changes[key] = kept === undefined || (isPlainObject(kept) && !Object.keys(kept).length) ? undefined : kept;
    } else changes[key] = merge3(after, now, before);
  }
  await replaceStored(changes);
};
