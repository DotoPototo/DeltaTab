import { fetchJson, request } from '@/libs/http';
import { DAY, dateFormat } from '@/libs/time';

export interface Holiday {
  /** YYYY-MM-DD */
  date: string;
  name: string;
  national: boolean;
}

export interface Country {
  code: string;
  name: string;
}

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  global: boolean;
}

const API = 'https://date.nager.at/api/v3';

const fetchYear = async (country: string, year: number): Promise<Holiday[]> => {
  const response = await request(`${API}/PublicHolidays/${year}/${country}`);
  // 204 = country not covered.
  if (response.status === 204) return [];
  const holidays = (await response.json()) as NagerHoliday[];
  return holidays.map((h) => ({ date: h.date, name: h.name || h.localName, national: h.global }));
};

export const fetchHolidays = async (country: string, years: number[]): Promise<Holiday[]> =>
  (await Promise.all(years.map((year) => fetchYear(country, year)))).flat();

// This year and next (for "Next holiday"), plus every year the on-screen six-week grid touches.
export const holidayYears = (now: Date, viewed: Date) => {
  const year = viewed.getFullYear();
  const month = viewed.getMonth();
  const years = new Set([now.getFullYear(), now.getFullYear() + 1, year]);
  if (month === 0) years.add(year - 1);
  if (month === 11) years.add(year + 1);
  return [...years].sort((a, b) => a - b);
};

export const fetchCountries = async (): Promise<Country[]> =>
  (await fetchJson<{ countryCode: string; name: string }[]>(`${API}/AvailableCountries`)).map((c) => ({ code: c.countryCode, name: c.name }));

type WeekInfo = { firstDay: number; weekend: number[] };
const weekInfo = (): WeekInfo | undefined => {
  const locale = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };
  return locale.getWeekInfo?.() ?? locale.weekInfo;
};

/** Intl uses ISO weekdays (1 = Monday … 7 = Sunday); Date uses 0 = Sunday … 6 = Saturday. */
const fromIso = (day: number) => day % 7;

export const localeFirstDay = () => fromIso(weekInfo()?.firstDay ?? 1);
export const localeWeekend = () => (weekInfo()?.weekend ?? [6, 7]).map(fromIso);
export const localeCountry = () => new Intl.Locale(navigator.language).maximize().region ?? '';

// 7 Jan 2024 was a Sunday.
export const weekdayName = (day: number) => dateFormat({ weekday: 'short' }).format(new Date(2024, 0, 7 + day));

export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isoWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
};
