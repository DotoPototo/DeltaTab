import type { IconName } from '@/libs/icons';

interface Condition {
  label: string;
  day: IconName;
  night: IconName;
}

const condition = (label: string, day: IconName, night: IconName = day): Condition => ({ label, day, night });

const UNKNOWN = condition('Unknown', 'fa6-solid:cloud');

/** WMO weather interpretation codes, as used by Open-Meteo. */
const CODES: Record<number, Condition> = {
  0: condition('Clear', 'fa6-solid:sun', 'fa6-solid:moon'),
  1: condition('Mostly clear', 'fa6-solid:sun', 'fa6-solid:moon'),
  2: condition('Partly cloudy', 'fa6-solid:cloud-sun', 'fa6-solid:cloud-moon'),
  3: condition('Overcast', 'fa6-solid:cloud'),
  45: condition('Fog', 'fa6-solid:smog'),
  48: condition('Freezing fog', 'fa6-solid:smog'),
  51: condition('Light drizzle', 'fa6-solid:cloud-rain'),
  53: condition('Drizzle', 'fa6-solid:cloud-rain'),
  55: condition('Heavy drizzle', 'fa6-solid:cloud-rain'),
  56: condition('Freezing drizzle', 'fa6-solid:cloud-rain'),
  57: condition('Freezing drizzle', 'fa6-solid:cloud-rain'),
  61: condition('Light rain', 'fa6-solid:cloud-rain'),
  63: condition('Rain', 'fa6-solid:cloud-rain'),
  65: condition('Heavy rain', 'fa6-solid:cloud-showers-heavy'),
  66: condition('Freezing rain', 'fa6-solid:cloud-rain'),
  67: condition('Freezing rain', 'fa6-solid:cloud-showers-heavy'),
  71: condition('Light snow', 'fa6-solid:snowflake'),
  73: condition('Snow', 'fa6-solid:snowflake'),
  75: condition('Heavy snow', 'fa6-solid:snowflake'),
  77: condition('Snow grains', 'fa6-solid:snowflake'),
  80: condition('Showers', 'fa6-solid:cloud-sun-rain', 'fa6-solid:cloud-moon-rain'),
  81: condition('Heavy showers', 'fa6-solid:cloud-showers-heavy'),
  82: condition('Violent showers', 'fa6-solid:cloud-showers-heavy'),
  85: condition('Snow showers', 'fa6-solid:snowflake'),
  86: condition('Snow showers', 'fa6-solid:snowflake'),
  95: condition('Thunderstorm', 'fa6-solid:cloud-bolt'),
  96: condition('Thunderstorm, hail', 'fa6-solid:cloud-bolt'),
  99: condition('Thunderstorm, hail', 'fa6-solid:cloud-bolt'),
};

export const weatherLabel = (code: number) => (CODES[code] ?? UNKNOWN).label;

export const weatherIcon = (code: number, isDay = true): IconName => {
  const match = CODES[code] ?? UNKNOWN;
  return isDay ? match.day : match.night;
};

export const isPrecipitating = (code: number) => (code >= 51 && code <= 67) || (code >= 71 && code <= 77) || (code >= 80 && code <= 86) || code >= 95;
