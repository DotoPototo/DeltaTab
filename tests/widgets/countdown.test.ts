import { describe, test, expect } from 'bun:test';
import { daysUntil, spanProgress, spanRemaining, upcoming } from '@/widgets/countdown/progress';

const NOON_THU = new Date(2026, 9, 29, 12).getTime(); // Thursday

describe('spanProgress', () => {
  test('day and week', () => {
    expect(spanProgress('day', NOON_THU)).toBeCloseTo(0.5, 2);
    // Monday 00:00 to Thursday 12:00 is 3.5 of 7 days
    expect(spanProgress('week', NOON_THU)).toBeCloseTo(0.5, 2);
  });

  test('late October is a little over 80% through the year', () => {
    const p = spanProgress('year', NOON_THU);
    expect(p).toBeGreaterThan(0.8);
    expect(p).toBeLessThan(0.85);
  });
});

describe('countdowns', () => {
  const events = [
    { id: 'a', label: 'Past', date: '2026-10-01' },
    { id: 'b', label: 'Later', date: '2026-12-25' },
    { id: 'c', label: 'Today', date: '2026-10-29' },
  ];

  test('daysUntil counts calendar days', () => {
    expect(daysUntil(events[2]!, NOON_THU)).toBe(0);
    expect(daysUntil(events[1]!, NOON_THU)).toBe(57);
  });

  test('upcoming drops past events and sorts', () => {
    expect(upcoming(events, NOON_THU).map((e) => e.label)).toEqual(['Today', 'Later']);
  });
});

describe('spanRemaining', () => {
  test('says what’s left of the day, week, month and year', () => {
    const at = new Date(2026, 10, 9, 15, 54).getTime(); // Monday 9 November 2026, 15:54
    expect(spanRemaining('day', at)).toBe('8h 6m left');
    expect(spanRemaining('week', at)).toBe('6 days left');
    expect(spanRemaining('month', at)).toBe('21 days left');
    expect(spanRemaining('year', at)).toBe('52 days left');
    expect(spanRemaining('year', new Date(2026, 11, 31, 9).getTime())).toBe('Last day');
    expect(spanRemaining('week', new Date(2026, 10, 14, 9).getTime())).toBe('1 day left'); // Saturday
  });
});
