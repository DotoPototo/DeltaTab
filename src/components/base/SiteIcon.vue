<template>
  <img v-if="src && !failed" :src="src" :width="size" :height="size" alt="" class="site-icon" loading="lazy" @error="failed = true" />
  <span v-else class="site-icon site-letter" :style="{ width: `${size}px`, height: `${size}px`, '--hue': hue }">{{ letter }}</span>
</template>

<script setup lang="ts">
import { hostname } from '@/libs/text';
import { computed, ref, watch } from 'vue';
import { browser } from 'wxt/browser';

// Chrome's _favicon API reads the browser's cache, so no request is made; Firefox gets a monogram.
const props = withDefaults(defineProps<{ url: string; size?: number }>(), { size: 32 });
const failed = ref(false);
// A recycled component showing another site gets another try.
watch(
  () => props.url,
  () => (failed.value = false)
);

const src = computed(() => {
  if (import.meta.env.FIREFOX) return undefined;
  // `_favicon` is a virtual path, so it isn't in WXT's typed public-path list.
  const icon = new URL(`chrome-extension://${browser.runtime.id}/_favicon/`);
  icon.searchParams.set('pageUrl', props.url);
  icon.searchParams.set('size', String(props.size * 2));
  return icon.toString();
});

const host = computed(() => hostname(props.url) || props.url);

const letter = computed(() => host.value.charAt(0).toUpperCase());
const hue = computed(() => [...host.value].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
</script>

<style scoped>
.site-icon {
  flex-shrink: 0;
  border-radius: 22%;
}

.site-letter {
  display: inline-grid;
  place-items: center;
  background: hsl(var(--hue) 45% 38%);
  color: #fff;
  font-weight: 700;
  font-size: 0.55em;
}
</style>
