import { computed } from 'vue';
import { persistent } from '@/libs/persist';

// Shared by every instance and tab; old ids fall off the bounded lists long after their items left the feeds.

const MAX_READ = 2000;
const MAX_SEEN = 4000;

const read = persistent<string[]>('local:feeds-read', () => [], { debounce: 100 });
const seen = persistent<string[]>('local:feeds-seen', () => [], { debounce: 1000 });

const append = (list: string[], ids: string[], max: number) => {
  const existing = new Set(list);
  const added = ids.filter((id) => !existing.has(id));
  if (!added.length) return list;
  return [...list, ...added].slice(-max);
};

export const readIds = computed(() => new Set(read.state.value));
export const seenIds = computed(() => new Set(seen.state.value));
export const readStateReady = Promise.all([read.ready, seen.ready]);

export const markRead = (id: string) => (read.state.value = append(read.state.value, [id], MAX_READ));
export const markSeen = (ids: string[]) => (seen.state.value = append(seen.state.value, ids, MAX_SEEN));
