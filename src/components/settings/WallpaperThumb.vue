<template>
  <span ref="el" class="thumb" :style="{ background: wallpaper.average }">
    <img v-if="url" :src="url" alt="" draggable="false" />
  </span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { useThumbnail } from '@/composables/useThumbnail';
import type { Wallpaper } from '@/libs/wallpaper/library';

const props = defineProps<{ wallpaper: Wallpaper }>();
const el = useTemplateRef('el');
const near = ref(false);
const url = useThumbnail(() => (near.value ? props.wallpaper.id : undefined));

onMounted(() => el.value && watchVisibility(el.value, () => (near.value = true)));
onBeforeUnmount(() => el.value && unwatchVisibility(el.value));
</script>

<script lang="ts">
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | undefined;

const watchVisibility = (element: Element, onNear: () => void) => {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        unwatchVisibility(entry.target);
      }
    },
    { rootMargin: '400px' }
  );
  callbacks.set(element, onNear);
  observer.observe(element);
};

const unwatchVisibility = (element: Element) => {
  callbacks.delete(element);
  observer?.unobserve(element);
};
</script>

<style scoped>
.thumb {
  display: block;
  width: 100%;
  height: 100%;
}

img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
