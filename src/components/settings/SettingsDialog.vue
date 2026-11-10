<template>
  <AppDialog v-model:open="settingsOpen" title="Settings" size="xl" bare class="settings">
    <nav ref="nav" class="sidebar" aria-label="Settings sections">
      <h2 class="sidebar-title">Settings</h2>
      <button
        v-for="item in SECTIONS"
        :key="item.id"
        class="nav-item"
        :class="{ active: item.id === active.id }"
        :aria-current="item.id === active.id ? 'page' : undefined"
        @click="settingsSection = item.id"
      >
        <span class="nav-icon"><Icon :icon="item.icon" /></span>
        {{ item.title }}
      </button>
      <!-- The release's own name ("1.0.0-beta"): Firefox's manifest can only carry the numeric part. -->
      <p class="version">Delta Tab {{ version }}</p>
    </nav>

    <div class="content">
      <header class="content-header">
        <h2>{{ active.title }}</h2>
        <IconButton icon="material-symbols:close-rounded" label="Close" :tooltip="false" @click="settingsOpen = false" />
      </header>
      <div ref="body" class="content-body">
        <component :is="active.component" :key="active.id" />
      </div>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch, type Component } from 'vue';
import { version } from '../../../package.json';
import Icon from '@/components/base/AppIcon.vue';
import AppDialog from '@/components/base/AppDialog.vue';
import IconButton from '@/components/base/IconButton.vue';
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue';
import BackgroundSettings from '@/components/settings/BackgroundSettings.vue';
import BehaviourSettings from '@/components/settings/BehaviourSettings.vue';
import TimeSettings from '@/components/settings/TimeSettings.vue';
import DataSettings from '@/components/settings/DataSettings.vue';
import StartScreenSettings from '@/components/settings/StartScreenSettings.vue';
import { useShell } from '@/composables/useShell';
import { useToast } from '@/composables/useToast';
import { useWallpaperUpload } from '@/composables/useWallpaperUpload';
import type { IconName } from '@/libs/icons';

const SECTIONS: { id: string; title: string; icon: IconName; component: Component }[] = [
  { id: 'appearance', title: 'Appearance', icon: 'fa-solid:paint-brush', component: AppearanceSettings },
  { id: 'background', title: 'Background', icon: 'material-symbols:wallpaper-rounded', component: BackgroundSettings },
  { id: 'start', title: 'Home Screen', icon: 'material-symbols:space-dashboard-outline-rounded', component: StartScreenSettings },
  { id: 'time', title: 'Time & Units', icon: 'fa6-solid:clock', component: TimeSettings },
  { id: 'behaviour', title: 'Behaviour', icon: 'material-symbols:tune-rounded', component: BehaviourSettings },
  { id: 'data', title: 'Data & Privacy', icon: 'material-symbols:database-outline', component: DataSettings },
];

const { settingsOpen, settingsSection, previewingLook } = useShell();

const { state: upload } = useWallpaperUpload();
const toast = useToast();
watch(settingsOpen, (open) => {
  if (!open && upload.busy && !previewingLook.value)
    toast.info('Still adding wallpapers', `${upload.done} of ${upload.total} done. Keep this tab open; you’ll see a message when it finishes.`);
});

const active = computed(() => SECTIONS.find((s) => s.id === settingsSection.value) ?? SECTIONS[0]!);
const body = useTemplateRef('body');
const nav = useTemplateRef('nav');

watch(active, async () => {
  await nextTick();
  body.value?.scrollTo({ top: 0 });
  nav.value?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
});
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  width: 230px;
  padding: 1.25rem 0.75rem;
  border-right: 1px solid var(--border);
  background: var(--surface-raised);
}

.sidebar-title {
  margin: 0 0.6rem 1rem;
  font-size: var(--text-lg);
  font-weight: 700;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius);
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-align: left;
  transition:
    background var(--duration-fast),
    color var(--duration-fast);
}

.nav-item:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.nav-item.active {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.nav-icon {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: var(--radius);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.85rem;
}

.nav-item.active .nav-icon {
  background: rgb(255 255 255 / 0.2);
  color: inherit;
}

.version {
  margin: auto 0.6rem 0;
  font-size: var(--text-xs);
  color: var(--text-faint);
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.25rem 0.75rem 2rem;
}

.content-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
}

.content-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem 2rem 2rem;
}

@media (max-width: 720px) {
  .settings.dialog-bare[open] {
    flex-direction: column;
  }

  .sidebar {
    flex-direction: row;
    width: auto;
    gap: 0.25rem;
    padding: 0.6rem 0.75rem;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border);
    scrollbar-width: none;
  }

  .sidebar-title,
  .version {
    display: none;
  }

  .nav-item {
    flex-shrink: 0;
    gap: 0.45rem;
    padding: 0.35rem 0.65rem 0.35rem 0.4rem;
    white-space: nowrap;
  }

  .content-header {
    padding: 0.9rem 1rem 0.5rem 1.25rem;
  }

  .content-body {
    padding: 0.5rem 1.25rem 1.5rem;
  }
}
</style>
