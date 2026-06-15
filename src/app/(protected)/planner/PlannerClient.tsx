'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ShootPlan } from '@/types';
import { MapPin, Cloud, Sunrise, Sunset, Camera, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatTime } from '@/lib/sun';
import { getShootabilityScore } from '@/lib/weather';
import { Suspense } from 'react';

type Props = { plans: ShootPlan[] };

function PlannerInner({ plans: initial }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const highlightId = params.get('plan');

  const [plans, setPlans] = useState<ShootPlan[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(highlightId);

  const today = new Date().toISOString().split('T')[0];
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

function PlanCard({
  plan, expanded, onToggle, onDelete
}: {
  plan: ShootPlan;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const spot = plan.photo_spots;
  const score = plan.cloud_cover != null
    ? getShootabilityScore(plan.cloud_cover, 0)
    : null;

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
              <Link href={`/spots/${spot.id}`} className="text-xs text-[var(--accent)] hover:underline">
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

export function PlannerClient({ plans }: Props) {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--muted)]">Loading...</div>}>
      <PlannerInner plans={plans} />
    </Suspense>
  );
}
