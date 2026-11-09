<template>
  <SettingsGroup title="Repositories">
    <EditableList :items="config.repos" empty="No repositories yet." @remove="config.repos.splice($event, 1)" @submit="add">
      <template #item="{ item }">
        <SiteIcon :url="ownerUrl(item)" :size="16" />
        {{ item }}
      </template>
      <template #add>
        <input v-model="repo" class="input" placeholder="owner/repo or a GitHub URL" aria-label="Repository" />
        <AppButton type="submit" icon="material-symbols:add-rounded" label="Add" :disabled="!parsed" />
      </template>
    </EditableList>
  </SettingsGroup>

  <SettingsGroup title="Options">
    <SettingsRow title="Show prereleases" description="Betas and release candidates newer than the latest stable release.">
      <ToggleSwitch v-model="config.showPrereleases" aria-label="Show prereleases" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="GitHub access" description="Optional. Without a token GitHub allows 60 requests an hour, plenty for a dozen repos.">
    <TokenField />
  </SettingsGroup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import EditableList from '@/components/base/EditableList.vue';
import SiteIcon from '@/components/base/SiteIcon.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useWidgetConfig } from '@/widgets/context';
import TokenField from '@/widgets/github/TokenField.vue';
import { ownerUrl, parseRepo } from './api';
import type { ReleasesConfig } from './index';

const config = useWidgetConfig<ReleasesConfig>();
const repo = ref('');
const parsed = computed(() => parseRepo(repo.value));

const add = () => {
  if (parsed.value && !config.value.repos.includes(parsed.value)) config.value.repos.push(parsed.value);
  repo.value = '';
};
</script>
