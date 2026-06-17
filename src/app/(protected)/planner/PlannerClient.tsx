'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { useSearchParams } from 'next/navigation';
import type { ShootPlan, WeatherData, PhotoSpot, SunsetColorPrediction } from '@/types';
import { MapPin, Cloud, Sunrise, Sunset, Camera, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatTime, getSunTimes } from '@/lib/sun';
import { getShootabilityScore, getWeather, findHourly, predictSunsetColor } from '@/lib/weather';
import { localDateStr } from '@/lib/utils';
import { Suspense } from 'react';

type Spot = Pick<PhotoSpot, 'id' | 'name' | 'latitude' | 'longitude'>;
type Props = { plans: ShootPlan[]; spots: Spot[] };

function PlannerInner({ plans: initial, spots }: Props) {
  const params = useSearchParams();
  const highlightId = params.get('plan');

  const [plans, setPlans] = useState<ShootPlan[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(highlightId);

  const today = localDateStr();
  const upcoming = plans.filter(p => p.planned_date >= today);
  const past = plans.filter(p => p.planned_date < today);

  async function deletePlan(id: string) {
    if (!confirm('Delete this shoot plan?')) return;
    const supabase = createClient();
    await supabase.from('shoot_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
    if (expanded === id) setExpanded(null);
  }

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-5">
        <h1 className="text-xl font-bold mb-5">Shoot Planner</h1>

        {spots.length > 0 && <SpotRanker spots={spots} />}

        {plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--muted)] mb-4">No shoot plans yet.</p>
            <p className="text-sm text-[var(--muted)] mb-6">Open a saved spot to plan a shoot there.</p>
            <Link href="/map">
              <Button>Go to map</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                  Upcoming ({upcoming.length})
                </h2>
                <div className="space-y-2">
                  {upcoming.map(plan => (
                    <PlanCard key={plan.id} plan={plan} expanded={expanded === plan.id}
                      onToggle={() => toggle(plan.id)} onDelete={() => deletePlan(plan.id)} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                  Past ({past.length})
                </h2>
                <div className="space-y-2 opacity-60">
                  {past.slice(0, 5).map(plan => (
                    <PlanCard key={plan.id} plan={plan} expanded={expanded === plan.id}
                      onToggle={() => toggle(plan.id)} onDelete={() => deletePlan(plan.id)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpotRanker
// ---------------------------------------------------------------------------

type RankedResult = {
  spot: Spot;
  weather: WeatherData | null;
  score: ReturnType<typeof getShootabilityScore> | null;
  sunsetColor: SunsetColorPrediction | null;
};

function SpotRanker({ spots }: { spots: Spot[] }) {
  const today = localDateStr();
  const [date, setDate] = useState(today);
  const [results, setResults] = useState<RankedResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function compare() {
    setLoading(true);
    setResults(null);
    try {
      const rows = await Promise.all(
        spots.map(async (spot): Promise<RankedResult> => {
          const weather = await getWeather(spot.latitude, spot.longitude, date);
          const sunTimes = getSunTimes(new Date(date + 'T12:00:00'), spot.latitude, spot.longitude);
          const score = weather ? getShootabilityScore(weather.cloud_cover, weather.weather_code) : null;
          const sunsetHour = weather ? findHourly(weather, sunTimes.sunset) : null;
          const color = sunsetHour ? predictSunsetColor(sunsetHour) : null;
          return { spot, weather, score, sunsetColor: color };
        })
      );
      rows.sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0));
      setResults(rows);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-5">
      <h2 className="text-sm font-semibold mb-3">Best spot for a date</h2>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          min={today}
          onChange={e => { setDate(e.target.value); setResults(null); }}
          className="flex-1 rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
        />
        <Button size="sm" onClick={compare} loading={loading}>Compare</Button>
      </div>

      {results && (
        <div className="mt-3 space-y-0">
          {results.length === 0 ? (
            <p className="text-xs text-[var(--muted)] pt-2">No weather data available for that date.</p>
          ) : results.map((r, i) => (
            <div key={r.spot.id} className="flex items-center gap-3 py-2.5 border-t border-[var(--border)] first:border-t-0">
              <span className="text-xs font-bold text-[var(--muted)] w-5 shrink-0 text-center">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <Link href={`/spots?id=${r.spot.id}`}>
                  <p className="text-sm font-medium truncate hover:text-[var(--accent)] transition-colors">{r.spot.name}</p>
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  {r.weather && (
                    <span className="text-xs text-[var(--muted)]">{r.weather.cloud_cover}% cloud · {r.weather.weather_description}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.score && <span className={`text-xs font-medium ${r.score.color}`}>{r.score.label}</span>}
                {r.sunsetColor && (
                  <div
                    className="w-5 h-5 rounded border border-[var(--border)]"
                    title={r.sunsetColor.label}
                    style={{ background: r.sunsetColor.gradient }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

function PlanCard({
  plan, expanded, onToggle, onDelete
}: {
  plan: ShootPlan;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const spot = plan.photo_spots;
  const today = localDateStr();
  const isUpcoming = plan.planned_date >= today;

  // Lazy-load live weather when expanded (only worth doing for upcoming plans).
  const hasFetched = useRef(false);
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    if (!expanded || !isUpcoming || !spot?.latitude || hasFetched.current) return;
    hasFetched.current = true;
    setWeatherLoading(true);
    getWeather(spot.latitude, spot.longitude, plan.planned_date)
      .then(w => setLiveWeather(w))
      .finally(() => setWeatherLoading(false));
  }, [expanded, isUpcoming, spot?.latitude, spot?.longitude, plan.planned_date]);

  // Prefer live score (has real weather_code) over stored score (weather_code=0).
  const score = liveWeather
    ? getShootabilityScore(liveWeather.cloud_cover, liveWeather.weather_code)
    : plan.cloud_cover != null
      ? getShootabilityScore(plan.cloud_cover, 0)
      : null;

  const sunsetColor = (() => {
    if (!liveWeather || !plan.sunset) return null;
    const sunsetHour = findHourly(liveWeather, new Date(plan.sunset));
    return sunsetHour ? predictSunsetColor(sunsetHour) : null;
  })();

  const date = new Date(plan.planned_date + 'T12:00:00');
  const dateStr = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className={`bg-[var(--card)] border rounded-xl overflow-hidden transition-colors ${
      expanded ? 'border-[var(--accent)]' : 'border-[var(--border)]'
    }`}>
      {/* Summary row */}
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{dateStr}</p>
          {spot && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-[var(--muted)]" />
              <span className="text-xs text-[var(--muted)] truncate">{spot.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {plan.cloud_cover != null && (
            <div className="flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span className="text-xs text-[var(--muted)]">{plan.cloud_cover}%</span>
            </div>
          )}
          {score && <span className={`text-xs font-medium ${score.color}`}>{score.label}</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          {/* Sun times */}
          <div className="grid grid-cols-2 gap-3">
            {plan.sunrise && (
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--muted)]">Sunrise</p>
                  <p className="text-sm font-medium text-orange-400">{formatTime(new Date(plan.sunrise))}</p>
                </div>
              </div>
            )}
            {plan.sunset && (
              <div className="flex items-center gap-2">
                <Sunset className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <p className="text-xs text-[var(--muted)]">Sunset</p>
                  <p className="text-sm font-medium text-orange-400">{formatTime(new Date(plan.sunset))}</p>
                </div>
              </div>
            )}
            {plan.golden_hour_evening && (
              <div>
                <p className="text-xs text-[var(--muted)]">Golden hour (PM)</p>
                <p className="text-sm font-medium text-yellow-400">{formatTime(new Date(plan.golden_hour_evening))}</p>
              </div>
            )}
            {plan.blue_hour_evening && (
              <div>
                <p className="text-xs text-[var(--muted)]">Blue hour (PM)</p>
                <p className="text-sm font-medium text-blue-400">{formatTime(new Date(plan.blue_hour_evening))}</p>
              </div>
            )}
          </div>

          {/* Live conditions (fetched when expanded) */}
          {isUpcoming && (
            <div className="rounded-lg border border-[var(--border)] p-2.5">
              {weatherLoading ? (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching conditions…
                </div>
              ) : liveWeather ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">Live forecast</span>
                    <span className="font-medium">{liveWeather.weather_description} · {liveWeather.cloud_cover}% cloud</span>
                  </div>
                  {sunsetColor && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border border-[var(--border)] shrink-0" style={{ background: sunsetColor.gradient }} />
                      <div>
                        <p className="text-xs font-medium">{sunsetColor.label}</p>
                        <p className="text-xs text-[var(--muted)]">{sunsetColor.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">Forecast not available for this date.</p>
              )}
            </div>
          )}

          {/* Best window */}
          {plan.best_window && (
            <p className="text-xs text-[var(--muted)] italic">{plan.best_window}</p>
          )}

          {/* Suggested settings */}
          {plan.suggested_settings && Object.keys(plan.suggested_settings).length > 0 && (
            <div className="bg-[var(--background)] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Camera className="w-3.5 h-3.5 text-[var(--muted)]" />
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Suggested settings</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {plan.suggested_settings.aperture && (
                  <SettingRow label="Aperture" value={plan.suggested_settings.aperture} />
                )}
                {plan.suggested_settings.shutter_speed && (
                  <SettingRow label="Shutter" value={plan.suggested_settings.shutter_speed} />
                )}
                {plan.suggested_settings.iso && (
                  <SettingRow label="ISO" value={plan.suggested_settings.iso} />
                )}
                {plan.suggested_settings.mode && (
                  <SettingRow label="Mode" value={plan.suggested_settings.mode} />
                )}
              </div>
              {plan.suggested_settings.tips && plan.suggested_settings.tips.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {plan.suggested_settings.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-[var(--muted)] before:content-['·'] before:mr-1">{tip}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Notes */}
          {plan.notes && <p className="text-sm text-[var(--muted)]">{plan.notes}</p>}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {spot && (
              <Link href={`/spots?id=${spot.id}`} className="text-xs text-[var(--accent)] hover:underline">
                View spot →
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={onDelete} className="ml-auto">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  );
}

export function PlannerClient({ plans, spots }: Props) {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--muted)]">Loading...</div>}>
      <PlannerInner plans={plans} spots={spots} />
    </Suspense>
  );
}
