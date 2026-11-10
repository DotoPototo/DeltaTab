<template>
  <WidgetCard>
    <div class="calendar-widget">
      <MonthView
        v-model:offset="offset"
        :now="now"
        :first-day="firstDay"
        :weekend="weekend"
        :holidays="holidays"
        :week-numbers="config.weekNumbers"
        class="month"
      />
      <p v-if="config.country && resource.error" class="holidays-note" role="status">
        Holidays unavailable{{ resource.data ? ' (showing the last ones loaded)' : '' }}.
        <button type="button" class="link-btn" @click="resource.refresh()">Retry</button>
      </p>
      <p v-if="nextHoliday" class="next">
        <Icon icon="fa6-solid:star" class="next-icon" />
        <span class="next-label">{{ nextHoliday.days === 0 ? 'Today' : 'Next' }}</span>
        <span class="next-name">{{ nextHoliday.name }}</span>
        <span class="next-when tabular">{{ nextHoliday.when }}</span>
      </p>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from '@/components/base/AppIcon.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { daysBetween, formatDayLabel } from '@/libs/time';
import { dateKey } from './holidays';
import MonthView from './MonthView.vue';
import { useCalendar } from './useCalendar';

const { config, firstDay, weekend, holidays, now, offset, resource } = useCalendar();

const nextHoliday = computed(() => {
  const today = dateKey(new Date(now.value));
  // Regional holidays (e.g. Scotland-only) are marked on the grid but don't count as "next".
  const [next] = [...holidays.value].filter(([date, list]) => date >= today && list.some((h) => h.national)).sort(([a], [b]) => a.localeCompare(b));
  if (!next) return undefined;
  const [date, list] = next;
  // A date-only ISO string parses as UTC; with a time it parses as local, which is what's wanted.
  const when = new Date(`${date}T00:00`);
  const days = daysBetween(now.value, when);
  return {
    name: list
      .filter((h) => h.national)
      .map((h) => h.name)
      .join(' · '),
    days,
    when: days === 0 ? '' : `${formatDayLabel(when, now.value)}${days > 1 ? ` · in ${days} days` : ''}`,
  };
});
</script>

<style scoped>
.calendar-widget {
  container-type: size;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  height: 100%;
}

/* Below this the weeks would overlap, so the card scrolls instead. */
.month {
  flex: 1;
  min-height: 7.5rem;
}

.holidays-note {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.link-btn {
  padding: 0;
  color: var(--accent);
  text-decoration: underline;
  cursor: pointer;
}

.link-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.next {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
}

.next-icon {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--accent);
}

.next-label {
  flex-shrink: 0;
  color: var(--text-muted);
}

.next-name {
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.next-when {
  flex-shrink: 0;
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@container (max-height: 159px) {
  .next {
    display: none;
  }
}
</style>
