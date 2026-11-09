<template>
  <section ref="panel" class="look" role="dialog" aria-label="Wallpaper look">
    <SettingsRow title="Dim" stacked>
      <RangeSlider v-model="dimPercent" aria-label="Dim" :max="70" :format="(v) => (v ? `${v}%` : 'Off')" />
    </SettingsRow>
    <SettingsRow title="Blur" stacked>
      <RangeSlider v-model="settings.wallpaper.blur" aria-label="Blur" :max="30" :format="(v) => (v ? `${v}px` : 'Off')" />
    </SettingsRow>
    <SettingsRow title="Slow drift" description="Off automatically if you prefer reduced motion.">
      <ToggleSwitch v-model="settings.wallpaper.motion" aria-label="Slow drift" />
    </SettingsRow>
    <footer class="look-footer">
      <AppButton variant="primary" size="sm" label="Done" @click="endLookPreview" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';
import { storeToRefs } from 'pinia';
import AppButton from '@/components/base/AppButton.vue';
import RangeSlider from '@/components/base/RangeSlider.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useEventListener } from '@/composables/useEventListener';
import { useShell } from '@/composables/useShell';
import { useSettingsStore } from '@/stores/settings';

const { settings } = storeToRefs(useSettingsStore());
const { endLookPreview } = useShell();

const dimPercent = computed({
  get: () => Math.round(settings.value.wallpaper.dim * 100),
  set: (value: number) => (settings.value.wallpaper.dim = value / 100),
});

const panel = useTemplateRef('panel');
onMounted(() => panel.value?.querySelector<HTMLElement>('input, button')?.focus());
useEventListener(document, 'keydown', (event: KeyboardEvent) => event.key === 'Escape' && endLookPreview());
</script>

<style scoped>
.look {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
  width: min(320px, calc(100vw - 40px));
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--surface-solid);
  box-shadow: 0 30px 80px rgb(0 0 0 / 0.45);
  overflow: hidden;
}

.look-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1rem;
}
</style>
