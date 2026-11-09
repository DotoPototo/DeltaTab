<template>
  <SettingsGroup title="Account">
    <TokenField />
  </SettingsGroup>

  <SettingsGroup title="Show">
    <SettingsRow title="Review requests" description="Pull requests waiting on your review.">
      <ToggleSwitch v-model="config.showReviews" aria-label="Review requests" />
    </SettingsRow>
    <SettingsRow title="Your pull requests" description="Open PRs you authored, with CI status.">
      <ToggleSwitch v-model="config.showMine" aria-label="Your pull requests" />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import ToggleSwitch from '@/components/base/ToggleSwitch.vue';
import SettingsGroup from '@/components/settings/SettingsGroup.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { useWidgetConfig } from '@/widgets/context';
import type { GitHubConfig } from './index';
import TokenField from './TokenField.vue';

const config = useWidgetConfig<GitHubConfig>();
</script>
