import { computed, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { applyAccent, applyTheme, readBoot, writeBoot } from '@/libs/boot';
import { DEFAULT_ACCENT } from '@/libs/settings';
import { useSettingsStore } from '@/stores/settings';
import { useWallpaperStore } from '@/stores/wallpaper';

export const useAppearance = () => {
  const { settings } = storeToRefs(useSettingsStore());
  const { current, upcoming } = storeToRefs(useWallpaperStore());
  const bootAccent = readBoot().accent;

  const custom = computed(() => (settings.value.accent.source === 'custom' ? settings.value.accent.custom : undefined));
  const accent = computed(() => custom.value ?? current.value?.accent ?? bootAccent ?? DEFAULT_ACCENT);

  watchEffect(() => applyTheme(settings.value.theme));
  watchEffect(() => applyAccent(accent.value));
  // What the *next* tab should paint first: its wallpaper's accent, not this one's.
  watchEffect(() => writeBoot({ theme: settings.value.theme, accent: custom.value ?? upcoming.value?.accent ?? accent.value }));

  return { accent };
};
