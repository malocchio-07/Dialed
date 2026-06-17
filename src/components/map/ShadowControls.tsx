'use client';

import { useEffect, useState } from 'react';
import { Sun, X, Mountain, Moon, Box, Cloud } from 'lucide-react';
import { getSunTimes, getSunPosition, formatTime, getLightPhase, LIGHT_PHASE_LABEL } from '@/lib/sun';
import { getWeather, findHourly, predictSunsetColor } from '@/lib/weather';
import type { WeatherData } from '@/types';
import { cn } from '@/lib/utils';

type Props = {
  /** Whether a ShadeMap key is configured — gates only the heavy 3D shadow sim. */
  available: boolean;
  /** Whether the sun/light panel is open (drives the tint + sunset forecast). */
  enabled: boolean;
  onToggle: (value: boolean) => void;
  /** Whether the heavy ShadeMap terrain/building shadow sim is on. */
  simEnabled: boolean;
  onSimToggle: (value: boolean) => void;
  date: Date;
  onDateChange: (date: Date) => void;
  lat: number;
  lng: number;
  tilt: boolean;
  onTiltToggle: (value: boolean) => void;
  cloudsOn: boolean;
  onCloudsToggle: (value: boolean) => void;
  cloudsAvailable: boolean;
};

function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function pct(minutes: number) {
  return (minutes / 1440) * 100;
}

export function ShadowControls({
  available,
  enabled,
  onToggle,
  simEnabled,
  onSimToggle,
  date,
  onDateChange,
  lat,
  lng,
  tilt,
  onTiltToggle,
  cloudsOn,
  onCloudsToggle,
  cloudsAvailable,
}: Props) {
  const dateInputValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getWeather(lat, lng, dateInputValue).then(w => { if (!cancelled) setWeather(w); });
    return () => { cancelled = true; };
  }, [enabled, lat, lng, dateInputValue]);

  const sun = getSunPosition(date, lat, lng);
  const altDeg = (sun.altitude * 180) / Math.PI;
  const azDeg = ((sun.azimuth * 180) / Math.PI + 180 + 360) % 360;
  const times = getSunTimes(date, lat, lng);

  const sunsetHour = weather ? findHourly(weather, times.sunset) : null;
  const sunsetColor = sunsetHour ? predictSunsetColor(sunsetHour) : null;

  // Collapsed pill
  if (!enabled) {
    return (
      <button
        onClick={() => onToggle(true)}
        title="Sun position, golden/blue hour tint, and sunset forecast"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-colors bg-[var(--accent)] text-black hover:bg-[var(--accent-dim)]"
      >
        <Sun className="w-4 h-4" strokeWidth={2} />
        Sun & light
      </button>
    );
  }

  const sunriseMin = minutesOfDay(times.sunrise);
  const sunsetMin = minutesOfDay(times.sunset);
  const value = minutesOfDay(date);

  const phase = LIGHT_PHASE_LABEL[getLightPhase(altDeg)];

  function setMinutes(min: number) {
    const next = new Date(date);
    next.setHours(Math.floor(min / 60), min % 60, 0, 0);
    onDateChange(next);
  }

  function setDay(value: string) {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return;
    const next = new Date(date);
    next.setFullYear(y, m - 1, d);
    onDateChange(next);
  }

  // Track gradient: night → dawn → day → dusk → night
  const track = `linear-gradient(to right,
    #0a0a1f 0%,
    #0a0a1f ${pct(sunriseMin - 40)}%,
    #1e3a5f ${pct(sunriseMin - 20)}%,
    #e8a23d ${pct(sunriseMin)}%,
    #fde68a ${pct(sunriseMin + 60)}%,
    #fef9c3 ${pct((sunriseMin + sunsetMin) / 2)}%,
    #fde68a ${pct(sunsetMin - 60)}%,
    #e8a23d ${pct(sunsetMin)}%,
    #1e3a5f ${pct(sunsetMin + 20)}%,
    #0a0a1f ${pct(sunsetMin + 40)}%,
    #0a0a1f 100%)`;

  return (
    <div className="absolute bottom-4 left-3 right-3 z-10 mx-auto max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {altDeg < 0 ? (
            <Moon className="w-4 h-4 text-blue-400" />
          ) : (
            <Sun className="w-4 h-4 text-yellow-400" />
          )}
          <span className="text-sm font-semibold">{formatTime(date)}</span>
          <span className={cn('text-xs font-medium', phase.textColor)}>{phase.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => cloudsAvailable && onCloudsToggle(!cloudsOn)}
            disabled={!cloudsAvailable}
            title={cloudsAvailable ? 'Toggle live cloud cover' : 'Add an OpenWeatherMap key to enable the cloud layer'}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
              !cloudsAvailable && 'opacity-40 cursor-not-allowed',
              cloudsOn ? 'bg-[var(--accent)] text-black' : 'text-[var(--muted)] hover:bg-[var(--card-hover)]'
            )}
          >
            <Cloud className="w-4 h-4" />
          </button>
          <button
            onClick={() => available && onSimToggle(!simEnabled)}
            disabled={!available}
            title={available ? 'Toggle 3D terrain & building shadows' : 'Add a ShadeMap key to enable 3D shadows'}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
              !available && 'opacity-40 cursor-not-allowed',
              simEnabled ? 'bg-[var(--accent)] text-black' : 'text-[var(--muted)] hover:bg-[var(--card-hover)]'
            )}
          >
            <Box className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTiltToggle(!tilt)}
            title="Toggle 3D tilt"
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
              tilt ? 'bg-[var(--accent)] text-black' : 'text-[var(--muted)] hover:bg-[var(--card-hover)]'
            )}
          >
            <Mountain className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggle(false)}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--muted)] hover:bg-[var(--card-hover)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Time slider */}
      <div className="relative mb-1">
        <div className="h-2 rounded-full" style={{ background: track }} />
        {/* Sunrise / sunset ticks */}
        {[
          { min: sunriseMin, label: '↑', title: 'Sunrise' },
          { min: sunsetMin, label: '↓', title: 'Sunset' },
        ].map(({ min, label, title }) => (
          <div
            key={title}
            title={title}
            className="absolute -top-1 text-[10px] leading-none text-white/80 -translate-x-1/2"
            style={{ left: `${pct(min)}%` }}
          >
            {label}
          </div>
        ))}
        <input
          type="range"
          min={0}
          max={1439}
          step={5}
          value={value}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="absolute inset-0 w-full h-2 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-[var(--accent)] [&::-webkit-slider-thumb]:shadow
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--accent)]"
        />
      </div>

      {/* Sun facts + date */}
      <div className="flex items-center justify-between mt-3 text-xs text-[var(--muted)]">
        <span>☀ {formatTime(times.sunrise)} · {formatTime(times.sunset)}</span>
        <span>
          {altDeg >= 0 ? `${Math.round(altDeg)}° high · ${Math.round(azDeg)}°` : 'Below horizon'}
        </span>
      </div>

      {/* Sunset color forecast, for this map location & date */}
      {sunsetColor && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] p-2">
          <div
            className="w-7 h-7 rounded shrink-0 border border-[var(--border)]"
            style={{ background: sunsetColor.gradient }}
          />
          <p className="text-xs leading-tight">
            <span className="font-medium">{sunsetColor.label}</span>
            <span className="text-[var(--muted)]"> — {sunsetColor.description}</span>
          </p>
        </div>
      )}

      <input
        type="date"
        value={dateInputValue}
        onChange={(e) => setDay(e.target.value)}
        className="mt-3 w-full rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}
