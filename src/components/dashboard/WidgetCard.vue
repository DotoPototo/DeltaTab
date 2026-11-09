<template>
  <article class="card">
    <header class="card-header">
      <Icon :icon="widget.definition.icon" class="card-icon" />
      <h2 class="card-title" :title="cardTitle">{{ cardTitle }}</h2>
      <div class="card-actions">
        <slot name="actions" />
        <IconButton
          v-if="resource"
          class="card-refresh"
          size="sm"
          icon="material-symbols:refresh-rounded"
          :label="updatedLabel"
          :spinning="resource.loading"
          @click="resource.refresh()"
        />
        <IconButton
          v-if="widget.definition.settings"
          class="card-settings"
          size="sm"
          icon="material-symbols:tune-rounded"
          label="Widget settings"
          @pointerenter="widget.definition.settings.prefetch()"
          @focus="widget.definition.settings.prefetch()"
          @click="widget.openSettings()"
        />
      </div>
    </header>
    <div class="card-body">
      <div v-if="resource?.pending" class="skeleton" aria-busy="true" aria-label="Loading">
        <span v-for="n in 4" :key="n" class="skeleton-line" :style="{ width: `${92 - ((n * 17) % 40)}%` }" />
      </div>
      <EmptyState v-else-if="neverLoaded" compact icon="material-symbols:cloud-off-outline-rounded" title="Couldn’t load" :text="resource!.error">
        <AppButton size="sm" label="Try again" :loading="resource!.loading" @click="resource!.refresh()" />
      </EmptyState>
      <slot v-else />
    </div>
    <footer v-if="resource?.error && !neverLoaded" class="card-error" role="status">
      <Icon icon="material-symbols:warning-outline-rounded" />
      <span>{{ resource.error }}{{ resource.updatedAt ? ` · showing data from ${formatRelative(resource.updatedAt, now)}` : '' }}</span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import IconButton from '@/components/base/IconButton.vue';
import { useNow } from '@/composables/useNow';
import { formatRelative } from '@/libs/time';
import { useWidget } from '@/widgets/context';

interface CardResource {
  loading: boolean;
  pending?: boolean;
  error?: string;
  updatedAt?: number;
  refresh: () => unknown;
}

const props = defineProps<{
  title?: string;
  resource?: CardResource;
}>();

// Read through the context each time: a remote update replaces the instance object.
const widget = useWidget();
const now = useNow();

const cardTitle = computed(() => widget.instance.title?.trim() || props.title || widget.definition.name);
const neverLoaded = computed(() => !!props.resource?.error && !props.resource.updatedAt);
const updatedLabel = computed(() => (props.resource?.updatedAt ? `Refresh · updated ${formatRelative(props.resource.updatedAt, now.value)}` : 'Refresh'));
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 1rem;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  min-height: 2rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.card-icon {
  flex-shrink: 0;
  color: var(--accent);
  font-size: 1.05rem;
}

.card-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-muted);
}

.card-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  margin-left: auto;
}

.card-refresh,
.card-settings {
  opacity: 0;
  transition: opacity var(--duration-fast);
}

.card:hover :is(.card-refresh, .card-settings),
.card:focus-within :is(.card-refresh, .card-settings) {
  opacity: 1;
}

.card-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* The scrollbar sits in the card's padding, so content keeps its full width without one. */
  margin-right: -0.5rem;
  padding-right: 0.5rem;
}

.skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.5rem 0;
}

.skeleton-line {
  height: 0.7rem;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--surface-raised) 25%, var(--surface-hover) 50%, var(--surface-raised) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.card-error {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
  color: var(--warning);
  font-size: var(--text-xs);
}
</style>
