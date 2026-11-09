<template>
  <div class="calendar">
    <div class="calendar-header">
      <button class="nav-btn" aria-label="Previous month" @click="go(-1)"><Icon icon="fa6-solid:chevron-left" /></button>
      <button
        class="month-year"
        :class="{ clickable: offset !== 0 }"
        :disabled="offset === 0"
        :title="offset ? 'Back to today' : undefined"
        @click="go(-offset)"
      >
        {{ title }}
      </button>
      <button class="nav-btn" aria-label="Next month" @click="go(1)"><Icon icon="fa6-solid:chevron-right" /></button>
    </div>
    <div class="calendar-grid-wrapper">
      <Transition :name="direction > 0 ? 'slide-left' : 'slide-right'">
        <!-- A static month (only holiday days take focus, to read their names), not an interactive grid. -->
        <div :key="offset" class="calendar-grid" :class="{ 'with-weeks': weekNumbers }" role="group" :aria-label="title">
          <span v-if="weekNumbers" class="day-label week-label">Wk</span>
          <span v-for="day in weekdays" :key="day.index" class="day-label" :class="{ weekend: weekend.has(day.index) }">{{ day.label }}</span>
          <template v-for="row in rows" :key="row.week">
            <span v-if="weekNumbers" class="week-number tabular">{{ row.week }}</span>
            <span
              v-for="cell in row.cells"
              :key="cell.key"
              class="calendar-day tabular"
              :class="{
                'other-month': !cell.inMonth,
                today: cell.today,
                weekend: cell.weekend,
                holiday: cell.holidays.length,
                regional: cell.holidays.length && cell.holidays.every((h) => !h.national),
              }"
              :title="holidayText(cell.holidays) || undefined"
              :tabindex="cell.holidays.length ? 0 : undefined"
              :aria-label="
                cell.holidays.length ? `${dateFormat({ day: 'numeric', month: 'long' }).format(cell.date)}: ${holidayText(cell.holidays, ', ')}` : undefined
              "
            >
              {{ cell.date.getDate() }}
            </span>
          </template>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Icon from '@/components/base/AppIcon.vue';
import { addDays, dateFormat, isSameDay } from '@/libs/time';
import { dateKey, isoWeek, weekdayName, type Holiday } from './holidays';

const holidayText = (holidays: Holiday[], separator = '\n') => holidays.map((h) => h.name + (h.national ? '' : ' (regional)')).join(separator);

const props = defineProps<{ now: number; firstDay: number; weekend: Set<number>; holidays: Map<string, Holiday[]>; weekNumbers: boolean }>();
const offset = defineModel<number>('offset', { default: 0 });
const direction = ref(1);

const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const index = (props.firstDay + i) % 7;
    return { index, label: weekdayName(index) };
  })
);

const anchor = computed(() => {
  const d = new Date(props.now);
  return new Date(d.getFullYear(), d.getMonth() + offset.value, 1);
});

const title = computed(() => dateFormat({ month: 'long', year: 'numeric' }).format(anchor.value));

const rows = computed(() => {
  const first = anchor.value;
  const start = addDays(first, -((first.getDay() - props.firstDay + 7) % 7));
  return Array.from({ length: 6 }, (_, r) => {
    const cells = Array.from({ length: 7 }, (_, c) => {
      const date = addDays(start, r * 7 + c);
      return {
        key: date.toDateString(),
        date,
        inMonth: date.getMonth() === first.getMonth(),
        today: isSameDay(date, props.now),
        weekend: props.weekend.has(date.getDay()),
        holidays: props.holidays.get(dateKey(date)) ?? [],
      };
    });
    return { week: isoWeek(cells[3]!.date), cells };
  });
});

const go = (delta: number) => {
  if (!delta) return;
  direction.value = Math.sign(delta);
  offset.value += delta;
};
</script>

<style scoped>
.calendar {
  container-type: size;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  user-select: none;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem;
}

.month-year {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  transition: color 0.2s ease;
}

.month-year:disabled {
  cursor: default;
}

.month-year.clickable:hover {
  color: var(--accent);
}

.nav-btn {
  display: flex;
  padding: 0.4rem;
  border-radius: var(--radius);
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background: var(--surface-raised);
  color: var(--accent);
}

.calendar-grid-wrapper {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: auto repeat(6, minmax(0, 1fr));
  gap: 2px;
  height: 100%;
}

.calendar-grid.with-weeks {
  grid-template-columns: 2.2rem repeat(7, 1fr);
}

.day-label {
  padding: 0.25rem 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  color: var(--text-muted);
}

.day-label.weekend {
  color: var(--text-faint);
}

.week-label,
.week-number {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--text-faint);
}

.calendar-day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  font-size: 0.85rem;
  color: var(--text);
  transition: background 0.2s ease;
}

.calendar-day:hover {
  background: var(--surface-raised);
}

.calendar-day.weekend {
  background: color-mix(in oklab, var(--surface-raised) 70%, transparent);
  color: var(--text-muted);
}

.calendar-day.other-month {
  color: var(--text-faint);
  opacity: 0.5;
}

.calendar-day.holiday::after {
  content: '';
  position: absolute;
  bottom: 12%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}

.calendar-day.holiday {
  color: var(--accent);
  font-weight: 600;
  cursor: help;
}

.calendar-day.regional {
  color: var(--text);
  font-weight: 400;
}

.calendar-day.regional::after {
  opacity: 0.5;
}

.calendar-day.today {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.calendar-day.today.holiday::after {
  background: var(--accent-text);
}

@container (max-height: 240px) {
  .calendar-header {
    padding: 0;
  }

  .day-label {
    padding: 0;
    font-size: 0.68rem;
  }

  .calendar-day {
    font-size: 0.72rem;
    line-height: 1;
  }

  .calendar-day.holiday::after {
    bottom: 1px;
  }
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  position: absolute;
  inset: 0;
  transition: all 0.25s ease-out;
}

.slide-left-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to,
.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
