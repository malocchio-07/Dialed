'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getWeather, findHourly, predictSunsetColor } from '@/lib/weather';
import { getSunTimes, getBestWindow, getSuggestedSettings, formatTime } from '@/lib/sun';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PhotoSpot } from '@/types';
import { X, Loader2 } from 'lucide-react';

type Props = {
  spot: PhotoSpot;
  onClose: () => void;
  onSaved: () => void;
};

export function PlanModal({ spot, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<{ sunTimes: ReturnType<typeof getSunTimes>; weather: Awaited<ReturnType<typeof getWeather>> } | null>(null);

  async function fetchPreview() {
    setFetching(true);
    try {
      const dt = new Date(date + 'T12:00:00');
      const sunTimes = getSunTimes(dt, spot.latitude, spot.longitude);
      const weather = await getWeather(spot.latitude, spot.longitude, date);
      setPreview({ sunTimes, weather });
    } finally {
      setFetching(false);
    }
  }

  async function save() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dt = new Date(date + 'T12:00:00');
      const sunTimes = preview?.sunTimes ?? getSunTimes(dt, spot.latitude, spot.longitude);
      const weather = preview?.weather;
      const cloudCover = weather?.cloud_cover ?? 0;
      const bestWindow = getBestWindow(sunTimes, cloudCover);
      const suggestedSettings = getSuggestedSettings(cloudCover, 'golden');

      await supabase.from('shoot_plans').insert({
        user_id: user.id,
        spot_id: spot.id,
        planned_date: date,
        sunrise: sunTimes.sunrise.toISOString(),
        sunset: sunTimes.sunset.toISOString(),
        golden_hour_morning: sunTimes.goldenHourMorning.start.toISOString(),
        golden_hour_evening: sunTimes.goldenHourEvening.start.toISOString(),
        blue_hour_morning: sunTimes.blueHourMorning.start.toISOString(),
        blue_hour_evening: sunTimes.blueHourEvening.start.toISOString(),
        cloud_cover: cloudCover,
        weather_summary: weather?.weather_description ?? null,
        best_window: bestWindow,
        suggested_settings: suggestedSettings,
        notes: notes || null,
      });

      onSaved();
    } finally {
      setLoading(false);
    }
  }

  const sunsetHour = preview?.weather ? findHourly(preview.weather, preview.sunTimes.sunset) : null;
  const sunsetColor = sunsetHour ? predictSunsetColor(sunsetHour) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Plan a shoot</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--muted)]">{spot.name}</p>

        <Input
          id="date"
          type="date"
          label="Date"
          value={date}
          onChange={e => { setDate(e.target.value); setPreview(null); }}
          min={today}
        />

        <Button variant="secondary" onClick={fetchPreview} loading={fetching} className="w-full">
          {fetching ? 'Fetching...' : 'Check light & weather'}
        </Button>

        {preview && (
          <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Sunrise" value={formatTime(preview.sunTimes.sunrise)} color="text-orange-400" />
              <Stat label="Sunset" value={formatTime(preview.sunTimes.sunset)} color="text-orange-400" />
              <Stat label="Golden (PM)" value={formatTime(preview.sunTimes.goldenHourEvening.start)} color="text-yellow-400" />
              <Stat label="Blue hour (PM)" value={formatTime(preview.sunTimes.blueHourEvening.start)} color="text-blue-400" />
            </div>
            {preview.weather && (
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted)] text-xs">Weather</span>
                  <span className="text-xs">{preview.weather.weather_description}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[var(--muted)] text-xs">Cloud cover</span>
                  <span className="text-xs">{preview.weather.cloud_cover}%</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[var(--muted)] text-xs">High temp</span>
                  <span className="text-xs">{Math.round(preview.weather.temperature)}°C</span>
                </div>
              </div>
            )}
            {sunsetColor && (
              <div className="pt-2 border-t border-[var(--border)] flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg shrink-0 border border-[var(--border)]"
                  style={{ background: sunsetColor.gradient }}
                />
                <div>
                  <p className="text-xs font-medium">{sunsetColor.label}</p>
                  <p className="text-xs text-[var(--muted)]">{sunsetColor.description}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-[var(--muted)] italic">{getBestWindow(preview.sunTimes, preview.weather?.cloud_cover ?? 0)}</p>
          </div>
        )}

        <Input
          id="plan-notes"
          label="Notes (optional)"
          placeholder="Car, concept, lens..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} loading={loading} className="flex-1">Save plan</Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={`text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}
