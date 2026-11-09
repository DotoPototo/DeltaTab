import { describe, test, expect } from 'bun:test';
import { dateKey, holidayYears, isoWeek } from '@/widgets/calendar/holidays';

describe('calendar helpers', () => {
  test('dateKey pads and uses local dates', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('isoWeek handles year boundaries', () => {
    expect(isoWeek(new Date(2026, 9, 29))).toBe(44);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53); // Friday 1 Jan 2027 belongs to 2026-W53
    expect(isoWeek(new Date(2024, 11, 30))).toBe(1); // Monday 30 Dec 2024 is 2025-W01
  });
});

describe('holidayYears', () => {
  test('covers this year, next year and every year the month grid shows', () => {
    const now = new Date(2026, 10, 9);
    expect(holidayYears(now, new Date(2026, 10, 1))).toEqual([2026, 2027]);
    expect(holidayYears(now, new Date(2026, 0, 1))).toEqual([2025, 2026, 2027]); // January shows late December
    expect(holidayYears(now, new Date(2028, 11, 1))).toEqual([2026, 2027, 2028, 2029]); // December shows early January
    expect(holidayYears(now, new Date(2024, 5, 1))).toEqual([2024, 2026, 2027]);
  });
});
