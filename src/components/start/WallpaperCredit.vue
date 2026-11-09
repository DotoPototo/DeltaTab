<template>
  <component :is="wallpaper.link ? 'a' : 'div'" v-if="text" class="credit" :href="wallpaper.link" target="_blank" rel="noopener noreferrer">
    {{ text }}
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Wallpaper } from '@/libs/wallpaper/library';

const props = defineProps<{ wallpaper: Wallpaper }>();

// Bing's caption already includes the photographer ("… (© Name/Agency)"); others get "title · credit".
const text = computed(() => {
  const { title, credit } = props.wallpaper;
  if (credit?.includes('©')) return credit;
  return [title, credit].filter(Boolean).join(' · ');
});
</script>

<style scoped>
.credit {
  max-width: 400px;
  padding: 6px 8px;
  border-radius: var(--radius);
  background: rgb(0 0 0 / 0.33);
  backdrop-filter: blur(8px);
  color: var(--text);
  font-size: 0.72rem;
  text-shadow: 0 2px 4px rgb(0 0 0 / 0.5);
  opacity: 0.5;
  transition: opacity 0.4s var(--ease-in-out);
}

.credit:hover {
  opacity: 1;
}
</style>
