<template>
  <section class="start" :class="{ covered: open }" :inert="open" @wheel.passive="onWheel">
    <div class="start-centre">
      <StartClock v-if="settings.start.clock" :key="String(settings.clock.seconds)" :size="settings.start.clockSize" :show-date="settings.start.date" />
      <!-- Hung below the clock rather than centred with it: glances arrive after first paint and would push it up. -->
      <div v-if="settings.start.glances" class="start-glances" :class="{ 'below-clock': settings.start.clock }">
        <GlanceBar />
      </div>
    </div>

    <footer class="start-footer">
      <AccentPicker v-if="current" class="start-accent" :wallpaper="current" />
      <WallpaperCredit v-if="current && settings.start.credit" class="start-credit" :wallpaper="current" />
      <span v-else-if="error" class="start-credit start-status">{{ error }}</span>
      <div class="start-actions">
        <IconButton v-if="canSkip" glass size="sm" icon="material-symbols:skip-next-rounded" label="Next wallpaper" @click="wallpaper.next()" />
        <IconButton v-if="canSave" glass size="sm" icon="material-symbols:bookmark-add-outline-rounded" label="Save to my wallpapers" @click="save" />
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import IconButton from '@/components/base/IconButton.vue';
import AccentPicker from '@/components/start/AccentPicker.vue';
import GlanceBar from '@/components/start/GlanceBar.vue';
import StartClock from '@/components/start/StartClock.vue';
import WallpaperCredit from '@/components/start/WallpaperCredit.vue';
import { useShell } from '@/composables/useShell';
import { useToast } from '@/composables/useToast';
import { isDaily } from '@/libs/wallpaper/library';
import { useSettingsStore } from '@/stores/settings';
import { useWallpaperStore } from '@/stores/wallpaper';

const { settings } = storeToRefs(useSettingsStore());
const wallpaper = useWallpaperStore();
const { current, library, source, error } = storeToRefs(wallpaper);
const { open } = useShell();
const toast = useToast();

const onWheel = (event: WheelEvent) => {
  if (event.deltaY > 30) open.value = true;
};

const canSkip = computed(() => source.value === 'library' && library.value.length > 1);
const canSave = computed(() => {
  const shown = current.value;
  return !!shown && isDaily(shown) && !library.value.some((w) => w.origin === shown.origin && w.day === shown.day);
});

const save = toast.attempt('Couldn’t save the wallpaper', async () => {
  await wallpaper.saveCurrent();
  toast.success('Saved to your wallpapers');
});
</script>

<style scoped>
.start {
  position: fixed;
  inset: 0;
  z-index: 1;
  transition: opacity 0.6s var(--ease-out);
}

/* Behind an open dashboard the big clock would show through translucent cards. */
.start.covered {
  opacity: 0;
}

.start-centre {
  /* Spans the full width: centring from left: 50% leaves the clock half the window, so it wraps. */
  position: fixed;
  top: 50%;
  inset-inline: 0;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  /* `translate`, not `transform`, which is centring it. */
  animation: start-in 1.4s cubic-bezier(0.25, 0.5, 0.25, 1) both;
}

@keyframes start-in {
  from {
    opacity: 0;
    translate: 0 18px;
  }
}

.start-glances {
  display: flex;
  justify-content: center;
}

.start-glances.below-clock {
  position: absolute;
  top: calc(100% + 1.5rem);
  inset-inline: 0;
}

.start-footer {
  position: fixed;
  left: 20px;
  right: 20px;
  bottom: 20px;
  display: grid;
  /* Equal side columns keep the credit centred on the page, whatever sits either side of it. */
  grid-template-columns: 1fr minmax(0, auto) 1fr;
  align-items: end;
  gap: 1rem;
  pointer-events: none;
}

.start-footer > * {
  pointer-events: auto;
}

.start-accent {
  justify-self: start;
}

.start-credit {
  grid-column: 2;
}

.start-status {
  padding: 6px 8px;
  border-radius: var(--radius);
  background: rgb(0 0 0 / 0.33);
  color: var(--text);
  font-size: 0.72rem;
  opacity: 0.7;
}

.start-actions {
  grid-column: 3;
  justify-self: end;
  display: flex;
  gap: 0.4rem;
  opacity: 0.5;
  transition: opacity 0.4s var(--ease-in-out);
}

.start-actions:hover,
.start-actions:focus-within {
  opacity: 1;
}
</style>
