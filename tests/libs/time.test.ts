import { describe, test, expect } from 'bun:test';
import { DAY, HOUR, MINUTE, addDays, formatAge, formatDayLabel, formatRelative, formatTime, isSameDay, startOfDay } from '@/libs/time';

const NOW = new Date(2026, 9, 29, 12, 0, 0).getTime();

describe('formatAge', () => {
  test('rounds sub-minute ages up to 1m', () => {
    expect(formatAge(NOW - 5000, NOW)).toBe('1m');
  });

  test('picks the largest whole unit', () => {
    expect(formatAge(NOW - 42 * MINUTE, NOW)).toBe('42m');
    expect(formatAge(NOW - 5 * HOUR, NOW)).toBe('5h');
    expect(formatAge(NOW - 3 * DAY, NOW)).toBe('3d');
    expect(formatAge(NOW - 800 * DAY, NOW)).toBe('2y');
  });

  test('clamps future timestamps', () => {
    expect(formatAge(NOW + HOUR, NOW)).toBe('1m');
  });
});

describe('formatRelative', () => {
  test('formats past and future', () => {
    expect(formatRelative(NOW - 2 * HOUR, NOW)).toContain('2');
    expect(formatRelative(NOW + 3 * DAY, NOW)).toContain('3');
  });
});

describe('day helpers', () => {
  test('startOfDay zeroes the clock', () => {
    const d = startOfDay(NOW);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });

  test('addDays crosses month boundaries', () => {
    expect(addDays(new Date(2026, 9, 31), 1).getMonth()).toBe(10);
  });

  test('isSameDay', () => {
    expect(isSameDay(NOW, startOfDay(NOW))).toBe(true);
    expect(isSameDay(NOW, addDays(NOW, 1))).toBe(false);
  });

  test('formatDayLabel uses relative words near today', () => {
    expect(formatDayLabel(NOW, NOW).toLowerCase()).toBe('today');
    expect(formatDayLabel(addDays(NOW, 1), NOW).toLowerCase()).toBe('tomorrow');
  });
});

describe('formatTime in another time zone', () => {
  test('shows the wall-clock time of the given zone', () => {
    const instant = Date.UTC(2026, 9, 29, 10, 48); // 10:48 UTC
    expect(formatTime(instant, false, { timeZone: 'Asia/Tokyo' })).toBe('19:48');
    expect(formatTime(instant, false, { timeZone: 'Europe/London' })).toBe('10:48');
  });
});
