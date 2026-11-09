export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });
const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * DAY],
  ['month', 30 * DAY],
  ['week', 7 * DAY],
  ['day', DAY],
  ['hour', HOUR],
  ['minute', MINUTE],
];

export const formatRelative = (timestamp: number, now = Date.now()): string => {
  const diff = timestamp - now;
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return relativeFormat.format(Math.trunc(diff / ms), unit);
  }
  return relativeFormat.format(0, 'second');
};

export const formatAge = (timestamp: number, now = Date.now()): string => {
  const diff = Math.max(0, now - timestamp);
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MINUTE))}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 365 * DAY) return `${Math.floor(diff / DAY)}d`;
  return `${Math.floor(diff / (365 * DAY))}y`;
};

export const formatCompact = (value: number): string => compactFormat.format(value);

export const startOfDay = (date: Date | number): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const addDays = (date: Date | number, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const isSameDay = (a: Date | number, b: Date | number): boolean => startOfDay(a).getTime() === startOfDay(b).getTime();

// Calendar days, whatever the time of day: 1 for tomorrow, -1 for yesterday.
export const daysBetween = (from: Date | number, to: Date | number): number => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);

export const uses12Hour = (format: 'auto' | '12' | '24'): boolean => {
  if (format !== 'auto') return format === '12';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? false;
};

const dateFormats = new Map<string, Intl.DateTimeFormat>();

// Cached: Intl constructors are expensive and clocks format every second.
export const dateFormat = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = JSON.stringify(options);
  let format = dateFormats.get(key);
  if (!format) dateFormats.set(key, (format = new Intl.DateTimeFormat(undefined, options)));
  return format;
};

export const formatTime = (date: Date | number, hour12: boolean, { seconds = false, timeZone }: { seconds?: boolean; timeZone?: string } = {}): string =>
  dateFormat({ hour: 'numeric', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12, timeZone }).format(date);

export const formatDayLabel = (date: Date | number, now = Date.now()): string => {
  const days = daysBetween(now, date);
  if (days === 0 || days === 1 || days === -1) return relativeFormat.format(days, 'day').replace(/^./, (c) => c.toUpperCase());
  return dateFormat({ weekday: 'short', day: 'numeric', month: 'short' }).format(date);
};
