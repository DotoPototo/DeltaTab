<template>
  <SettingsGroup title="Source">
    <WallpaperSources v-model="settings.wallpaper.source" />
  </SettingsGroup>

  <SettingsGroup v-if="settings.wallpaper.source === 'library'" title="Rotation" description="Your images are shuffled; every one is shown before any repeats.">
    <SettingsRow title="Change wallpaper">
      <SegmentedControl
        v-model="settings.wallpaper.rotate"
        size="sm"
        label="Change wallpaper"
        :options="[
          { value: 'tab', label: 'Every tab' },
          { value: 'hour', label: 'Hourly' },
          { value: 'day', label: 'Daily' },
        ]"
      />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Look">
    <SettingsRow title="Dim, blur and drift" description="Adjust while seeing the whole wallpaper.">
      <ul class="look-values" aria-label="Current look">
        <li v-for="value in lookValues" :key="value.name" :class="{ off: !value.on }">
          {{ value.name }} <strong>{{ value.text }}</strong>
        </li>
      </ul>
      <AppButton size="sm" label="Adjust" @click="previewLook" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup
    title="Image quality"
    description="How wallpapers are stored: yours when you add them, daily images when they download. Smaller and lower quality open faster; changes apply to images stored from now on."
  >
    <SettingsRow title="Resolution" :description="resolutionDescription">
      <SegmentedControl
        v-model="settings.wallpaper.resolution"
        size="sm"
        label="Resolution"
        :options="[
          { value: 'auto', label: 'Auto' },
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p' },
          { value: '1440p', label: '1440p' },
          { value: '4k', label: '4K' },
          { value: 'original', label: 'Original' },
        ]"
      />
    </SettingsRow>
    <SettingsRow title="Quality" :description="qualityDescription">
      <RangeSlider v-model="qualityPercent" aria-label="Quality" :min="50" :max="100" :step="5" :format="(v) => `${v}%`" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Your wallpapers" :description="libraryDescription">
    <template #aside>
      <AppButton v-if="library.length" size="sm" variant="ghost" label="Remove all" @click="removeAll" />
    </template>
    <div class="library-body">
      <WallpaperDropzone />
      <TransitionGroup v-if="shownLibrary.length" tag="ul" :name="animateThumbs ? 'thumbs' : 'none'" class="library">
        <li v-for="wallpaper in [...shownLibrary].reverse()" :key="wallpaper.id" class="library-item" :class="{ current: wallpaper.id === current?.id }">
          <button class="library-show" :aria-label="wallpaper.id === current?.id ? 'Showing now' : 'Show now'" @click="showNow(wallpaper.id)">
            <WallpaperThumb :wallpaper="wallpaper" />
          </button>
          <button class="library-remove" aria-label="Remove wallpaper" title="Remove" @click="remove(wallpaper)">
            <Icon icon="material-symbols:delete-outline-rounded" />
          </button>
        </li>
      </TransitionGroup>
    </div>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { formatBytes, plural } from '@/libs/text';
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AppButton from '@/components/base/AppButton.vue';
import RangeSlider from '@/components/base/RangeSlider.vue';
import Icon from '@/components/base/AppIcon.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import WallpaperDropzone from '@/components/settings/WallpaperDropzone.vue';
import WallpaperSources from '@/components/settings/WallpaperSources.vue';
import WallpaperThumb from '@/components/settings/WallpaperThumb.vue';
import { useConfirm } from '@/composables/useConfirm';
import { useShell } from '@/composables/useShell';
import { useToast } from '@/composables/useToast';
import { useWallpaperUpload } from '@/composables/useWallpaperUpload';
import { REMOVED_RETENTION, UNDO_WINDOW, removeFromLibrary, restoreToLibrary, sweepOrphans, type Wallpaper } from '@/libs/wallpaper/library';
import { useSettingsStore } from '@/stores/settings';
import { useWallpaperStore } from '@/stores/wallpaper';
import { RESOLUTIONS } from '@/libs/wallpaper/image';
import { displayTarget } from '@/libs/wallpaper/imageWorker';

const { settings } = storeToRefs(useSettingsStore());
const wallpaperStore = useWallpaperStore();
const { library, current } = storeToRefs(wallpaperStore);
const { confirm } = useConfirm();
const toast = useToast();
const showNow = toast.attempt('Couldn’t show that wallpaper', (id: string) => wallpaperStore.showNow(id));

const { previewLook } = useShell();
const lookValues = computed(() => {
  const { dim, blur, motion } = settings.value.wallpaper;
  return [
    { name: 'Dim', on: dim > 0, text: dim ? `${Math.round(dim * 100)}%` : 'Off' },
    { name: 'Blur', on: blur > 0, text: blur ? `${blur}px` : 'Off' },
    { name: 'Drift', on: motion, text: motion ? 'On' : 'Off' },
  ];
});

