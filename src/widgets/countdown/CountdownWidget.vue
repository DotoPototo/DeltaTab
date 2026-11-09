<template>
  <WidgetCard>
    <div class="countdowns">
      <ul v-if="bars.length" class="spans">
        <li v-for="bar in bars" :key="bar.span" class="span" :title="bar.left">
          <span class="span-label">{{ bar.label }}</span>
          <span class="span-track" aria-hidden="true"><span class="span-fill" :style="{ width: `${bar.percent}%` }" /></span>
          <svg class="span-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="ring-track" cx="50" cy="50" r="42" pathLength="100" />
            <circle class="ring-fill" cx="50" cy="50" r="42" pathLength="100" :stroke-dasharray="`${bar.percent} 100`" />
          </svg>
          <span
            class="span-value tabular"
            role="progressbar"
            :aria-valuenow="bar.percent"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`${bar.label}: ${bar.percent}% through, ${bar.left}`"
            >{{ bar.percent }}%</span
          >
          <span class="span-left">{{ bar.left }}</span>
        </li>
      </ul>

      <ul v-if="events.length" class="events">
        <li v-for="event in events" :key="event.id" class="event" :class="{ today: event.days === 0 }">
          <span class="event-days tabular">{{ event.days === 0 ? 'Today' : event.days }}</span>
          <span v-if="event.days > 0" class="event-unit">{{ event.days === 1 ? 'day' : 'days' }}</span>
          <span class="event-label">{{ event.label }}</span>
          <span class="event-date">{{ formatDate(event.date) }}</span>
        </li>
      </ul>
      <button v-else-if="bars.length" type="button" class="add-tile" @click="openSettings">
        <Icon icon="material-symbols:add-rounded" />
        Add a countdown
      </button>
      <EmptyState
        v-else
        compact
        icon="material-symbols:hourglass-empty-rounded"
        title="Nothing to count down"
        text="Track how far through the year you are, or the days until something."
      >
        <AppButton size="sm" label="Add a countdown" @click="openSettings" />
      </EmptyState>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '@/components/base/AppButton.vue';
import Icon from '@/components/base/AppIcon.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import WidgetCard from '@/components/dashboard/WidgetCard.vue';
import { useNow } from '@/composables/useNow';
import { dateFormat } from '@/libs/time';
import { useWidget, useWidgetConfig } from '@/widgets/context';
import { PROGRESS_SPANS, type CountdownConfig, type ProgressSpan } from './index';
import { parseLocalDate, spanProgress, spanRemaining, upcoming } from './progress';

// The year's label comes from the same clock as its progress, so a tab left open over New Year shows the new year.
const label = (span: ProgressSpan, at: number) => ({ day: 'Today', week: 'Week', month: 'Month', year: String(new Date(at).getFullYear()) })[span];

const config = useWidgetConfig<CountdownConfig>();
const { openSettings } = useWidget();
const now = useNow();

const bars = computed(() =>
  PROGRESS_SPANS.filter((span) => config.value.progress.includes(span)).map((span) => ({
    span,
    label: label(span, now.value),
    percent: Math.floor(spanProgress(span, now.value) * 100),
    left: spanRemaining(span, now.value),
  }))
);

const events = computed(() => upcoming(config.value.events, now.value));
const formatDate = (date: string) => dateFormat({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(parseLocalDate(date));
</script>

<style scoped>
.countdowns {
  container-type: size;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
}

.spans,
.events {
  list-style: none;
}

.span {
  display: grid;
  grid-template-columns: 3.4rem 1fr auto 2.6rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0;
  font-size: var(--text-xs);
}

.span-label {
  color: var(--text-muted);
}

.span-track {
  height: 6px;
  border-radius: 999px;
  background: var(--surface-hover);
  overflow: hidden;
}

.span-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in oklab, var(--accent) 60%, transparent), var(--accent));
  transition: width var(--duration-slow) var(--ease-out);
}

.span-ring {
  display: none;
}

.span-left {
  grid-column: 3;
  grid-row: 1;
  color: var(--text-faint);
  white-space: nowrap;
}

.span-value {
  grid-column: 4;
  grid-row: 1;
  text-align: right;
  font-weight: 600;
}

.events {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  padding-top: 0.4rem;
}

.event {
  display: grid;
  grid-template-columns: 2.6rem auto 1fr;
  grid-template-areas: 'days unit label' 'days unit date';
  align-items: center;
  column-gap: 0.5rem;
  padding: 0.3rem 0;
}

.event-days {
  grid-area: days;
  font-size: 1.35rem;
  font-weight: 300;
  text-align: right;
  color: var(--accent);
}

.event.today .event-days {
  font-size: var(--text-sm);
  font-weight: 600;
}

.event-unit {
  grid-area: unit;
  font-size: var(--text-xs);
  color: var(--text-faint);
}

.event-label {
  grid-area: label;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-date {
  grid-area: date;
  font-size: var(--text-xs);
  color: var(--text-faint);
}

.add-tile {
  display: none;
}

@container (min-height: 220px) and (min-width: 300px) {
  .spans {
    margin-top: auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
    gap: 0.6rem;
  }

  .span {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.8rem 0.5rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
  }

  .span-track {
    display: none;
  }

  .span-ring {
    display: block;
    width: clamp(4.5rem, 24cqh, 7.5rem);
    aspect-ratio: 1;
    transform: rotate(-90deg);
  }

  .ring-track,
  .ring-fill {
    fill: none;
    stroke-width: 7;
  }

  .ring-track {
    stroke: var(--surface-hover);
  }

  .ring-fill {
    stroke: var(--accent);
    stroke-linecap: round;
    transition: stroke-dasharray var(--duration-slow) var(--ease-out);
  }

  .span-value {
    position: absolute;
    top: calc(0.8rem + clamp(4.5rem, 24cqh, 7.5rem) / 2);
    left: 50%;
    translate: -50% -50%;
    font-size: clamp(1rem, 6cqh, 1.5rem);
    font-weight: 600;
  }

  .span-label {
    order: 2;
    margin-top: 0.3rem;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
  }

  .span-left {
    order: 3;
    font-size: var(--text-xs);
  }

  .events {
    margin-bottom: auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.6rem;
    border-top: 0;
    padding-top: 0;
  }

  .event {
    grid-template-columns: auto 1fr;
    grid-template-areas: 'days unit' 'label label' 'date date';
    align-items: baseline;
    row-gap: 0.15rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
  }

  .event-days {
    font-size: 2rem;
    line-height: 1.1;
    text-align: left;
  }

  .event.today .event-days {
    font-size: 1.4rem;
  }

  .add-tile {
    display: flex;
    flex: 1;
    min-height: 3.5rem;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    color: var(--text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    transition:
      border-color var(--duration-fast),
      color var(--duration-fast);
  }

  .add-tile:hover {
    border-color: var(--accent);
    color: var(--text);
  }

  .add-tile:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .span-fill,
  .ring-fill {
    transition: none;
  }
}
</style>
