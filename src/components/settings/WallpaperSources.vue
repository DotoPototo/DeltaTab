<template>
  <div class="sources" role="radiogroup" aria-label="Wallpaper source" @keydown="onRadioKeydown">
    <button
      v-for="option in SOURCES"
      :key="option.value"
      type="button"
      role="radio"
      class="source"
      :class="{ active: source === option.value }"
      :aria-checked="source === option.value"
      :tabindex="source === option.value ? 0 : -1"
      @click="source = option.value"
    >
      <span class="source-preview">
        <WallpaperThumb v-if="previewFor(option.value)" :wallpaper="previewFor(option.value)!" />
        <Icon v-else :icon="option.icon" />
      </span>
      <span class="source-label">
        <Icon v-if="source === option.value" icon="material-symbols:check-rounded" />
        {{ option.label }}
      </span>
      <span class="source-desc">{{ option.description }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onRadioKeydown } from '@/libs/radioGroup';
import { storeToRefs } from 'pinia';
import Icon from '@/components/base/AppIcon.vue';
import WallpaperThumb from '@/components/settings/WallpaperThumb.vue';
import type { IconName } from '@/libs/icons';
import type { Wallpaper, WallpaperSource } from '@/libs/wallpaper/library';
import { useWallpaperStore } from '@/stores/wallpaper';

const SOURCES: { value: WallpaperSource; label: string; description: string; icon: IconName }[] = [
  { value: 'wikimedia', label: 'Wikimedia', description: 'Picture of the day', icon: 'material-symbols:public' },
  { value: 'bing', label: 'Bing', description: 'Photo of the day', icon: 'material-symbols:image-outline-rounded' },
  { value: 'library', label: 'Yours', description: 'Your own images', icon: 'material-symbols:wallpaper-rounded' },
];

const source = defineModel<WallpaperSource>({ required: true });
const { library, daily } = storeToRefs(useWallpaperStore());

const previewFor = (value: WallpaperSource): Wallpaper | undefined => (value === 'library' ? library.value.at(-1) : daily.value[value]);
</script>

<style scoped>
.sources {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 1rem;
}

.source {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: left;
}

.source-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 10;
  margin-bottom: 0.35rem;
  border-radius: var(--radius-lg);
  border: 2px solid var(--border);
  background: var(--surface-sunken);
  overflow: hidden;
  font-size: 1.5rem;
  color: var(--text-faint);
  transition:
    border-color var(--duration-fast),
    transform var(--duration-fast);
}

.source:hover .source-preview {
  transform: translateY(-1px);
  border-color: var(--border-strong);
}

.source.active .source-preview {
  border-color: var(--accent);
}

.source-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
}

.source.active .source-label {
  color: var(--text);
}

.source-label :deep(svg) {
  color: var(--accent);
}

.source-desc {
  font-size: var(--text-xs);
  color: var(--text-faint);
}
</style>
