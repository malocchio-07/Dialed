'use client';

import { useEffect, useState } from 'react';
import { getSunTimes, getSunPosition, getLightPhase, LIGHT_PHASE_LABEL, formatTime } from '@/lib/sun';
import { getWeather } from '@/lib/weather';
import { celsiusToFahrenheit } from '@/lib/utils';

type Props = { lat: number; lng: number };

export function MapInfoBar({ lat, lng }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Round to 2 dp so a tiny pan doesn't trigger a new fetch.
  const rLat = Math.round(lat * 100) / 100;
  const rLng = Math.round(lng * 100) / 100;
  useEffect(() => {
    let cancelled = false;
    getWeather(rLat, rLng).then(w => { if (!cancelled && w) setTemp(w.temperature); });
    return () => { cancelled = true; };
  }, [rLat, rLng]);

  const sunTimes = getSunTimes(now, lat, lng);
  const altDeg = (getSunPosition(now, lat, lng).altitude * 180) / Math.PI;
  const phase = LIGHT_PHASE_LABEL[getLightPhase(altDeg)];

  const msToSunset = sunTimes.sunset.getTime() - now.getTime();
  const sunsetLabel =
    msToSunset > 0 && msToSunset < 6 * 3600_000
      ? `${Math.round(msToSunset / 60_000)}m to sunset`
      : `Sunset ${formatTime(sunTimes.sunset)}`;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-black/75 backdrop-blur-sm text-white text-xs shadow-lg pointer-events-none whitespace-nowrap">
      <span className="font-semibold text-sm">{formatTime(now)}</span>
      <span className="text-white/30">·</span>
      <span className={phase.textColor}>{phase.label}</span>
      {temp !== null && (
        <>
          <span className="text-white/30">·</span>
          <span>{celsiusToFahrenheit(temp)}°F</span>
        </>
      )}
      <span className="text-white/30">·</span>
      <span className="text-white/60">{sunsetLabel}</span>
    </div>
  );
}
