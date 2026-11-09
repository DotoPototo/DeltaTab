import { fakeBrowser } from 'wxt/testing/fake-browser';
import { SAMPLE_HISTORY, SAMPLE_TOP_SITES } from './fixtures';

// The extension APIs must be faked before the app is imported. `?reset` starts with empty storage.

const STORAGE_KEY = 'preview:storage';
if (new URLSearchParams(location.search).has('reset')) localStorage.removeItem(STORAGE_KEY);

await fakeBrowser.storage.local.set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'));
fakeBrowser.storage.onChanged.addListener(async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(await fakeBrowser.storage.local.get(null)));
});

const noopEvent = () => ({ addListener() {}, removeListener() {} });

Object.assign(fakeBrowser.permissions, {
  contains: async () => true,
  request: async () => true,
  onAdded: noopEvent(),
  onRemoved: noopEvent(),
});
Object.assign(fakeBrowser.runtime, { getManifest: () => ({ version: 'preview' }) });
Object.assign(fakeBrowser, {
  history: { search: async () => SAMPLE_HISTORY, onVisited: noopEvent(), onVisitRemoved: noopEvent() },
  topSites: { get: async () => SAMPLE_TOP_SITES },
});
Object.assign(globalThis, { chrome: fakeBrowser, browser: fakeBrowser });

await import('@/entrypoints/newtab/main');
