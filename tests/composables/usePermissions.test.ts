import { describe, test, expect } from 'bun:test';
import { effectScope, nextTick, ref } from 'vue';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { originPattern, originsFor, usePermissions } from '@/composables/usePermissions';

describe('originPattern', () => {
  test('builds a host match pattern', () => {
    expect(originPattern('https://example.com/feed.xml?x=1')).toBe('https://example.com/*');
  });

  test('never asks for plain http access', () => {
    expect(originPattern('http://localhost:8080/a')).toBeNull();
  });

  test('rejects non-http urls and garbage', () => {
    expect(originPattern('webcal://example.com/cal.ics')).toBeNull();
    expect(originPattern('not a url')).toBeNull();
  });
});

describe('originsFor', () => {
  test('dedupes hosts', () => {
    expect(originsFor(['https://a.com/1', 'https://a.com/2', 'https://b.com'])).toEqual(['https://a.com/*', 'https://b.com/*']);
  });
});

describe('usePermissions', () => {
  test('an answer for an older spec arriving late never shows as the current one', async () => {
    const resolvers: ((granted: boolean) => void)[] = [];
    const realContains = fakeBrowser.permissions.contains;
    const { onAdded, onRemoved } = fakeBrowser.permissions;
    const listeners = { addListener: () => undefined, removeListener: () => undefined } as unknown as typeof onAdded;
    Object.assign(fakeBrowser.permissions, { onAdded: listeners, onRemoved: listeners });
    fakeBrowser.permissions.contains = (() => new Promise<boolean>((resolve) => resolvers.push(resolve))) as typeof realContains;
    try {
      const spec = ref({ origins: ['https://a.com/*'] });
      const scope = effectScope();
      const { granted } = scope.run(() => usePermissions(spec))!;
      spec.value = { origins: ['https://b.com/*'] };
      await nextTick();
      expect(granted.value).toBeNull(); // pending for B
      resolvers[1]!(false); // B: not granted
      resolvers[0]!(true); // A, late: granted
      await new Promise((r) => setTimeout(r, 0));
      expect(granted.value).toBe(false);
      scope.stop();
    } finally {
      Object.assign(fakeBrowser.permissions, { contains: realContains, onAdded, onRemoved });
    }
  });
});
