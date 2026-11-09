<template>
  <SettingsGroup title="Recognise" description="Which kinds of pages count as work you might want to get back to.">
    <SettingsRow v-for="recipe in RECIPES" :key="recipe.id" :icon="recipe.icon" :title="recipe.label" :description="hostOf(recipe.hostname)">
      <ToggleSwitch :model-value="!config.disabled.includes(recipe.id)" :aria-label="recipe.label" @update:model-value="toggle(recipe.id)" />
    </SettingsRow>
  </SettingsGroup>

  <SettingsGroup title="Your own sites" description="URLPattern syntax: “:name” captures a path segment, “*” matches anything.">
    <EditableList :items="config.custom" :item-key="(c) => c.id" empty="None yet." @remove="config.custom.splice($event, 1)" @submit="add">
      <template #item="{ item }">
        <strong>{{ item.label }}</strong>
        <code class="faint">{{ item.pattern }}</code>
      </template>
      <template #add>
        <input v-model="label" class="input label-input" placeholder="Label" aria-label="Label" />
        <input v-model="pattern" class="input" placeholder="wiki.acme.com/pages/:slug" aria-label="Address pattern" />
        <AppButton type="submit" label="Add" :disabled="!pattern.trim()" />
      </template>
    </EditableList>
    <p v-if="error" class="form-error settings-pad">{{ error }}</p>
  </SettingsGroup>

  <SettingsGroup title="History">
    <SettingsRow title="Look back" description="How far back to search your history.">
      <SegmentedControl v-model="config.days" size="sm" label="Look back" :options="[7, 14, 30, 90].map((d) => ({ value: d, label: `${d}d` }))" />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import EditableList from '@/components/base/EditableList.vue';
import SegmentedControl from '@/components/base/SegmentedControl.vue';
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useWidgetConfig } from '@/widgets/context';
import type { RecentConfig } from './index';
import { RECIPES, customRecipe } from './recipes';

const config = useWidgetConfig<RecentConfig>();
const label = ref('');
const pattern = ref('');
const error = ref<string>();

const hostOf = (hostname: string) => hostname.replace('{www.}?', '').replace('*.', '');

const toggle = (id: string) => {
  const { disabled } = config.value;
  const index = disabled.indexOf(id);
  if (index >= 0) disabled.splice(index, 1);
  else disabled.push(id);
};

const add = () => {
  error.value = undefined;
  const entry = { id: crypto.randomUUID(), label: label.value.trim(), pattern: pattern.value.trim() };
  try {
    customRecipe(entry);
  } catch {
    error.value = 'That pattern isn’t valid URLPattern syntax.';
    return;
  }
  config.value.custom.push(entry);
  label.value = '';
  pattern.value = '';
};
</script>

<style scoped>
.label-input {
  max-width: 8rem;
}
</style>
