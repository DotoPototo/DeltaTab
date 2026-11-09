<template>
  <div class="hourly-chart" role="img" :aria-label="summary">
    <div class="plot">
      <svg class="chart" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient :id="gradientId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect v-for="bar in bars" :key="bar.x" class="precip" :x="bar.x - barWidth / 2" :y="H - bar.h" :width="barWidth" :height="bar.h" />
        <path :d="area" :fill="`url(#${gradientId})`" />
        <path class="line" :d="line" vector-effect="non-scaling-stroke" />
      </svg>
      <!-- Labels are HTML positioned over the (stretched) SVG so text never distorts. -->
      <span v-for="tick in ticks" :key="tick.x" class="temp tabular" :class="tick.align" :style="{ left: `${tick.left}%`, top: `${tick.top}%` }">
        {{ tick.temp }}
      </span>
    </div>
    <div class="axis">
      <span v-for="tick in ticks" :key="tick.x" class="time" :class="tick.align" :style="{ left: `${tick.left}%` }">
        {{ tick.time }}
        <span v-if="tick.precip >= 20" class="rain tabular">{{ tick.precip }}%</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { dateFormat } from '@/libs/time';
import type { HourPoint } from './api';

const props = defineProps<{ hours: HourPoint[]; hour12: boolean; timeZone?: string }>();

const W = 240;
const H = 100;
const TOP = 26;
const BOTTOM = 10;
const LABEL_EVERY = 4;
const MAX_BAR_HEIGHT = H * 0.35;
const gradientId = useId();

const points = computed(() => {
  const temps = props.hours.map((h) => h.temp);
  const min = Math.min(...temps);
  const span = Math.max(1, Math.max(...temps) - min);
  const step = W / Math.max(1, props.hours.length - 1);
  return props.hours.map((h, i) => ({ x: i * step, y: TOP + (1 - (h.temp - min) / span) * (H - TOP - BOTTOM), hour: h }));
});

const line = computed(() =>
  points.value.reduce((d, p, i, all) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = all[i - 1]!;
    return `${d} Q${prev.x},${prev.y} ${(prev.x + p.x) / 2},${(prev.y + p.y) / 2} T${p.x},${p.y}`;
  }, '')
);

const area = computed(() => `${line.value} L${W},${H} L0,${H} Z`);

const barWidth = computed(() => Math.max(2, W / Math.max(1, props.hours.length) - 2));
const bars = computed(() => points.value.filter((p) => p.hour.precip > 0).map((p) => ({ x: p.x, h: (p.hour.precip / 100) * MAX_BAR_HEIGHT })));

const ticks = computed(() =>
  points.value
    .filter((_, i) => i % LABEL_EVERY === 0)
    .map((p, i, all) => {
      let align = 'centre';
      if (i === 0) align = 'start';
      else if (i === all.length - 1 && p.x >= W - 1) align = 'end';
      return {
        x: p.x,
        left: (p.x / W) * 100,
        top: (p.y / H) * 100,
        align,
        temp: `${Math.round(p.hour.temp)}°`,
        precip: p.hour.precip,
        time: i === 0 ? 'Now' : dateFormat({ hour: 'numeric', hour12: props.hour12, timeZone: props.timeZone }).format(p.hour.time),
      };
    })
);

const summary = computed(() => {
  const temps = props.hours.map((h) => Math.round(h.temp));
  return `Next 24 hours: low ${Math.min(...temps)}°, high ${Math.max(...temps)}°`;
});
</script>

<style scoped>
.hourly-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.plot {
  position: relative;
  flex: 1;
  min-height: 50px;
}

.chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
}

.precip {
  fill: color-mix(in oklab, var(--info) 45%, transparent);
}

.temp {
  position: absolute;
  transform: translate(-50%, -135%);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.axis {
  position: relative;
  height: 2.1rem;
  margin-top: 0.35rem;
  border-top: 1px solid var(--border);
}

.time {
  position: absolute;
  top: 0.3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.rain {
  color: var(--info);
  font-size: 0.7rem;
}

.temp.start {
  transform: translate(0, -135%);
}

.time.start {
  align-items: flex-start;
  transform: none;
}

.temp.end {
  transform: translate(-100%, -135%);
}

.time.end {
  align-items: flex-end;
  transform: translateX(-100%);
}
</style>
