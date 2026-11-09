<template>
  <SettingsRow
    v-if="token && shared"
    title="GitHub connected"
    description="Using your personal access token. Stored only on this device, never exported; shared by GitHub widgets."
  >
    <AppButton label="Disconnect" @click="disconnect" />
  </SettingsRow>
  <SettingsRow v-else-if="token" title="Token saved, not shared yet" :description="`${DATA_FEATURES.github.detail} Nothing is sent until you allow it.`">
    <AppButton variant="primary" label="Allow" @click="allow" />
    <AppButton label="Disconnect" @click="disconnect" />
  </SettingsRow>
  <SettingsRow
    v-else
    title="Personal access token"
    description="Classic token with “repo” and optionally “notifications” scope. Stored only on this device, never exported; shared by GitHub widgets."
    stacked
  >
    <!-- Saved on Connect, not per keystroke: every partial token would otherwise be tried against GitHub. -->
    <form class="token-form" @submit.prevent="connect">
      <input
        v-model.trim="draft"
        type="password"
        class="input"
        placeholder="ghp_… or github_pat_…"
        aria-label="GitHub token"
        autocomplete="off"
        spellcheck="false"
      />
      <AppButton type="submit" variant="primary" label="Connect" :disabled="!draft" />
    </form>
    <AppButton icon="material-symbols:open-in-new-rounded" label="Create token" @click="open" />
  </SettingsRow>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { requestPermissions } from '@/composables/usePermissions';
import { DATA_FEATURES, hasConsent } from '@/libs/dataConsent';
import { secrets } from '@/libs/secrets';
import { NEW_TOKEN_URL } from './api';

const token = computed(() => secrets.state.value.github);
const shared = computed(() => hasConsent('github'));
const draft = ref('');
const allow = () => requestPermissions({ consent: 'github' });

const connect = () => {
  secrets.state.value.github = draft.value;
  draft.value = '';
};

const disconnect = () => (secrets.state.value.github = '');

const open = () => window.open(NEW_TOKEN_URL, '_blank', 'noopener');
</script>

<style scoped>
.token-form {
  display: flex;
  flex: 1;
  gap: 0.5rem;
  min-width: 0;
}
</style>
