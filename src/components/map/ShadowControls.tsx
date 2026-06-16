'use client';

import { Sun, X, Mountain, Moon } from 'lucide-react';
import { getSunTimes, getSunPosition, formatTime, getLightPhase, LIGHT_PHASE_LABEL } from '@/lib/sun';
import { cn } from '@/lib/utils';

type Props = {
  available: boolean;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  date: Date;
  onDateChange: (date: Date) => void;
  lat: number;
  lng: number;
  tilt: boolean;
  onTiltToggle: (value: boolean) => void;
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
  date,
  onDateChange,
  lat,
  lng,
  tilt,
  onTiltToggle,
}: Props) {
  // Collapsed pill
  if (!enabled) {
    return (
      <button
        onClick={() => available && onToggle(true)}
        disabled={!available}
        title={available ? 'Show sun & shade' : 'Add a ShadeMap key to enable shadows'}
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-colors',
          available
            ? 'bg-[var(--accent)] text-black hover:bg-[var(--accent-dim)]'
            : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] cursor-not-allowed'
        )}
      >
        <Sun className="w-4 h-4" strokeWidth={2} />
        {available ? 'Sun & shade' : 'Shadows (needs key)'}
      </button>
    );
  }

  const sun = getSunPosition(date, lat, lng);
  const altDeg = (sun.altitude * 180) / Math.PI;
  const azDeg = ((sun.azimuth * 180) / Math.PI + 180 + 360) % 360;
  const times = getSunTimes(date, lat, lng);

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

  const dateInputValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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

      <input
        type="date"
        value={dateInputValue}
        onChange={(e) => setDay(e.target.value)}
        className="mt-3 w-full rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}
