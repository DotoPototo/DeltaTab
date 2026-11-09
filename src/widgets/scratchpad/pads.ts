import { computed, ref } from 'vue';
import { persistent } from '@/libs/persist';

export interface Pad {
  id: string;
  content: string;
  updatedAt: number;
}

export interface ScratchpadState {
  pads: Pad[];
  active: string;
}

export const WELCOME = `# Scratchpad
- [ ] Click a checkbox to tick it off
- [ ] Click any text to edit. Markdown works: **bold**, \`code\`, [links](https://example.com)
- Lists continue when you press Enter`;

export const createPad = (content = ''): Pad => ({ id: crypto.randomUUID(), content, updatedAt: Date.now() });

const welcome = createPad(WELCOME);

const isPad = (value: unknown): value is Pad =>
  typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string' && 'content' in value && typeof value.content === 'string';

const sanitiseScratchpad = (state: ScratchpadState): ScratchpadState => {
  const pads = state.pads.filter(isPad);
  return { pads: pads.length ? pads : [createPad()], active: state.active };
};

// A pad edited in two tabs at once keeps both texts: the one saved second becomes a copy.
const store = persistent<ScratchpadState>('local:scratchpad', () => ({ pads: [welcome], active: welcome.id }), {
  debounce: 400,
  sanitise: sanitiseScratchpad,
  merge: { entityConflict: (merged, local, remote) => (local.content === remote.content ? [merged] : [merged, { ...remote, id: crypto.randomUUID() }]) },
});

export const usePads = () => {
  const { state, ready, status } = store;
  // Local to this widget: selecting a pad here must never switch the pad being edited elsewhere.
  const selected = ref(state.value.active);
  const active = computed(() => {
    const { pads } = state.value;
    return pads.find((p) => p.id === selected.value) ?? pads.find((p) => p.id === state.value.active) ?? pads[0];
  });

  const select = (id: string) => {
    selected.value = id;
    state.value.active = id;
  };

  const add = () => {
    const pad = createPad();
    state.value.pads.push(pad);
    select(pad.id);
    return pad;
  };

  // Removing the last pad leaves a fresh empty one in its place.
  const remove = (id: string) => {
    const index = state.value.pads.findIndex((p) => p.id === id);
    const removed = state.value.pads[index];
    if (!removed) return undefined;
    state.value.pads.splice(index, 1);
    if (!state.value.pads.length) state.value.pads.push(createPad());
    if (selected.value === id) select(state.value.pads[Math.max(0, index - 1)]!.id);
    return () => {
      state.value.pads.splice(index, 0, removed);
      select(removed.id);
    };
  };

  const update = (id: string, content: string) => {
    const pad = state.value.pads.find((p) => p.id === id);
    if (!pad || pad.content === content) return;
    pad.content = content;
    pad.updatedAt = Date.now();
  };

  return { state, ready, status, active, select, add, remove, update };
};
