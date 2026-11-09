<template>
  <main class="storage-error" role="alert">
    <h1>Couldn’t read your saved data</h1>
    <p>
      Your settings, layout and notes are still there, but the browser didn’t let Delta Tab read them just now. Nothing can be changed until they load, so
      nothing is lost.
    </p>
    <AppButton variant="primary" label="Try again" @click="retry" />
  </main>
</template>

<script setup lang="ts">
import AppButton from '@/components/base/AppButton.vue';

// Editing defaults that can't be saved would look like it worked, then lose everything next tab.
const retry = () => location.reload();
</script>

<style scoped>
.storage-error {
  display: grid;
  place-content: center;
  justify-items: start;
  gap: 1rem;
  min-height: 100vh;
  max-width: 34rem;
  margin: 0 auto;
  padding: 1rem;
  color: var(--text);
}

h1 {
  margin: 0;
  font-size: var(--text-lg);
}

p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.55;
}
</style>
