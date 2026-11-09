<template>
  <div class="themes-wrap">
    <div class="themes" role="radiogroup" aria-label="Theme" @keydown="onRadioKeydown">
      <button
        v-for="theme in THEMES"
        :key="theme.id"
        role="radio"
        class="theme"
        :class="{ active: model === theme.id }"
        :aria-checked="model === theme.id"
        :tabindex="model === theme.id ? 0 : -1"
        @click="model = theme.id"
      >
        <span class="preview" :data-theme="theme.id" aria-hidden="true">
          <span class="preview-card">
            <span class="preview-heading" />
            <span class="preview-line" />
            <span class="preview-line short" />
          </span>
          <span class="preview-card">
            <span class="preview-heading" />
            <span class="preview-line" />
            <span class="preview-accent" />
          </span>
        </span>
        <span class="theme-label">
          <Icon v-if="model === theme.id" icon="material-symbols:check-rounded" />
          {{ theme.label }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onRadioKeydown } from '@/libs/radioGroup';
import Icon from '@/components/base/AppIcon.vue';
import { THEMES, type ThemeId } from '@/libs/settings';

const model = defineModel<ThemeId>({ required: true });
</script>

<style scoped>
.themes-wrap {
  container-type: inline-size;
}

.themes {
  display: grid;
  /* Even rows: 4 across when they fit, else 2, else 1 (never 4 + 2). */
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
  padding: 1rem;
}

@container (min-width: 300px) {
  .themes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (min-width: 580px) {
  .themes {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.theme {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
}

.preview {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 5px;
  aspect-ratio: 16 / 10;
  padding: 7px;
  border-radius: var(--radius-lg);
  border: 2px solid var(--border);
  background: linear-gradient(var(--scrim), var(--scrim)), linear-gradient(135deg, #4b6a88, #7a5c3e 60%, #2f3b2a);
  transition:
    border-color var(--duration-fast),
    transform var(--duration-fast);
}

.theme:hover .preview {
  transform: translateY(-1px);
  border-color: var(--border-strong);
}

.theme.active .preview {
  border-color: var(--accent);
}

.preview-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-radius: 4px;
  background: var(--surface);
}

.preview-heading,
.preview-line,
.preview-accent {
  height: 4px;
  border-radius: 2px;
}

.preview-heading {
  width: 60%;
  background: var(--text-muted);
}

.preview-line {
  background: var(--text);
  opacity: 0.45;
}

.preview-line.short {
  width: 55%;
}

.preview-accent {
  width: 40%;
  margin-top: auto;
  background: var(--accent);
}

.theme-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.theme.active .theme-label {
  color: var(--text);
  font-weight: 600;
}

.theme-label :deep(svg) {
  color: var(--accent);
}
</style>
