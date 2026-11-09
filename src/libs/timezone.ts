import { DAY, MINUTE } from '@/libs/time';

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string) => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

// Milliseconds, positive east of Greenwich.
export const timeZoneOffset = (timeZone: string, instant: number): number => {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)])
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - (instant - (instant % 1000));
};

export const zonedClock = (timeZone: string, instant: number) => {
  const offset = timeZoneOffset(timeZone, instant);
  // UTC getters: local ones would apply the device's own offset (and DST) on top.
  const wall = new Date(instant + offset);
  const deviceOffset = -new Date(instant).getTimezoneOffset() * MINUTE;
  const dayNumber = (ms: number) => Math.floor(ms / DAY);
  return {
    offset,
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    weekday: wall.getUTCDay(),
    dayShift: dayNumber(instant + offset) - dayNumber(instant + deviceOffset),
    deviceOffset,
  };
};
