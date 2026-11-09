import { describe, test, expect } from 'bun:test';
import { usePads } from '@/widgets/scratchpad/pads';

describe('usePads', () => {
  test('each widget keeps its own selection; the shared one only seeds new widgets', async () => {
    const here = usePads();
    const elsewhere = usePads();
    await here.ready;
    const before = elsewhere.active.value!.id;
    const pad = here.add();
    expect(here.active.value!.id).toBe(pad.id);
    expect(elsewhere.active.value!.id).toBe(before);
    expect(usePads().active.value!.id).toBe(pad.id);
  });
});
