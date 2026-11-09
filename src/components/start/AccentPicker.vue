<template>
  <div ref="root" class="accent-picker">
    <IconButton
      ref="trigger"
      glass
      size="sm"
      icon="material-symbols:colorize-rounded"
      label="Accent colour"
      :tooltip="!open"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="toggle"
    />
    <section v-if="open" :id="panelId" ref="panel" class="panel" tabindex="-1" aria-label="Accent colour for this wallpaper">
      <p class="panel-title">Accent for this wallpaper</p>
      <p v-if="customOn" class="custom-note">You’re using one accent everywhere. Picking a colour here switches back to wallpaper accents.</p>
      <div class="swatches">
        <button
          v-for="colour in candidates"
          :key="colour"
          type="button"
          class="swatch"
          :class="{ chosen: colour === wallpaper.accent }"
          :style="{ background: colour }"
          :aria-label="describeColour(colour)"
          :aria-pressed="colour === wallpaper.accent"
          @click="choose(colour)"
        />
        <span v-if="!candidates.length" class="hint" role="status">{{ failed ? 'Couldn’t read this image’s colours' : 'Finding colours…' }}</span>
      </div>
      <div class="actions">
        <AppButton v-if="canEyedrop" size="sm" label="Pick from screen" @click="eyedrop" />
        <AppButton v-if="wallpaper.accentPicked" size="sm" label="Automatic" @click="reset" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AppButton from '@/components/base/AppButton.vue';
import IconButton from '@/components/base/IconButton.vue';
import { useEventListener } from '@/composables/useEventListener';
import { useToast } from '@/composables/useToast';
import { describeColour, displayColour } from '@/libs/accent';
import { toHex } from '@/libs/colour';
import { accentCandidatesOfBitmap, accentOfBitmap } from '@/libs/wallpaper/image';
import { getImage, updateAccents, type Wallpaper } from '@/libs/wallpaper/library';
import { useSettingsStore } from '@/stores/settings';

// Stored on the wallpaper (accentPicked), so automatic accent updates never overwrite it.
const props = defineProps<{ wallpaper: Wallpaper }>();
const toast = useToast();

const panelId = useId();
const open = ref(false);
const candidates = ref<string[]>([]);
const failed = ref(false);
let automatic: string | undefined;
let loading: Promise<void> | undefined;

// EyeDropper is Chromium-only; Firefox gets the swatches alone.
const canEyedrop = typeof window !== 'undefined' && 'EyeDropper' in window;

const root = useTemplateRef('root');
const panel = useTemplateRef<HTMLElement>('panel');
const trigger = useTemplateRef<{ $el: HTMLElement }>('trigger');

const load = () =>
  (loading ??= (async () => {
    const { id } = props.wallpaper;
    let bitmap: ImageBitmap | undefined;
    try {
      const image = await getImage(id);
      if (!image) throw new Error('No stored image');
      bitmap = await createImageBitmap(image);
      if (props.wallpaper.id !== id) return;
      candidates.value = accentCandidatesOfBitmap(bitmap);
      automatic = accentOfBitmap(bitmap);
      failed.value = false;
    } catch (error) {
      if (props.wallpaper.id === id) failed.value = true;
      console.warn(`[accent] Couldn't read the colours of ${id}:`, error);
      loading = undefined;
    } finally {
      bitmap?.close();
    }
  })());

const close = ({ returnFocus = false } = {}) => {
  open.value = false;
  if (returnFocus) trigger.value?.$el.focus();
};

const toggle = async () => {
  if (open.value) return close();
  open.value = true;
  await nextTick();
  panel.value?.focus();
  if (!candidates.value.length) load();
};

watch(
  () => props.wallpaper.id,
  () => {
    close();
    candidates.value = [];
    failed.value = false;
    automatic = undefined;
    loading = undefined;
  }
);

// With one accent set for everywhere, a per-wallpaper colour would show nowhere: switch back.
const { settings } = storeToRefs(useSettingsStore());
const customOn = computed(() => settings.value.accent.source === 'custom');
const useWallpaperAccents = () => (settings.value.accent.source = 'wallpaper');

const choose = toast.attempt('Couldn’t save that accent', async (colour: string) => {
  await updateAccents(new Map([[props.wallpaper.id, colour]]), true);
  useWallpaperAccents();
});

const eyedrop = toast.attempt('Couldn’t save that accent', async () => {
  close();
  const target = props.wallpaper;
  let picked: string;
  try {
    ({ sRGBHex: picked } = await new EyeDropper().open());
  } catch (error) {
    // Escape or clicking away aborts; anything else is a real failure worth seeing.
    if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('[accent] Eyedropper failed:', error);
    return;
  } finally {
    trigger.value?.$el.focus();
  }
  // The wallpaper changed while the eyedropper was open: the colour belongs to neither for sure.
  if (props.wallpaper.id !== target.id) return;
  await updateAccents(new Map([[target.id, toHex(displayColour(picked))]]), true);
  useWallpaperAccents();
});

const reset = toast.attempt('Couldn’t restore the automatic accent', async () => {
  const target = props.wallpaper;
  await load();
  if (!automatic || props.wallpaper.id !== target.id) return;
  await updateAccents(new Map([[target.id, automatic]]), false);
  // The Automatic button (which had focus) goes away; keep focus in the panel.
  panel.value?.focus();
});

useEventListener(document, 'pointerdown', (event: PointerEvent) => {
  if (open.value && !root.value?.contains(event.target as Node)) close();
});
useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (open.value && event.key === 'Escape') close({ returnFocus: true });
});
</script>

<style scoped>
.accent-picker {
  position: relative;
  display: flex;
}

.panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 2;
  width: max-content;
  max-width: calc(100vw - 40px);
  padding: 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.45);
}

.custom-note {
  max-width: 16rem;
  margin: -0.3rem 0 0.6rem;
  color: var(--text-muted);
  font-size: var(--text-xs);
  line-height: 1.45;
}

.panel-title {
  margin: 0 0 0.6rem;
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.swatches {
  display: flex;
  gap: 0.5rem;
  min-height: 28px;
  align-items: center;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgb(255 255 255 / 0.25);
  cursor: pointer;
  transition: transform 0.15s var(--ease-out);
}

.swatch:hover {
  transform: scale(1.1);
}

.swatch.chosen {
  box-shadow:
    0 0 0 2px var(--surface-solid),
    0 0 0 4px var(--text);
}

.swatch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.hint {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.actions:empty {
  display: none;
}
</style>