const totalBytes = computed(() => library.value.reduce((sum, w) => sum + w.bytes, 0));
const libraryDescription = computed(() =>
  library.value.length
    ? `${plural(library.value.length, 'image')} · ${formatBytes(totalBytes.value)}`
    : 'Processed once when added, so new tabs open instantly.'
);

// The grid holds still during an import rather than re-laying out for every saved batch.
const { state: upload } = useWallpaperUpload();
const beforeImport = ref<Set<string>>();
const animateThumbs = ref(true);
watch(
  () => upload.busy,
  async (busy) => {
    beforeImport.value = busy ? new Set(library.value.map((w) => w.id)) : undefined;
    if (busy) return;
    animateThumbs.value = false;
    await nextTick();
    animateThumbs.value = true;
  },
  { immediate: true }
);
const shownLibrary = computed(() => (beforeImport.value ? library.value.filter((w) => beforeImport.value!.has(w.id)) : library.value));

const screenSize = displayTarget();
const resolutionDescription = computed(() => {
  const { resolution } = settings.value.wallpaper;
  if (resolution === 'original') return 'Kept exactly as added where possible (JPEG/WebP/AVIF/JPEG XL). Big photos make new tabs slower to open.';
  const { width, height } = resolution === 'auto' ? screenSize : RESOLUTIONS[resolution];
  const prefix = resolution === 'auto' ? `This screen, ${width}×${height} physical pixels` : `${width}×${height}`;
  return `${prefix}. Images are scaled to cover it, never up.`;
});

const qualityPercent = computed({
  get: () => Math.round(settings.value.wallpaper.quality * 100),
  set: (value: number) => (settings.value.wallpaper.quality = value / 100),
});
const qualityDescription = computed(() => {
  const q = settings.value.wallpaper.quality;
  if (q >= 0.95) return 'Near lossless. Largest files.';
  if (q >= 0.85) return 'Visually lossless for most photos.';
  if (q >= 0.7) return 'Smaller files; fine detail softens slightly.';
  return 'Smallest files and fastest tabs; visible artefacts.';
});

// Free the space when retention ends rather than at the next browser start.
const scheduleSweep = () => setTimeout(sweepOrphans, REMOVED_RETENTION + 1000);
const undoRemove = (wallpapers: Wallpaper[]) => ({ label: 'Undo', run: toast.attempt('Couldn’t restore', () => restoreToLibrary(wallpapers)) });

const remove = toast.attempt('Couldn’t remove the wallpaper', async (wallpaper: Wallpaper) => {
  await removeFromLibrary([wallpaper.id]);
  toast.add({ summary: 'Wallpaper removed', action: undoRemove([wallpaper]), life: UNDO_WINDOW - 1000 });
  scheduleSweep();
});

const removeAll = toast.attempt('Couldn’t remove the wallpapers', async () => {
  const removed = [...library.value];
  const ok = await confirm({
    title: 'Remove all wallpapers?',
    message: `This deletes all ${removed.length} of your uploaded images from this device.`,
    confirmLabel: 'Remove all',
    danger: true,
  });
  if (!ok) return;
  await removeFromLibrary(removed.map((w) => w.id));
  toast.add({ summary: `Removed ${removed.length} wallpapers`, action: undoRemove(removed), life: UNDO_WINDOW - 1000 });
  scheduleSweep();
});
</script>

<style scoped>
.look-values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
}

.look-values li {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
}

.look-values strong {
  font-weight: 600;
  color: var(--text);
}

.look-values .off strong {
  color: var(--text-faint);
}

.library-body {
  padding: 1rem;
}

.library {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
  list-style: none;
}

.library-item {
  position: relative;
  content-visibility: auto;
  contain-intrinsic-size: auto 104px auto 65px;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-sunken);
}

.library-item.current {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.library-show {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
  transition: filter var(--duration-fast);
}

.library-show:hover {
  filter: brightness(1.1);
}

.library-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--radius);
  font-size: 0.95rem;
  color: #fff;
  background: rgb(0 0 0 / 0.6);
  opacity: 0;
  transition:
    opacity var(--duration-fast),
    background var(--duration-fast);
}

.library-item:hover .library-remove,
.library-remove:focus-visible {
  opacity: 1;
}

.library-remove:hover {
  background: var(--danger);
}

.thumbs-enter-active,
.thumbs-leave-active {
  transition:
    opacity var(--duration),
    transform var(--duration);
}

.thumbs-enter-from,
.thumbs-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
