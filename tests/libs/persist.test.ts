import { describe, test, expect, beforeEach } from 'bun:test';
import { nextTick } from 'vue';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { fillMissing, merge3, mergeDefaults, persistent } from '@/libs/persist';

const defaults = () => ({ theme: 'glass', nested: { a: 1, b: 2 }, list: [1, 2] });
const read = async (key: string): Promise<any> => (await fakeBrowser.storage.local.get(key))[key];

beforeEach(() => fakeBrowser.reset());

describe('mergeDefaults', () => {
  test('fills missing nested keys', () => {
    expect(mergeDefaults(defaults(), { nested: { a: 5 } })).toEqual({ theme: 'glass', nested: { a: 5, b: 2 }, list: [1, 2] });
  });

  test('arrays replace rather than merge', () => {
    expect(mergeDefaults(defaults(), { list: [9] }).list).toEqual([9]);
  });

  test('null stored value yields defaults', () => {
    expect(mergeDefaults(defaults(), null)).toEqual(defaults());
  });

  test('a stored value of the wrong type falls back to the default', () => {
    expect(mergeDefaults(defaults(), [])).toEqual(defaults());
    expect(mergeDefaults(defaults(), 'x')).toEqual(defaults());
    expect(mergeDefaults(defaults(), { nested: 3, list: { 0: 1 }, theme: 7 })).toEqual(defaults());
  });

  test('anything may replace an empty default', () => {
    expect(mergeDefaults({ location: null as null | object }, { location: { name: 'Oslo' } })).toEqual({ location: { name: 'Oslo' } });
  });

  test('keeps unknown stored keys for forward compatibility', () => {
    expect(mergeDefaults(defaults(), { extra: true })).toMatchObject({ extra: true });
  });
});

describe('persistent', () => {
  test('hydrates from storage merged with defaults', async () => {
    await fakeBrowser.storage.local.set({ s1: { theme: 'oled' } });
    const p = persistent('local:s1', defaults);
    await p.ready;
    expect(p.state.value).toEqual({ ...defaults(), theme: 'oled' });
  });

  test('flush writes changes', async () => {
    const p = persistent('local:s2', defaults);
    await p.ready;
    p.state.value.theme = 'paper';
    await p.flush();
    expect((await read('s2')).theme).toBe('paper');
  });

  test('debounced writes land after the delay', async () => {
    const p = persistent('local:s3', defaults, { debounce: 5 });
    await p.ready;
    p.state.value.nested.b = 7;
    await nextTick();
    await new Promise((r) => setTimeout(r, 20));
    expect((await read('s3')).nested.b).toBe(7);
  });

  test('picks up writes from other contexts', async () => {
    const p = persistent('local:s4', defaults);
    await p.ready;
    await fakeBrowser.storage.local.set({ s4: { theme: 'matrix' } });
    await new Promise((r) => setTimeout(r, 0));
    expect(p.state.value.theme).toBe('matrix');
  });

  test('a remote change during a pending local edit keeps both', async () => {
    const p = persistent('local:s5', defaults, { debounce: 20 });
    await p.ready;
    p.state.value.nested.b = 7;
    await nextTick();
    await fakeBrowser.storage.local.set({ s5: { ...defaults(), theme: 'matrix' } });
    await new Promise((r) => setTimeout(r, 0));
    expect(p.state.value).toMatchObject({ theme: 'matrix', nested: { b: 7 } });
    await new Promise((r) => setTimeout(r, 40));
    expect(await read('s5')).toMatchObject({ theme: 'matrix', nested: { b: 7 } });
  });
});

