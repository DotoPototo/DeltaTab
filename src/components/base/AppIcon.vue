<template>
  <component :is="ICONS[icon]" />
</template>

<script setup lang="ts">
import { ICONS, type IconName } from '@/libs/icons';

defineProps<{
  icon: IconName;
}>();
</script>
