<template>
  <SettingsGroup title="Sites">
    <SettingsRow title="Include most visited" description="Read locally from your browser. Hover a tile to hide it.">
      <ToggleSwitch v-model="config.topSites" aria-label="Include most visited" />
    </SettingsRow>
    <SettingsRow v-if="config.hidden.length" title="Hidden sites" :description="`${config.hidden.length} hidden from most visited`">
      <AppButton size="sm" label="Show again" @click="config.hidden = []" />
    </SettingsRow>
    <SettingsRow title="Style">
      <SegmentedControl
        v-model="config.style"
        size="sm"
        label="Style"
        :options="[
          { value: 'tiles', label: 'Tiles' },
          { value: 'icons', label: 'Icons' },
          { value: 'list', label: 'List' },
        ]"
      />
    </SettingsRow>
    <SettingsRow title="Maximum">
      <SegmentedControl v-model="config.max" size="sm" label="Maximum" :options="[6, 8, 12, 18].map((n) => ({ value: n, label: String(n) }))" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Pinned" description="Always shown first. Titles are editable.">
    <EditableList :items="config.pinned" :item-key="(s) => s.url" empty="Nothing pinned." @remove="config.pinned.splice($event, 1)" @submit="add">
      <template #item="{ item }">
        <SiteIcon :url="item.url" :size="18" />
        <input v-model="item.title" class="input inline-input" aria-label="Title" />
        <span class="faint url">{{ item.url }}</span>
      </template>
      <template #add>
        <input v-model="url" class="input" placeholder="github.com" aria-label="Site address" />
        <AppButton type="submit" icon="material-symbols:add-rounded" label="Pin" :disabled="!url.trim()" />
      </template>
    </EditableList>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import EditableList from '@/components/base/EditableList.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import SiteIcon from '@/components/base/SiteIcon.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { siteName } from '@/libs/text';
import { useWidgetConfig } from '@/widgets/context';
import type { ShortcutsConfig } from './index';

const config = useWidgetConfig<ShortcutsConfig>();
const url = ref('');

const add = () => {
  const input = url.value.trim();
  try {
    const href = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).toString();
    if (!config.value.pinned.some((s) => s.url === href)) config.value.pinned.push({ url: href, title: siteName(href) });
    url.value = '';
  } catch {
    // Invalid URL: leave the input for the user to fix.
  }
};
</script>

<style scoped>
.inline-input {
  max-width: 9rem;
  padding: 0.25rem 0.5rem;
}

.url {
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