describe('saving', () => {
  test('a failed write keeps the edit and retries until it lands', async () => {
    const p = persistent('local:f1', () => ({ value: 0 }));
    await p.ready;
    const realSet = fakeBrowser.storage.local.set;
    fakeBrowser.storage.local.set = (() => Promise.reject(new Error('quota'))) as typeof realSet;
    p.state.value.value = 1;
    await p.flush();
    expect(p.status.value).toBe('error');
    expect(await read('f1')).toBeUndefined();
    fakeBrowser.storage.local.set = realSet;
    await p.flush(); // what the retry timer does, without waiting for it
    expect(await read('f1')).toEqual({ value: 1 });
    expect(p.status.value).toBe('saved');
  });

  test('the first save of never-stored state keeps the edit', async () => {
    const p = persistent('local:f3', () => ({ items: [{ id: crypto.randomUUID(), value: 0 }] }));
    await p.ready;
    const id = p.state.value.items[0]!.id;
    p.state.value.items[0]!.value = 1;
    await p.flush();
    expect(p.state.value.items).toEqual([{ id, value: 1 }]);
    expect(await read('f3')).toEqual({ items: [{ id, value: 1 }] });
  });

  test('two contexts saving different fields at once both keep their edit', async () => {
    const a = persistent('local:f2', () => ({ a: 0, b: 0 }));
    const b = persistent('local:f2', () => ({ a: 0, b: 0 }));
    await Promise.all([a.ready, b.ready]);
    a.state.value.a = 1;
    b.state.value.b = 1;
    await Promise.all([a.flush(), b.flush()]);
    await new Promise((r) => setTimeout(r, 0));
    expect(await read('f2')).toEqual({ a: 1, b: 1 });
    expect(a.state.value).toEqual({ a: 1, b: 1 });
    expect(b.state.value).toEqual({ a: 1, b: 1 });
  });
});

describe('merge3', () => {
  const base = { active: 'a', pads: [{ id: 'a', content: '' }], nested: { x: 1, y: 1 } };

  test('keeps both sides when they changed different keys', () => {
    const local = { ...base, pads: [{ id: 'a', content: 'typing' }] };
    const remote = { ...base, active: 'b', nested: { x: 1, y: 2 } };
    expect(merge3(base, local, remote)).toEqual({ active: 'b', pads: [{ id: 'a', content: 'typing' }], nested: { x: 1, y: 2 } });
  });

  test('merges nested objects key by key', () => {
    expect(merge3(base, { ...base, nested: { x: 5, y: 1 } }, { ...base, nested: { x: 1, y: 9 } })).toMatchObject({ nested: { x: 5, y: 9 } });
  });

  test('the local edit wins a true conflict', () => {
    expect(merge3(base, { ...base, active: 'local' }, { ...base, active: 'remote' })).toMatchObject({ active: 'local' });
  });
});

describe('merge3 lists', () => {
  const pads = [
    { id: 'a', content: 'A' },
    { id: 'b', content: 'B' },
  ];

  test('edits to different entities are both kept', () => {
    const local = [{ id: 'a', content: 'A!' }, pads[1]];
    const remote = [pads[0], { id: 'b', content: 'B!' }];
    expect(merge3(pads, local, remote)).toEqual([
      { id: 'a', content: 'A!' },
      { id: 'b', content: 'B!' },
    ]);
  });

  test('additions from both sides survive and a deletion applies', () => {
    const local = [...pads, { id: 'c', content: 'C' }];
    const remote = [pads[1], { id: 'd', content: 'D' }];
    expect(merge3(pads, local, remote)).toEqual([pads[1], { id: 'c', content: 'C' }, { id: 'd', content: 'D' }]);
  });

  test('an edit beats a concurrent deletion', () => {
    expect(merge3(pads, [{ id: 'a', content: 'A!' }, pads[1]], [pads[1]])).toEqual([{ id: 'a', content: 'A!' }, pads[1]]);
  });

  test('a same-entity conflict can keep a copy', () => {
    const entityConflict = (merged: { id: string }, _local: unknown, remote: { id: string }) => [merged, { ...remote, id: 'copy' }];
    const result = merge3(pads, [{ id: 'a', content: 'mine' }, pads[1]], [{ id: 'a', content: 'theirs' }, pads[1]], { entityConflict });
    expect(result).toEqual([{ id: 'a', content: 'mine' }, { id: 'copy', content: 'theirs' }, pads[1]]);
  });

  test('string lists merge as sets', () => {
    expect(merge3(['x', 'y'], ['x', 'y', 'local'], ['y', 'remote'])).toEqual(['y', 'local', 'remote']);
  });
});

describe('fillMissing', () => {
  test('adds missing keys but keeps union values the default would reject', () => {
    expect(fillMissing<Record<string, unknown>>({ weekStart: 'auto', weekend: 'auto', region: 'GB' }, { weekStart: 0, weekend: [5, 6] })).toEqual({
      weekStart: 0,
      weekend: [5, 6],
      region: 'GB',
    });
  });
});
