<template>
  <WidgetCard>
    <EmptyState
      v-if="!rows.length"
      compact
      icon="material-symbols:schedule-outline-rounded"
      title="No time zones"
      text="Keep an eye on the time where your team is."
    >
      <AppButton size="sm" label="Add a city" @click="openSettings" />
    </EmptyState>
    <div v-else class="clocks" :class="`style-${config.style}`">
      <ul class="zones">
        <li v-for="row in rows" :key="row.tz" class="zone" :class="{ night: row.night }">
          <Icon :icon="row.night ? 'fa6-solid:moon' : 'fa6-solid:sun'" class="zone-icon" />
          <svg class="zone-face" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="face" cx="50" cy="50" r="46" />
            <line
              v-for="tick in 12"
              :key="tick"
              class="tick"
              :class="{ major: tick % 3 === 0 }"
              x1="50"
              y1="8"
              x2="50"
              :y2="tick % 3 === 0 ? 16 : 13"
              :transform="`rotate(${tick * 30} 50 50)`"
            />
            <line class="hand hour" x1="50" y1="50" x2="50" y2="28" :transform="`rotate(${row.hourAngle} 50 50)`" />
            <line class="hand minute" x1="50" y1="50" x2="50" y2="16" :transform="`rotate(${row.minuteAngle} 50 50)`" />
            <circle class="pin" cx="50" cy="50" r="3" />
          </svg>
          <div class="zone-name">
            <span class="zone-label">{{ row.label }}</span>
            <span class="zone-offset">{{ row.offset }}{{ row.dayShift }}</span>
          </div>
          <span class="zone-time tabular">{{ row.time }}</span>
          <span class="zone-day" :title="row.working ? 'Working hours' : 'Outside working hours'" aria-hidden="true">
            <span class="work" :style="{ left: `${(WORK_START / 24) * 100}%`, width: `${((WORK_END - WORK_START) / 24) * 100}%` }" />
            <span class="now" :style="{ left: `${row.dayFraction * 100}%` }" />
          </span>
        </li>
      </ul>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useNow } from '@/composables/useNow';
import { MINUTE, formatTime } from '@/libs/time';
import { zonedClock } from '@/libs/timezone';
import { useSettingsStore } from '@/stores/settings';
import { useWidget, useWidgetConfig } from '@/widgets/context';
import type { ClocksConfig } from './index';

const WORK_START = 9;
const WORK_END = 17;
const DAY_START = 7;
const NIGHT_START = 19;

const config = useWidgetConfig<ClocksConfig>();
const { openSettings } = useWidget();
const { hour12 } = storeToRefs(useSettingsStore());
const now = useNow();

const formatOffset = (minutes: number) => {
  if (minutes === 0) return 'Same time';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}h`;
};

const rows = computed(() => {
  const date = new Date(now.value);
  return config.value.zones.flatMap(({ tz, label }) => {
    try {
      const { offset, deviceOffset, hour, minute, weekday, dayShift: dayDiff } = zonedClock(tz, now.value);
      const weekend = weekday === 0 || weekday === 6;
      return [
        {
          tz,
          label,
          time: formatTime(date, hour12.value, { timeZone: tz }),
          offset: formatOffset(Math.round((offset - deviceOffset) / MINUTE)),
          dayShift: dayDiff ? ` · ${dayDiff > 0 ? 'tomorrow' : 'yesterday'}` : '',
          night: hour < DAY_START || hour >= NIGHT_START,
          working: hour >= WORK_START && hour < WORK_END && !weekend,
          dayFraction: (hour * 60 + minute) / 1440,
          hourAngle: (hour % 12) * 30 + minute / 2,
          minuteAngle: minute * 6,
        },
      ];
    } catch {
      return [];
    }
  });
});
</script>

<style scoped>
.clocks {
  container-type: size;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.zones {
  list-style: none;
}

.zone {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.45rem 0;
}

.zone + .zone {
  border-top: 1px solid var(--border);
}

.zone-icon {
  flex-shrink: 0;
  color: var(--warning);
  font-size: 0.85rem;
}

.zone.night .zone-icon {
  color: var(--text-faint);
}

.zone-face,
.zone-day {
  display: none;
}

.zone-name {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.zone-label {
  font-size: var(--text-sm);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zone-offset {
  font-size: var(--text-xs);
  color: var(--text-faint);
}

.zone-time {
  font-size: 1.35rem;
  font-weight: 300;
  letter-spacing: -0.02em;
}

@container (min-height: 200px) and (min-width: 300px) {
  .style-cards .zones,
  .style-analog .zones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 0.6rem;
  }

  .style-cards .zone,
  .style-analog .zone {
    position: relative;
    display: grid;
    padding: 0.8rem 0.85rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
  }

  .style-cards .zone {
    grid-template-columns: 1fr auto;
    grid-template-areas: 'name icon' 'time time' 'day day';
    row-gap: 0.35rem;
    align-items: center;
  }

  .style-cards .zone-name {
    grid-area: name;
  }

  .style-cards .zone-icon {
    grid-area: icon;
    align-self: start;
  }

  .style-cards .zone-time {
    grid-area: time;
    /* As large as the card allows, without wrapping "11:11 AM" onto two lines. */
    font-size: clamp(1.3rem, min(9cqh, 4.6cqw), 2.4rem);
    line-height: 1.1;
    white-space: nowrap;
  }

  .style-cards .zone-day {
    grid-area: day;
    position: relative;
    display: block;
    height: 6px;
    margin-top: 0.15rem;
    border-radius: 999px;
    background: var(--surface-hover);
  }

  .zone-day .work {
    position: absolute;
    inset-block: 0;
    border-radius: 999px;
    background: color-mix(in oklab, var(--accent) 35%, transparent);
  }

  .zone-day .now {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px var(--surface-raised);
    translate: -50% -50%;
  }

  .zone.night .zone-day .now {
    background: var(--text-faint);
  }

  .style-analog .zone {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    row-gap: 0.3rem;
  }

  .style-analog .zone-icon {
    position: absolute;
    top: 0.65rem;
    right: 0.7rem;
  }

  .style-analog .zone-face {
    display: block;
    width: clamp(4.5rem, 30cqh, 7.5rem);
    aspect-ratio: 1;
  }

  .style-analog .zone-name {
    align-items: center;
  }

  .style-analog .zone-time {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-muted);
  }

  .face {
    fill: var(--surface-hover);
    stroke: var(--border-strong);
    stroke-width: 1.5;
  }

  .zone.night .face {
    fill: var(--surface-sunken);
  }

  .tick {
    stroke: var(--text-faint);
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  .tick.major {
    stroke: var(--text-muted);
    stroke-width: 2.5;
  }

  .hand {
    stroke-linecap: round;
  }

  .hand.hour {
    stroke: var(--text);
    stroke-width: 5;
  }

  .hand.minute {
    stroke: var(--accent);
    stroke-width: 3;
  }

  .pin {
    fill: var(--accent);
  }
}
</style>
