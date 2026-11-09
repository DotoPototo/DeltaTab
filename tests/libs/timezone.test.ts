import { describe, test, expect } from 'bun:test';
import { HOUR } from '@/libs/time';
import { timeZoneOffset, zonedClock } from '@/libs/timezone';

describe('timezone', () => {
  test('offsets follow DST', () => {
    expect(timeZoneOffset('Europe/London', Date.UTC(2026, 6, 1))).toBe(HOUR);
    expect(timeZoneOffset('Europe/London', Date.UTC(2026, 11, 1))).toBe(0);
    expect(timeZoneOffset('America/New_York', Date.UTC(2026, 0, 15))).toBe(-5 * HOUR);
  });

  test('a zone clock ignores the device going through its own DST change', () => {
    const deviceZone = process.env.TZ;
    process.env.TZ = 'Europe/London';
    try {
      // 01:30 UTC on the morning the UK moves to BST: Los Angeles is still on the previous evening.
      const clock = zonedClock('America/Los_Angeles', Date.UTC(2026, 2, 29, 1, 30));
      expect(clock.deviceOffset).toBe(HOUR);
      expect([clock.hour, clock.minute, clock.weekday, clock.dayShift]).toEqual([18, 30, 6, -1]);
    } finally {
      process.env.TZ = deviceZone;
    }
  });
});
