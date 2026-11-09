<template>
  <section class="group">
    <header v-if="title || $slots.aside" class="group-header">
      <div>
        <h3 v-if="title" class="group-title">{{ title }}</h3>
        <p v-if="description" class="group-description">{{ description }}</p>
      </div>
      <slot name="aside" />
    </header>
    <div class="group-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title?: string; description?: string }>();
</script>

<style scoped>
.group + .group {
  margin-top: 1.75rem;
}

.group-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0.25rem 0.55rem;
}

.group-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
}

.group-description {
  margin-top: 0.15rem;
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.45;
}

.group-body {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface-raised);
  overflow: hidden;
}
</style>
