<template>
  <div v-if="!allowed" class="location-search consent">
    <p class="search-note">Weather sends the place you search for and choose to Open-Meteo, a free weather service, to find it and get its forecast.</p>
    <AppButton size="sm" variant="primary" label="Allow and search" @click="allow" />
  </div>
  <div v-else class="location-search">
    <div class="search-row">
      <input
        v-model="query"
        class="input"
        placeholder="Search for a city…"
        aria-label="City"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="results.length > 0"
        :aria-controls="listId"
        :aria-activedescendant="results.length ? `${listId}-${highlighted}` : undefined"
        @keydown="onKeydown"
      />
    </div>
    <ul v-if="results.length" :id="listId" class="results" role="listbox" aria-label="Places">
      <li
        v-for="(place, i) in results"
        :id="`${listId}-${i}`"
        :key="place.id"
        role="option"
        class="result"
        :class="{ highlighted: i === highlighted }"
        :aria-selected="i === highlighted"
        @pointerenter="highlighted = i"
        @click="choose(place)"
      >
        <Icon icon="material-symbols:location-on-outline-rounded" />
        <span class="result-name">{{ place.name }}</span>
        <span class="faint">{{ place.detail }}</span>
      </li>
    </ul>
    <p v-else-if="searching" class="search-note faint" role="status">Searching…</p>
    <p v-else-if="searched && !error" class="search-note faint" role="status">No places found</p>
    <p v-if="error" class="form-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import { requestPermissions } from '@/composables/usePermissions';
import { hasConsent } from '@/libs/dataConsent';
import { errorMessage } from '@/libs/http';
import { searchPlaces, type PlaceResult, type WeatherLocation } from './api';

const SEARCH_DELAY_MS = 250;

const emit = defineEmits<{ select: [location: WeatherLocation] }>();

const allowed = computed(() => hasConsent('weather'));
const allow = () => requestPermissions({ consent: 'weather' });

const listId = useId();
const query = ref('');
const results = ref<PlaceResult[]>([]);
const highlighted = ref(0);
const error = ref<string>();
const searching = ref(false);
const searched = ref(false);

// Every change, unmount or consent withdrawal cancels the previous search, so stale results never
// show and a debounced search is never sent.
watch([query, allowed], ([text], _, onCleanup) => {
  results.value = [];
  highlighted.value = 0;
  error.value = undefined;
  searched.value = false;
  searching.value = false;
  const q = text.trim();
  if (q.length < 2 || !allowed.value) return;
  const controller = new AbortController();
  const timer = setTimeout(async () => {
    searching.value = true;
    try {
      results.value = await searchPlaces(q, controller.signal);
      searched.value = true;
    } catch (e) {
      if (!controller.signal.aborted) error.value = errorMessage(e);
    } finally {
      if (!controller.signal.aborted) searching.value = false;
    }
  }, SEARCH_DELAY_MS);
  onCleanup(() => {
    clearTimeout(timer);
    controller.abort();
  });
});

const choose = ({ name, latitude, longitude }: WeatherLocation) => {
  emit('select', { name, latitude, longitude });
  query.value = '';
};

const onKeydown = (event: KeyboardEvent) => {
  const count = results.value.length;
  if (event.key === 'Enter') {
    event.preventDefault();
    const place = results.value[highlighted.value];
    if (place) choose(place);
  } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && count) {
    event.preventDefault();
    highlighted.value = (highlighted.value + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
  } else if (event.key === 'Escape' && query.value) {
    // Clear the search first; only a second Escape closes the surrounding dialog.
    event.preventDefault();
    event.stopPropagation();
    query.value = '';
  }
};
</script>

<style scoped>
.location-search {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.search-row {
  display: flex;
  gap: 0.5rem;
}

.results {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
}

.result.highlighted {
  background: var(--surface-hover);
}

.consent {
  display: grid;
  justify-items: start;
  gap: 0.6rem;
}

.search-note {
  font-size: var(--text-xs);
  padding: 0 0.1rem;
}

.result-name {
  font-weight: 500;
}
</style>
