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
