<template>
  <SettingsRow :icon="definition.icon" :title="definition.name" :description="reason">
    <span v-if="granted" class="allowed"><Icon icon="material-symbols:check-rounded" /> {{ allowedLabel }}</span>
    <AppButton v-else size="sm" label="Allow" :disabled="granted === null" @click="request" />
  </SettingsRow>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import SettingsRow from '@/components/settings/SettingsRow.vue';
import { usePermissions } from '@/composables/usePermissions';
import { DATA_FEATURES } from '@/libs/dataConsent';
import type { AnyWidgetDefinition, WidgetInstance } from '@/widgets/types';

const props = withDefaults(defineProps<{ instance: WidgetInstance; definition: AnyWidgetDefinition; allowedLabel?: string }>(), { allowedLabel: 'Allowed' });

const spec = computed(() => props.definition.permissions?.(props.instance.config) ?? {});
const { granted, request } = usePermissions(spec);
const reason = computed(() => (spec.value.consent ? DATA_FEATURES[spec.value.consent].detail : props.definition.permissionReason));
</script>

<style scoped>
.allowed {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
