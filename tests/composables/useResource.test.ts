import { describe, test, expect } from 'bun:test';
import { effectScope, ref } from 'vue';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { hashKey, isStale, pruneCache, useResource } from '@/composables/useResource';
import { DAY, MINUTE } from '@/libs/time';

describe('hashKey', () => {
  test('is stable and sensitive to content', () => {
    expect(hashKey({ a: 1 })).toBe(hashKey({ a: 1 }));
    expect(hashKey({ a: 1 })).not.toBe(hashKey({ a: 2 }));
  });
});

describe('isStale', () => {
  const now = 1_000_000;
  test('empty entries are stale', () => {
    expect(isStale({}, 1000, 100, now)).toBe(true);
  });

  test('fresh within ttl', () => {
    expect(isStale({ fetchedAt: now - 500 }, 1000, 100, now)).toBe(false);
    expect(isStale({ fetchedAt: now - 1500 }, 1000, 100, now)).toBe(true);
  });

  test('backs off after a recent failure', () => {
    expect(isStale({ fetchedAt: now - 5000, failedAt: now - 50 }, 1000, 100, now)).toBe(false);
    expect(isStale({ fetchedAt: now - 5000, failedAt: now - 150 }, 1000, 100, now)).toBe(true);
  });
});

describe('pruneCache', () => {
  test('drops old entries but keeps ones whose own ttl is longer', async () => {
    fakeBrowser.reset();
    const old = Date.now() - 10 * DAY;
    await fakeBrowser.storage.local.set({ 'cache:short': { fetchedAt: old }, 'cache:long': { fetchedAt: old, ttl: 30 * DAY }, other: { fetchedAt: old } });
    await pruneCache(7 * DAY);
    expect(Object.keys(await fakeBrowser.storage.local.get(null)).sort()).toEqual(['cache:long', 'other']);
  });
});

describe('useResource lifecycle', () => {
  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));

  test('a fetch started for A is not cached after the key goes A → B → A', async () => {
    fakeBrowser.reset();
    const config = ref('A');
    const pending: { promise: Promise<string>; resolve: (v: string) => void }[] = [];
    const scope = effectScope();
    const resource = scope.run(() =>
      useResource({
        key: () => config.value,
        fetcher: () => {
          const d = deferred<string>();
          pending.push(d);
          // Like a real widget, the fetcher reads whatever the config is when it runs.
          return d.promise.then((v) => `${v} for ${config.value}`);
        },
        ttl: MINUTE,
      })
    )!;
    await tick();
    expect(pending).toHaveLength(1); // generation 1 fetching for A
    config.value = 'B';
    await tick();
    config.value = 'A';
    await tick();
    pending[0]!.resolve('first');
    await tick();
    await tick();
    const stored = await fakeBrowser.storage.local.get(['cache:A', 'cache:B']);
    expect(stored['cache:A']).toBeUndefined(); // the superseded fetch was dropped…
    expect(pending.length).toBeGreaterThan(1); // …and A fetched again in its own generation
    pending.at(-1)!.resolve('second');
    await tick();
    await tick();
    expect(resource.data).toBe('second for A');
    scope.stop();
  });

  test('a resource disposed while hydrating never starts watching', async () => {
    fakeBrowser.reset();
    const scope = effectScope();
    const resource = scope.run(() => useResource({ key: 'K', fetcher: () => new Promise<number>(() => {}), ttl: MINUTE }))!;
    scope.stop(); // before the cache read resolves
    await tick();
    await fakeBrowser.storage.local.set({ 'cache:K': { data: 42, fetchedAt: Date.now() } });
    await tick();
    expect(resource.data).toBeUndefined();
  });

  test('a resource disposed mid-fetch never fetches again or writes its cache', async () => {
    fakeBrowser.reset();
    const calls: { resolve: (v: number) => void }[] = [];
    const scope = effectScope();
    scope.run(() =>
      useResource({
        key: 'disposal',
        fetcher: () => {
          const d = deferred<number>();
          calls.push(d);
          return d.promise;
        },
        ttl: MINUTE,
      })
    );
    await tick();
    await tick();
    expect(calls).toHaveLength(1);
    scope.stop(); // the widget is removed while its fetch is in flight
    calls[0]!.resolve(1);
    await tick();
    await tick();
    expect(calls).toHaveLength(1); // no second fetch for an abandoned resource
    expect((await fakeBrowser.storage.local.get('cache:disposal'))['cache:disposal']).toBeUndefined();
  });
});
