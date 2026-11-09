import { fetchJson } from '@/libs/http';
import { HOUR } from '@/libs/time';

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface HourPoint {
  time: number;
  temp: number;
  precip: number;
  code: number;
  isDay: boolean;
}

export interface DayPoint {
  time: number;
  code: number;
  max: number;
  min: number;
  precip: number;
  sunrise: number;
  sunset: number;
}

export interface Forecast {
  current: { temp: number; feels: number; humidity: number; wind: number; code: number; isDay: boolean };
  hourly: HourPoint[];
  daily: DayPoint[];
  units: { temp: string; wind: string };
  timezone?: string;
}

interface ForecastResponse {
  timezone: string;
  current: Record<'temperature_2m' | 'apparent_temperature' | 'relative_humidity_2m' | 'wind_speed_10m' | 'weather_code' | 'is_day', number>;
  current_units: { temperature_2m: string };
  hourly: { time: number[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; weather_code: number[]; is_day: number[] };
  daily: {
    time: number[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    sunrise: number[];
    sunset: number[];
  };
}

export const fetchForecast = async ({ latitude, longitude }: WeatherLocation, imperial: boolean): Promise<Forecast> => {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    forecast_days: '7',
    forecast_hours: '25',
    timezone: 'auto',
    timeformat: 'unixtime',
    temperature_unit: imperial ? 'fahrenheit' : 'celsius',
    wind_speed_unit: imperial ? 'mph' : 'kmh',
  });
  const {
    timezone,
    current,
    current_units: currentUnits,
    hourly,
    daily,
  } = await fetchJson<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${params}`);
  const ms = (seconds: number) => seconds * 1000;

  return {
    current: {
      temp: current.temperature_2m,
      feels: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind: current.wind_speed_10m,
      code: current.weather_code,
      isDay: current.is_day === 1,
    },
    hourly: hourly.time.map((t, i) => ({
      time: ms(t),
      temp: hourly.temperature_2m[i]!,
      precip: hourly.precipitation_probability[i] ?? 0,
      code: hourly.weather_code[i]!,
      isDay: hourly.is_day[i] === 1,
    })),
    daily: daily.time.map((t, i) => ({
      time: ms(t),
      code: daily.weather_code[i]!,
      max: daily.temperature_2m_max[i]!,
      min: daily.temperature_2m_min[i]!,
      precip: daily.precipitation_probability_max[i] ?? 0,
      // Polar days and nights have no sunrise or sunset: 0 means "none".
      sunrise: ms(daily.sunrise[i] ?? 0),
      sunset: ms(daily.sunset[i] ?? 0),
    })),
    units: { temp: currentUnits.temperature_2m, wind: imperial ? 'mph' : 'km/h' },
    timezone,
  };
};

interface GeocodeResponse {
  results?: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
}

export interface PlaceResult extends WeatherLocation {
  id: number;
  detail: string;
}

export const searchPlaces = async (query: string, signal?: AbortSignal): Promise<PlaceResult[]> => {
  const params = new URLSearchParams({ name: query, count: '6', language: navigator.language.split('-')[0] ?? 'en' });
  const { results = [] } = await fetchJson<GeocodeResponse>(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
  }));
};

export const nextSunEvent = (daily: DayPoint[], now: number) =>
  daily
    .slice(0, 2)
    .flatMap((day) => [
      { kind: 'sunrise' as const, time: day.sunrise },
      { kind: 'sunset' as const, time: day.sunset },
    ])
    .find((event) => event.time > 0 && event.time > now);

export const nextRain = (hourly: HourPoint[], now: number, withinHours = 12, threshold = 50) =>
  hourly.find((h) => h.time + HOUR > now && h.time < now + withinHours * HOUR && h.precip >= threshold);
