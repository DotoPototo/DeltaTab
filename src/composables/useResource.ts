import { computed, onScopeDispose, reactive, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import { useEventListener } from '@/composables/useEventListener';
import { errorMessage } from '@/libs/http';
import { MINUTE } from '@/libs/time';

// Stale-while-revalidate cache in extension storage. A Web Lock per key means ten tabs opened at
// once make one request; storage.onChanged fans the result out.

export interface CacheEntry<T> {
  data?: T;
  fetchedAt?: number;
  // Stored so pruning never drops a long-lived entry early.
  ttl?: number;
  error?: string;
  failedAt?: number;
}

export interface ResourceOptions<T> {
  key: MaybeRefOrGetter<string | null | undefined>;
  fetcher: (previous: T | undefined) => Promise<T>;
  ttl: number;
  retryAfter?: number;
}

const CACHE_PREFIX = 'cache:';
const storageKey = (key: string) => `local:${CACHE_PREFIX}${key}` as const;

export const hashKey = (value: unknown): string => {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const MAX_RETRY_DELAY = 2 * MINUTE;
const MAX_REVALIDATE_INTERVAL = 5 * MINUTE;

export const isStale = <T>(entry: CacheEntry<T>, ttl: number, retryAfter: number, now = Date.now()): boolean => {
  if (entry.failedAt && now - entry.failedAt < retryAfter) return false;
  return !entry.fetchedAt || now - entry.fetchedAt >= ttl;
};

export const useResource = <T>({ key, fetcher, ttl, retryAfter = Math.min(ttl, MAX_RETRY_DELAY) }: ResourceOptions<T>) => {
  const entry = shallowRef<CacheEntry<T>>({});
  const inFlight = ref(0);
  const hydrated = ref(false);
  let currentKey: string | null = null;
  let unwatch: (() => void) | undefined;
  // Bumped on key change or dispose, so work for a superseded config never lands, even after A → B → A.
  let generation = 0;
  let disposed = false;

  const refresh = async (force = false) => {
    const key = currentKey;
    const started = generation;
    const current = () => started === generation;
    if (!key || disposed) return;
    await navigator.locks.request(`resource:${key}`, { ifAvailable: !force }, async (lock) => {
      if (!lock || !current()) return;
      const latest = (await storage.getItem<CacheEntry<T>>(storageKey(key))) ?? {};
      if (!current()) return;
      if (!force && !isStale(latest, ttl, retryAfter)) {
        entry.value = latest;
        return;
      }
      inFlight.value++;
      let next: CacheEntry<T>;
      try {
        next = { data: await fetcher(latest.data), fetchedAt: Date.now(), ttl };
      } catch (error) {
        console.warn(`[resource] ${key}:`, error);
        next = { ...latest, error: errorMessage(error), failedAt: Date.now() };
      } finally {
        inFlight.value--;
      }
      if (!current()) return;
      await storage.setItem(storageKey(key), next);
      if (current()) entry.value = next;
    });
    // Abandoned work may have held the lock the newer generation's refresh needed.
    if (!current() && !disposed) revalidate();
  };

  const revalidate = () => {
    if (!disposed && !document.hidden && isStale(entry.value, ttl, retryAfter)) refresh();
  };

  watch(
    () => toValue(key) || null,
    async (next) => {
      const started = ++generation;
      unwatch?.();
      unwatch = undefined;
      currentKey = next;
      hydrated.value = false;
      if (!next) {
        entry.value = {};
        return;
      }
      const cached = (await storage.getItem<CacheEntry<T>>(storageKey(next))) ?? {};
      if (started !== generation) return;
      entry.value = cached;
      hydrated.value = true;
      unwatch = storage.watch<CacheEntry<T>>(storageKey(next), (value) => {
        entry.value = value ?? {};
        // Cleared from settings: refetch straight away.
        if (!value) revalidate();
      });
      revalidate();
    },
    { immediate: true }
  );

  const interval = setInterval(revalidate, Math.min(ttl, MAX_REVALIDATE_INTERVAL));
  useEventListener(document, 'visibilitychange', revalidate);
  onScopeDispose(() => {
    disposed = true;
    generation++;
    currentKey = null;
    unwatch?.();
    clearInterval(interval);
  });

  // Reactive, not a bag of refs, so it can be handed straight to <WidgetCard :resource>.
  return reactive({
    data: computed(() => entry.value.data),
    error: computed(() => (entry.value.failedAt && entry.value.failedAt >= (entry.value.fetchedAt ?? 0) ? entry.value.error : undefined)),
    updatedAt: computed(() => entry.value.fetchedAt),
    loading: computed(() => inFlight.value > 0),
    hydrated,
    pending: computed(() => !!toValue(key) && !entry.value.fetchedAt && !entry.value.failedAt),
    refresh: () => refresh(true),
  });
};

// getKeys, where the browser has it, avoids reading every value (notes, wallpaper metadata…).
const cacheKeys = async (): Promise<string[]> => {
  const local = browser.storage.local as typeof browser.storage.local & { getKeys?: () => Promise<string[]> };
  let keys: string[] | undefined;
  try {
    keys = await local.getKeys?.();
  } catch {
    // Unsupported: fall back to reading everything.
  }
  keys ??= Object.keys(await local.get(null));
  return keys.filter((key) => key.startsWith(CACHE_PREFIX));
};

const cacheEntries = async () => {
  const keys = await cacheKeys();
  return keys.length ? Object.entries(await browser.storage.local.get(keys)) : [];
};

export const cacheStats = async () => {
  const entries = await cacheEntries();
  const encoder = new TextEncoder();
  return { count: entries.length, bytes: entries.reduce((sum, [, value]) => sum + encoder.encode(JSON.stringify(value)).length, 0) };
};

export const clearCache = async () => browser.storage.local.remove(await cacheKeys());

export const pruneCache = async (maxAge: number) => {
  const now = Date.now();
  const expired = (entry: CacheEntry<unknown> | undefined) => now - (entry?.fetchedAt ?? 0) > Math.max(maxAge, entry?.ttl ?? 0);
  const stale = (await cacheEntries()).filter(([, v]) => expired(v as CacheEntry<unknown>)).map(([k]) => k);
  if (stale.length) await browser.storage.local.remove(stale);
};
