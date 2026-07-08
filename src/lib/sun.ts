import SunCalc from 'suncalc';
import type { SunTimes } from '@/types';

export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const times = SunCalc.getTimes(date, lat, lng);

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    goldenHourMorning: {
      start: times.goldenHourEnd, // SunCalc names are from photographer's POV — goldenHourEnd is end of morning golden hour
      end: times.sunrise,         // We reframe: morning golden = sunrise + ~1hr
    },
    goldenHourEvening: {
      start: times.goldenHour,    // evening golden hour start
      end: times.sunset,
    },
    blueHourMorning: {
      start: times.nauticalDawn,
      end: times.dawn,
    },
    blueHourEvening: {
      start: times.dusk,
      end: times.nauticalDusk,
    },
    solarNoon: times.solarNoon,
  };
}

export function getSunPosition(date: Date, lat: number, lng: number) {
  return SunCalc.getPosition(date, lat, lng);
}

export type LightPhase = 'night' | 'blueHour' | 'goldenHour' | 'day';

/** Sun altitude (degrees) thresholds shared by the time-slider readout and the map tint. */
export function getLightPhase(altitudeDeg: number): LightPhase {
  if (altitudeDeg < -6) return 'night';
  if (altitudeDeg < 0) return 'blueHour';
  if (altitudeDeg < 6) return 'goldenHour';
  return 'day';
}

export const LIGHT_PHASE_LABEL: Record<LightPhase, { label: string; textColor: string }> = {
  night: { label: 'Night', textColor: 'text-slate-400' },
  blueHour: { label: 'Twilight / blue hour', textColor: 'text-blue-400' },
  goldenHour: { label: 'Golden hour', textColor: 'text-yellow-400' },
  day: { label: 'Daytime', textColor: 'text-emerald-400' },
};

/** Color wash simulating ambient light, blended continuously by sun altitude.
 *  Day → golden → pink (sunset) → magenta → blue (twilight) → night. */
const TINT_STOPS: Array<{ alt: number; rgba: [number, number, number, number] }> = [
  { alt: 12,  rgba: [0, 0, 0, 0] },
  { alt: 6,   rgba: [255, 150, 60, 0.12] },
  { alt: 2,   rgba: [255, 120, 60, 0.20] },
  { alt: -1,  rgba: [236, 90, 130, 0.24] },
  { alt: -4,  rgba: [150, 70, 160, 0.26] },
  { alt: -7,  rgba: [30, 58, 138, 0.30] },
  { alt: -12, rgba: [8, 10, 30, 0.42] },
];

export function getLightTint(altitudeDeg: number): string {
  const stops = TINT_STOPS;
  if (altitudeDeg >= stops[0].alt) return 'rgba(0, 0, 0, 0)';
  const last = stops[stops.length - 1];
  if (altitudeDeg <= last.alt) {
    const [r, g, b, a] = last.rgba;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const hi = stops[i];
    const lo = stops[i + 1];
    if (altitudeDeg <= hi.alt && altitudeDeg > lo.alt) {
      const t = (hi.alt - altitudeDeg) / (hi.alt - lo.alt);
      const mix = hi.rgba.map((v, ch) => v + (lo.rgba[ch] - v) * t);
      return `rgba(${Math.round(mix[0])}, ${Math.round(mix[1])}, ${Math.round(mix[2])}, ${mix[3].toFixed(3)})`;
    }
  }
  return 'rgba(0, 0, 0, 0)';
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getBestWindow(sunTimes: SunTimes, cloudCover: number): string {
  const high = cloudCover > 70;
  const morning = `${formatTime(sunTimes.blueHourMorning.start)} – ${formatTime(sunTimes.goldenHourMorning.start)}`;
  const evening = `${formatTime(sunTimes.goldenHourEvening.start)} – ${formatTime(sunTimes.blueHourEvening.end)}`;

  if (high) {
    return `Overcast light all day — good for even tones. Try ${morning} or ${evening} for subtle color.`;
  }
  return `Morning golden: ${morning} · Evening golden: ${evening}`;
}

export function getSuggestedSettings(cloudCover: number, timeOfDay: 'golden' | 'blue' | 'midday' | 'night') {
  const base = {
    golden: {
      aperture: 'f/2.8–f/5.6',
      shutter_speed: '1/500–1/1000s',
      iso: '100–400',
      mode: 'Aperture Priority',
      tips: ['Expose for the highlights', 'Try backlit shots', 'Watch for lens flare opportunities'],
    },
    blue: {
      aperture: 'f/2.8–f/4',
      shutter_speed: '1/60–1/250s',
      iso: '400–1600',
      mode: 'Manual',
      tips: ['Balance ambient with any artificial light', 'Use a tripod if possible', 'Bracket exposures'],
    },
    midday: {
      aperture: 'f/8–f/11',
      shutter_speed: '1/1000–1/2000s',
      iso: '100',
      mode: 'Manual',
      tips: ['Find shade or use a diffuser', 'Shoot from low angles to avoid harsh shadows', 'Overcast is your friend'],
    },
    night: {
      aperture: 'f/1.8–f/2.8',
      shutter_speed: '1/30–1/125s',
      iso: '1600–6400',
      mode: 'Manual',
      tips: ['Use city lights for separation', 'Long exposure for light trails', 'Focus manually on details'],
    },
  };

  const settings = { ...base[timeOfDay] };

  if (cloudCover > 80 && timeOfDay === 'golden') {
    settings.tips = [
      'Heavy cloud cover — diffused light, great for color pop',
      'Lower contrast scenes work well for lighter cars',
      'Try underexposing 1/3 stop for moodier tones',
    ];
  }

  return settings;
}
