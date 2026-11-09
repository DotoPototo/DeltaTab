<template>
  <a :href="href" :target="settings.openLinksInNewTab ? '_blank' : undefined" rel="noopener noreferrer"><slot /></a>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';

defineProps<{ href: string }>();
const { settings } = storeToRefs(useSettingsStore());
</script>
