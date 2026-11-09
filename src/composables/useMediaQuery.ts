import { ref } from 'vue';
import { useEventListener } from '@/composables/useEventListener';

export const useMediaQuery = (query: string) => {
  const list = window.matchMedia(query);
  const matches = ref(list.matches);
  useEventListener(list, 'change', () => (matches.value = list.matches));
  return matches;
};
