import { MINUTE, daysBetween, startOfDay } from '@/libs/time';
import type { Countdown, ProgressSpan } from './index';

// [start, end) of the span containing `now`. Weeks start on Monday.
const bounds = (span: ProgressSpan, now: Date): [Date, Date] => {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (span) {
    case 'day': {
      const start = startOfDay(now);
      return [start, new Date(y, m, now.getDate() + 1)];
    }
    case 'week': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)];
    }
    case 'month':
      return [new Date(y, m, 1), new Date(y, m + 1, 1)];
    case 'year':
      return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
  }
};

export const spanProgress = (span: ProgressSpan, now: number): number => {
  const [start, end] = bounds(span, new Date(now));
  return (now - start.getTime()) / (end.getTime() - start.getTime());
};

export const spanRemaining = (span: ProgressSpan, now: number): string => {
  const [, end] = bounds(span, new Date(now));
  const left = end.getTime() - now;
  if (span === 'day') {
    const minutes = Math.max(0, Math.floor(left / MINUTE));
    const h = Math.floor(minutes / 60);
    return h ? `${h}h ${minutes % 60}m left` : `${minutes}m left`;
  }
  // Whole days after today; today itself is the last one when none follow.
  const days = daysBetween(now, end) - 1;
  if (days <= 0) return 'Last day';
  return days === 1 ? '1 day left' : `${days} days left`;
};

export const parseLocalDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

// Whole calendar days until the event: 0 is today, negative is past.
export const daysUntil = (event: Countdown, now: number) => daysBetween(now, parseLocalDate(event.date));

export const upcoming = (events: Countdown[], now: number) =>
  events
    .map((event) => ({ ...event, days: daysUntil(event, now) }))
    .filter((e) => e.days >= 0)
    .sort((a, b) => a.days - b.days);
