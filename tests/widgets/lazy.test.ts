import { describe, test, expect } from 'bun:test';
import { lazy } from '@/widgets/types';

describe('lazy', () => {
  test('a failed load is retried on the next preload instead of failing forever', async () => {
    let calls = 0;
    const component = { name: 'Loaded' };
    const loader = lazy(async () => {
      calls++;
      if (calls === 1) throw new Error('chunk failed to load');
      return { default: component };
    });
    expect(loader.preload()).rejects.toThrow('chunk failed');
    await new Promise((r) => setTimeout(r, 0));
    await loader.preload();
    expect(calls).toBe(2);
    expect(loader.resolved).toBe(component);
  });

  test('a failed prefetch is swallowed, and the next preload still loads', async () => {
    let calls = 0;
    const component = { name: 'Loaded' };
    const loader = lazy(async () => {
      calls++;
      if (calls === 1) throw new Error('chunk failed to load');
      return { default: component };
    });
    const unhandled: unknown[] = [];
    const record = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', record);
    try {
      expect(loader.prefetch()).toBeUndefined();
      await new Promise((r) => setTimeout(r, 0));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', record);
    }
    await loader.preload();
    expect(loader.resolved).toBe(component);
  });
});
