'use client';

import { Sunrise, Sunset, Sun } from 'lucide-react';
import { formatTime } from '@/lib/sun';
import type { SunTimes } from '@/types';

type Props = { sunTimes: SunTimes };

export function SunWidget({ sunTimes }: Props) {
  const rows = [
    { label: 'Blue hour (AM)', time: `${formatTime(sunTimes.blueHourMorning.start)} – ${formatTime(sunTimes.blueHourMorning.end)}`, color: 'text-blue-400' },
    { label: 'Sunrise', time: formatTime(sunTimes.sunrise), color: 'text-orange-400', icon: <Sunrise className="w-3.5 h-3.5" /> },
    { label: 'Golden hour (AM)', time: `${formatTime(sunTimes.goldenHourMorning.end)} – ${formatTime(sunTimes.goldenHourMorning.start)}`, color: 'text-yellow-400' },
    { label: 'Solar noon', time: formatTime(sunTimes.solarNoon), color: 'text-white', icon: <Sun className="w-3.5 h-3.5" /> },
    { label: 'Golden hour (PM)', time: `${formatTime(sunTimes.goldenHourEvening.start)} – ${formatTime(sunTimes.goldenHourEvening.end)}`, color: 'text-yellow-400' },
    { label: 'Sunset', time: formatTime(sunTimes.sunset), color: 'text-orange-400', icon: <Sunset className="w-3.5 h-3.5" /> },
    { label: 'Blue hour (PM)', time: `${formatTime(sunTimes.blueHourEvening.start)} – ${formatTime(sunTimes.blueHourEvening.end)}`, color: 'text-blue-400' },
  ];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
      <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Today&apos;s light</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map(({ label, time, color, icon }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {icon && <span className={color}>{icon}</span>}
              <span className="text-xs text-[var(--muted)]">{label}</span>
            </div>
            <span className={`text-xs font-medium ${color}`}>{time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
