import type { WeatherData, HourlyWeather, SunsetColorPrediction } from '@/types';

const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

export async function getWeather(lat: number, lng: number, date?: string): Promise<WeatherData | null> {
  try {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lng.toString());
    url.searchParams.set(
      'hourly',
      'temperature_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,weather_code,wind_speed_10m'
    );
    url.searchParams.set('daily', 'weather_code,cloud_cover_mean,temperature_2m_max,wind_speed_10m_max');
    url.searchParams.set('start_date', targetDate);
    url.searchParams.set('end_date', targetDate);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = await res.json();
    const daily = data.daily;
    const hourly = data.hourly;

    const cloud_cover = daily.cloud_cover_mean?.[0] ?? 0;
    const weather_code = daily.weather_code?.[0] ?? 0;

    const hourlyData = (hourly.time as string[]).map((time: string, i: number) => ({
      time,
      cloud_cover: hourly.cloud_cover[i] ?? 0,
      cloud_cover_low: hourly.cloud_cover_low?.[i] ?? 0,
      cloud_cover_mid: hourly.cloud_cover_mid?.[i] ?? 0,
      cloud_cover_high: hourly.cloud_cover_high?.[i] ?? 0,
      relative_humidity: hourly.relative_humidity_2m?.[i] ?? 0,
      temperature: hourly.temperature_2m[i] ?? 0,
      weather_code: hourly.weather_code[i] ?? 0,
    }));

    return {
      cloud_cover,
      temperature: daily.temperature_2m_max?.[0] ?? 0,
      wind_speed: daily.wind_speed_10m_max?.[0] ?? 0,
      weather_code,
      weather_description: WMO_CODES[weather_code] ?? 'Unknown',
      hourly: hourlyData,
    };
  } catch {
    return null;
  }
}

export function getWeatherDescription(code: number): string {
  return WMO_CODES[code] ?? 'Unknown';
}

export function getShootabilityScore(cloudCover: number, weatherCode: number): {
  score: number;
  label: string;
  color: string;
} {
  const badWeather = [45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 95, 96, 99];
  if (badWeather.includes(weatherCode)) {
    return { score: 20, label: 'Poor', color: 'text-red-400' };
  }
  if (cloudCover < 20) return { score: 95, label: 'Perfect', color: 'text-emerald-400' };
  if (cloudCover < 40) return { score: 80, label: 'Great', color: 'text-green-400' };
  if (cloudCover < 60) return { score: 65, label: 'Good', color: 'text-yellow-400' };
  if (cloudCover < 80) return { score: 45, label: 'Decent', color: 'text-orange-400' };
  return { score: 30, label: 'Overcast', color: 'text-slate-400' };
}

/** The hourly forecast entry closest to a given time (e.g. sunset). */
export function findHourly(weather: WeatherData, target: Date): HourlyWeather | null {
  if (!weather.hourly.length) return null;
  return weather.hourly.reduce((closest, hour) =>
    Math.abs(new Date(hour.time).getTime() - target.getTime()) <
    Math.abs(new Date(closest.time).getTime() - target.getTime())
      ? hour
      : closest
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Heuristic for whether a sunset will be colorful, not just when it happens.
 * Dramatic color needs a clear path to the horizon (low low-cloud cover) plus
 * mid/high clouds to catch the light — too little cloud is flat, too much
 * blocks the sun outright. Humidity dulls saturation via haze.
 */
export function predictSunsetColor(hour: HourlyWeather): SunsetColorPrediction {
  const { cloud_cover_low: low, cloud_cover_mid: mid, cloud_cover_high: high, relative_humidity: humidity } = hour;

  // Chance of some mid/high cloud "canvas" being present.
  const upper = 100 - (1 - mid / 100) * (1 - high / 100) * 100;
  const canvas = upper <= 45 ? 20 + (upper / 45) * 80 : 100 - ((upper - 45) / 55) * 100;

  const lowFactor = clamp(1 - low / 100, 0.1, 1);
  const humidityFactor = clamp(1 - Math.max(0, humidity - 40) / 100, 0.5, 1);

  let score = clamp(canvas * lowFactor * humidityFactor, 0, 100);
  if (low >= 85) score = Math.min(score, 15);

  if (score >= 70) {
    return {
      score,
      label: 'Vivid colors likely',
      description: 'Clear path to the horizon with mid/high clouds to catch the light — good odds of deep orange, pink, or purple.',
      gradient: 'linear-gradient(135deg, #ff5e62, #ff9966, #6a3093)',
    };
  }
  if (score >= 45) {
    return {
      score,
      label: 'Some color possible',
      description: 'A milder show — expect soft amber and pink rather than a dramatic sky.',
      gradient: 'linear-gradient(135deg, #f6b93b, #fad390)',
    };
  }
  if (low >= 70) {
    return {
      score,
      label: 'Likely blocked',
      description: 'Heavy low cloud near the horizon will probably snuff out the color before it starts.',
      gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)',
    };
  }
  return {
    score,
    label: 'Likely bland',
    description: 'Either too clear or too overcast for a dramatic palette — expect flat, washed-out light.',
    gradient: 'linear-gradient(135deg, #cbd5c0, #cfd8dc)',
  };
}
