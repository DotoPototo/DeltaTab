<template>
  <SettingsGroup title="Services">
    <SettingsRow v-for="preset in PRESETS" :key="preset.id" :title="preset.name" :description="displayUrl(preset.url)">
      <ToggleSwitch :model-value="config.services.includes(preset.id)" :aria-label="preset.name" @update:model-value="toggle(preset.id)" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Other status pages" description="Any Statuspage-powered page, e.g. https://status.example.com.">
    <EditableList :items="config.custom" :item-key="(s) => s.id" empty="None yet." @remove="config.custom.splice($event, 1)" @submit="add">
      <template #item="{ item }">
        <strong>{{ item.name }}</strong>
        <span class="faint url">{{ item.url }}</span>
      </template>
      <template #add>
        <input v-model="name" class="input name-input" placeholder="Name" aria-label="Service name" />
        <input v-model="url" class="input" placeholder="https://status.example.com" aria-label="Status page address" />
        <AppButton type="submit" label="Add" :loading="checking" :disabled="!url.trim()" />
      </template>
    </EditableList>
    <p v-if="error" class="form-error settings-pad">{{ error }}</p>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import EditableList from '@/components/base/EditableList.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { errorMessage } from '@/libs/http';
import { useWidgetConfig } from '@/widgets/context';
import type { StatusConfig } from './index';
import { PRESETS, fetchStatus } from './services';

const config = useWidgetConfig<StatusConfig>();
const displayUrl = (url: string) => url.replace(/^https?:\/\//, '');
const name = ref('');
const url = ref('');
const checking = ref(false);
const error = ref<string>();

const toggle = (id: string) => {
  const index = config.value.services.indexOf(id);
  if (index >= 0) config.value.services.splice(index, 1);
  else config.value.services.push(id);
};

const add = async () => {
  error.value = undefined;
  checking.value = true;
  try {
    // Status pages are only read securely: a typed http:// address is tried over https.
    const typed = url.value.trim().replace(/^http:\/\//i, 'https://');
    const page = new URL(/^https:\/\//i.test(typed) ? typed : `https://${typed}`).origin;
    const service = { id: crypto.randomUUID(), name: name.value.trim() || new URL(page).hostname, url: page };
    await fetchStatus(service); // validates it's really a Statuspage
    config.value.custom.push(service);
    name.value = '';
    url.value = '';
  } catch (e) {
    error.value = `Couldn’t read a status page there (${errorMessage(e)})`;
  } finally {
    checking.value = false;
  }
};
</script>

<style scoped>
.name-input {
  max-width: 8rem;
}

.url {
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
