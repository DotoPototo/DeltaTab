<template>
  <SettingsGroup title="Theme">
    <ThemePicker v-model="settings.theme" />
  </SettingsGroup>

  <SettingsGroup title="Accent colour" description="Used for highlights, the clock, borders and buttons.">
    <SettingsRow title="Match the wallpaper" description="Pick a colour from each background image automatically.">
      <ToggleSwitch v-model="useWallpaper" aria-label="Match the wallpaper" />
    </SettingsRow>
    <SettingsRow v-if="!useWallpaper" title="Colour" stacked>
      <div class="accent-picker">
        <button
          v-for="colour in SWATCHES"
          :key="colour"
          class="swatch"
          :class="{ active: settings.accent.custom.toLowerCase() === colour }"
          :style="{ background: colour }"
          :aria-label="describeColour(colour)"
          :aria-pressed="settings.accent.custom.toLowerCase() === colour"
          @click="settings.accent.custom = colour"
        />
        <label class="custom" :class="{ active: !SWATCHES.includes(settings.accent.custom.toLowerCase()) }" title="Custom colour">
          <input v-model="settings.accent.custom" type="color" aria-label="Custom colour" />
        </label>
        <span class="hex tabular">{{ settings.accent.custom.toUpperCase() }}</span>
      </div>
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import ThemePicker from '@/components/settings/ThemePicker.vue';
import { describeColour } from '@/libs/accent';
import { useSettingsStore } from '@/stores/settings';

const SWATCHES = ['#c75782', '#bb5dbb', '#7158ca', '#4f54e8', '#458da5', '#718c4d', '#af9346', '#d0783c', '#a54545'];

const { settings } = storeToRefs(useSettingsStore());

const useWallpaper = computed({
  get: () => settings.value.accent.source === 'wallpaper',
  set: (value: boolean) => (settings.value.accent.source = value ? 'wallpaper' : 'custom'),
});
</script>

<style scoped>
.accent-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
}

.swatch,
.custom {
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  transition: transform var(--duration-fast);
}

.swatch:hover,
.custom:hover {
  transform: scale(1.1);
}

/* The colour input is invisible over its rainbow well: the well shows where keyboard focus is. */
.swatch:focus-visible,
.custom:has(input:focus-visible) {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}

.swatch.active,
.custom.active {
  box-shadow:
    0 0 0 2px var(--surface-solid),
    0 0 0 4px var(--text);
}

.custom {
  background: conic-gradient(#f44, #fd4, #4f8, #4cf, #84f, #f4c, #f44);
  cursor: pointer;
}

.custom input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.hex {
  margin-left: 0.25rem;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
