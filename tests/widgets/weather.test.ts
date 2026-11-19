import { describe, test, expect } from 'bun:test';
import { HOUR } from '@/libs/time';
import { nextRain, nextSunEvent, type DayPoint, type HourPoint } from '@/widgets/weather/api';
import { isPrecipitating } from '@/widgets/weather/codes';

const day = (start: number, sunrise: number, sunset: number) => ({ time: start, sunrise: start + sunrise * HOUR, sunset: start + sunset * HOUR }) as DayPoint;

describe('nextSunEvent', () => {
  const today = day(0, 7, 17);
  const tomorrow = day(24 * HOUR, 7, 17);

  test('before dawn it is today’s sunrise', () => {
    expect(nextSunEvent([today, tomorrow], 4 * HOUR)).toEqual({ kind: 'sunrise', time: 7 * HOUR });
  });

  test('during the day it is sunset', () => {
    expect(nextSunEvent([today, tomorrow], 12 * HOUR)?.kind).toBe('sunset');
  });

  test('after sunset it is tomorrow’s sunrise', () => {
    expect(nextSunEvent([today, tomorrow], 20 * HOUR)).toEqual({ kind: 'sunrise', time: 31 * HOUR });
  });

  test('polar days with no events give nothing rather than the epoch', () => {
    const polar = { time: 0, sunrise: 0, sunset: 0 } as DayPoint;
    expect(nextSunEvent([polar, { ...polar, time: 24 * HOUR }], 12 * HOUR)).toBeUndefined();
  });
});

describe('isPrecipitating', () => {
  test('only falling rain, snow or thunder counts, never a clear sky or fog', () => {
    for (const code of [51, 61, 65, 71, 80, 82, 85, 95, 99]) expect(isPrecipitating(code)).toBe(true);
    for (const code of [0, 1, 2, 3, 45, 48]) expect(isPrecipitating(code)).toBe(false);
  });
});

describe('nextRain', () => {
  const hours = (...precip: number[]) => precip.map((p, i) => ({ time: (10 + i) * HOUR, precip: p }) as HourPoint);

  test('a probability stamped at the hour describes the hour before it', () => {
    expect(nextRain(hours(80, 0, 0), 10.5 * HOUR)).toBeUndefined();
    expect(nextRain(hours(0, 80, 0), 10.5 * HOUR)).toBe(10 * HOUR);
  });

  test('gives the start of the first wet hour ahead', () => {
    expect(nextRain(hours(0, 0, 0, 60), 10.5 * HOUR)).toBe(12 * HOUR);
  });

  test('ignores rain beyond the window or below the threshold', () => {
    expect(nextRain(hours(0, 0, 0, 0, 60), 10.5 * HOUR, 2)).toBeUndefined();
    expect(nextRain(hours(0, 40), 10.5 * HOUR)).toBeUndefined();
  });
});
