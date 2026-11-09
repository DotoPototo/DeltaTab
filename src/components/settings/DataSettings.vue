<template>
  <SettingsGroup
    title="Backup"
    description="Your settings, layout and notes. Wallpapers, cached data and your GitHub token are left out, but notes and feed addresses can be private, so keep the file somewhere safe."
  >
    <SettingsRow title="Export" description="Download everything as a JSON file.">
      <AppButton size="sm" icon="material-symbols:download-rounded" label="Export" @click="exportBackup" />
    </SettingsRow>
    <SettingsRow title="Import" description="Replace your current settings with a backup.">
      <AppButton size="sm" icon="material-symbols:upload-rounded" label="Choose file" @click="fileInput?.click()" />
      <input ref="fileInput" type="file" accept="application/json,.json" class="visually-hidden" tabindex="-1" @change="onImport" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Cached data" description="Feeds, weather, releases and other downloaded data are kept so new tabs open instantly and work offline.">
    <SettingsRow title="Stored responses" :description="statsText">
      <AppButton size="sm" label="Clear" :disabled="!stats?.count" @click="clear" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Reset">
    <SettingsRow title="Reset to defaults" description="Theme, settings and layout go back to how they were on install. Notes and wallpapers are kept." danger>
      <AppButton size="sm" variant="danger" label="Reset" @click="reset" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup
    title="Privacy"
    description="No account, no analytics, no Delta Tab server. Settings, notes and wallpapers stay in this browser; history and top sites are only read here. Widgets fetch from the services they show, and wallpapers come from Bing or Wikimedia."
  />

  <SettingsGroup title="Sharing" description="These send something personal to an outside service, and only while switched on.">
    <SettingsRow v-for="feature in dataFeatures" :key="feature.id" :title="feature.title" :description="feature.detail">
      <ToggleSwitch :model-value="feature.allowed" :aria-label="`Let ${feature.title} share`" @update:model-value="(on) => setSharing(feature.id, on)" />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useConfirm } from '@/composables/useConfirm';
import { requestPermissions } from '@/composables/usePermissions';
import { useToast } from '@/composables/useToast';
import { cacheStats, clearCache } from '@/composables/useResource';
import { backupSections, downloadBackup, parseBackup, resetPreferences, restoreBackup } from '@/libs/backup';
import { DATA_FEATURES, hasConsent, revokeConsent, type DataFeature } from '@/libs/dataConsent';
import { undoReplacement, type Replacement } from '@/libs/persist';
import { describeError, formatBytes, joinList, plural } from '@/libs/text';
import { useDashboardStore } from '@/stores/dashboard';

const { confirm } = useConfirm();
const dashboard = useDashboardStore();
const toast = useToast();
const fileInput = useTemplateRef('fileInput');
const stats = ref<{ count: number; bytes: number }>();
const statsFailed = ref(false);

// Undo puts back only what the action changed, keeping anything edited since.
const undoTo = (replacement: Replacement) => ({ label: 'Undo', run: () => undoReplacement(replacement) });

const refreshStats = async () => {
  try {
    stats.value = await cacheStats();
    statsFailed.value = false;
  } catch {
    statsFailed.value = true;
  }
};
const statsText = computed(() => {
  if (stats.value) return `${plural(stats.value.count, 'item')} · ${formatBytes(stats.value.bytes)}`;
  return statsFailed.value ? 'Couldn’t read the cache size' : 'Calculating…';
});

const dataFeatures = computed(() => (Object.keys(DATA_FEATURES) as DataFeature[]).map((id) => ({ id, ...DATA_FEATURES[id], allowed: hasConsent(id) })));
// This click is the user gesture the browser's permission prompt needs.
const setSharing = toast.attempt('Couldn’t change that', async (feature: DataFeature, on: boolean) => {
  if (on) await requestPermissions({ consent: feature });
  else await revokeConsent(feature);
});
onMounted(refreshStats);

const exportBackup = toast.attempt('Couldn’t export', downloadBackup);

const clear = toast.attempt('Couldn’t clear cached data', async () => {
  await clearCache();
  await refreshStats();
  toast.success('Cached data cleared', 'Widgets are fetching fresh data.');
});

const onImport = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const backup = parseBackup(await file.text());
    const ok = await confirm({
      title: 'Import this backup?',
      message: `Your current ${joinList(backupSections(backup))} will be replaced with the ones in the backup from ${new Date(backup.exportedAt).toLocaleString()}.`,
      confirmLabel: 'Import',
    });
    if (!ok) return;
    // An open layout draft would otherwise overwrite the restored layout.
    dashboard.cancelEdit();
    const previous = await restoreBackup(backup);
    toast.add({ severity: 'success', summary: 'Backup imported', action: undoTo(previous), life: 10_000 });
  } catch (error) {
    toast.error('Couldn’t import that file', describeError(error));
  }
};

const reset = toast.attempt('Couldn’t reset your settings', async () => {
  const ok = await confirm({
    title: 'Reset to defaults?',
    message: 'Your theme, settings and dashboard layout go back to how they were on install. Notes and wallpapers are kept.',
    confirmLabel: 'Reset',
    danger: true,
  });
  if (!ok) return;
  dashboard.cancelEdit();
  const previous = await resetPreferences();
  toast.add({ severity: 'success', summary: 'Settings reset', action: undoTo(previous), life: 10_000 });
});
</script>
