// Test preload (bunfig.toml): browser globals that Bun doesn't provide.

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key: (i: number): string | null => Array.from(store.keys())[i] ?? null,
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createLocalStorage(),
    writable: true,
    configurable: true,
  });
}

// Must exist before wxt/browser is evaluated: it captures globalThis.chrome at import time.
const { fakeBrowser } = await import('wxt/testing/fake-browser');
Object.assign(globalThis, { chrome: fakeBrowser, browser: fakeBrowser });

const { Window } = await import('happy-dom');
const window = new Window();
Object.assign(globalThis, { DOMParser: window.DOMParser });
if (typeof document === 'undefined') Object.assign(globalThis, { document: window.document });

if (typeof navigator !== 'undefined' && !navigator.locks) {
  const tails = new Map<string, Promise<unknown>>();
  const held = new Set<string>();
  const request = (name: string, ...args: unknown[]) => {
    const run = args.at(-1) as (lock: { name: string } | null) => unknown;
    const options = (args.length > 1 ? args[0] : {}) as { ifAvailable?: boolean };
    if (options.ifAvailable && held.has(name)) return Promise.resolve(run(null));
    const result = (tails.get(name) ?? Promise.resolve()).then(async () => {
      held.add(name);
      try {
        return await run({ name });
      } finally {
        held.delete(name);
      }
    });
    tails.set(
      name,
      result.catch(() => undefined)
    );
    return result;
  };
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
}
