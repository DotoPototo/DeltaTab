<template>
  <div class="clock" :class="`clock-${size}`">
    <time class="clock-time" :datetime="iso">{{ time }}</time>
    <div v-if="showDate" class="clock-date">{{ date }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useNow } from '@/composables/useNow';
import { dateFormat } from '@/libs/time';
import { useSettingsStore } from '@/stores/settings';

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; showDate?: boolean }>(), { size: 'lg', showDate: true });

const { settings, hour12 } = storeToRefs(useSettingsStore());
const now = useNow(settings.value.clock.seconds ? 'second' : 'minute');

const time = computed(() =>
  dateFormat({ hour: '2-digit', minute: '2-digit', second: settings.value.clock.seconds ? '2-digit' : undefined, hour12: hour12.value }).format(now.value)
);
const date = computed(() => dateFormat({ weekday: 'long', month: 'long', day: 'numeric' }).format(now.value));
const iso = computed(() => new Date(now.value).toISOString());
</script>

<style scoped>
.clock {
  text-align: center;
  color: white;
  text-shadow: 0 2px 10px rgb(0 0 0 / 0.5);
  user-select: none;
}

.clock-time {
  display: block;
  white-space: nowrap;
  font-size: clamp(4rem, 17vw, 10rem);
  font-weight: 500;
  line-height: 1;
}

.clock-date {
  font-size: clamp(1.1rem, 3.4vw, 2rem);
  opacity: 0.8;
}

.clock-md .clock-time {
  font-size: clamp(3.5rem, 12vw, 7rem);
}

.clock-md .clock-date {
  font-size: clamp(1rem, 2.6vw, 1.5rem);
}

.clock-sm .clock-time {
  font-size: clamp(3rem, 8vw, 4.5rem);
}

.clock-sm .clock-date {
  font-size: 1.15rem;
}
</style>
