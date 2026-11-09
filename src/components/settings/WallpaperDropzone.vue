<template>
  <div v-if="upload.busy" class="progress" role="status">
    <div class="progress-head">
      <span>{{ upload.cancelled ? 'Finishing up…' : `Adding ${upload.done} of ${upload.total}` }}</span>
      <AppButton size="sm" variant="ghost" label="Cancel" :disabled="upload.cancelled" @click="cancel" />
    </div>
    <div class="progress-track"><div class="progress-fill" :style="{ width: `${(upload.done / upload.total) * 100}%` }" /></div>
  </div>
  <label v-else class="dropzone" :class="{ over: dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
    <input type="file" accept="image/*" multiple class="visually-hidden" @change="onPick" />
    <Icon icon="material-symbols:upload-rounded" class="dropzone-icon" />
    <span class="dropzone-text">
      <strong>Add images</strong>
      <span>Drop them here or click to choose. Hundreds at once is fine.</span>
    </span>
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import { useWallpaperUpload } from '@/composables/useWallpaperUpload';

const { state: upload, upload: addFiles, cancel } = useWallpaperUpload();
const dragging = ref(false);

const onDrop = (event: DragEvent) => {
  dragging.value = false;
  if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files);
};

const onPick = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) addFiles([...input.files]);
  input.value = '';
};
</script>

<style scoped>
.dropzone {
  /* Anchors the hidden file input: placed against the dialog, focusing it would scroll the whole dialog. */
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.9rem 1rem;
  border-radius: var(--radius-lg);
  border: 1.5px dashed var(--border-strong);
  cursor: pointer;
  transition:
    border-color var(--duration-fast),
    background var(--duration-fast);
}

.dropzone:hover,
.dropzone.over {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.dropzone:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.progress {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.progress-track {
  height: 6px;
  border-radius: 999px;
  background: var(--surface-hover);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--duration) var(--ease-out);
}

.dropzone-icon {
  flex-shrink: 0;
  font-size: 1.5rem;
  color: var(--accent);
}

.dropzone-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.dropzone-text strong {
  font-size: var(--text-sm);
  color: var(--text);
}
</style>
