<template>
  <div ref="layer" class="wallpaper" :class="{ motion: wallpaper.motion }" :style="style" aria-hidden="true">
    <Transition name="wallpaper-fade">
      <!-- The dim fades in with the image, or it would darken the empty page first. -->
      <div v-if="url" :key="url" class="wallpaper-frame">
        <img :src="url" class="wallpaper-image" alt="" draggable="false" />
        <div class="wallpaper-dim" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useEventListener } from '@/composables/useEventListener';
import { useSettingsStore } from '@/stores/settings';
import { useWallpaperStore } from '@/stores/wallpaper';

const { settings } = storeToRefs(useSettingsStore());
const { url } = storeToRefs(useWallpaperStore());

const wallpaper = computed(() => settings.value.wallpaper);
const drift = Math.random() < 0.5 ? '-5%' : '5%';
const style = computed(() => ({ '--dim': wallpaper.value.dim, '--blur': `${wallpaper.value.blur}px`, '--drift': drift }));

// A hidden tab keeps advancing the drift but doesn't recalculate styles, so a class can't pause it
// in time: pause the animations directly.
const layer = useTemplateRef('layer');
useEventListener(document, 'visibilitychange', () => {
  for (const animation of layer.value?.getAnimations({ subtree: true }) ?? []) {
    if (document.hidden) animation.pause();
    else animation.play();
  }
});
</script>

<style scoped>
.wallpaper {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.wallpaper-frame {
  position: absolute;
  inset: 0;
  /* On its own layer before the fade starts, so the first frames of a big image don't stall. */
  will-change: opacity, filter;
}

.wallpaper-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  filter: blur(var(--blur));
  backface-visibility: hidden;
}

.motion .wallpaper-image {
  transform-origin: center;
  will-change: transform;
  animation: slow-zoom 40s cubic-bezier(0.48, 0, 0.52, 1) infinite alternate;
}

@keyframes slow-zoom {
  from {
    transform: scale(1.15) translateY(var(--drift));
    filter: blur(var(--blur)) contrast(0.9);
  }
  to {
    transform: scale(1);
    filter: blur(var(--blur)) contrast(1);
  }
}

.wallpaper-dim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgb(0 0 0 / calc(var(--dim) * 0.45)), rgb(0 0 0 / var(--dim)));
  transition: background var(--duration-slow);
}

/* Meant to go unnoticed. Material's standard curve, as a plain ease-out lurches at the start. */
.wallpaper-fade-enter-active {
  transition:
    opacity 450ms cubic-bezier(0.4, 0, 0.2, 1),
    filter 450ms cubic-bezier(0.4, 0, 0.2, 1);
}

.wallpaper-fade-enter-from {
  opacity: 0;
  filter: brightness(0.85) saturate(0.6);
}

.wallpaper-fade-leave-active {
  transition: opacity 0ms 450ms;
}

.wallpaper-fade-leave-to {
  opacity: 0;
}
</style>
