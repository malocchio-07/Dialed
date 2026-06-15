'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Edit2, MapPin, Clock, Cloud, Trash2, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { STATUS_CONFIG } from '@/lib/utils';
import { formatTime, getSunTimes } from '@/lib/sun';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PhotoSpot, Photo, ShootPlan } from '@/types';
import { SunWidget } from './SunWidget';
import { PlanModal } from './PlanModal';

type Props = {
  spot: PhotoSpot;
  photos: Photo[];
  plans: ShootPlan[];
};

export function SpotDetail({ spot, photos, plans }: Props) {
  const router = useRouter();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const today = new Date();
  const sunTimes = getSunTimes(today, spot.latitude, spot.longitude);

  async function deleteSpot() {
    if (!confirm('Delete this spot? This cannot be undone.')) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('photo_spots').delete().eq('id', spot.id);
    router.push('/map');
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/map" className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-lg truncate max-w-[200px]">{spot.name}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/spots/${spot.id}/edit`}>
              <Button variant="ghost" size="sm"><Edit2 className="w-4 h-4" /></Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={deleteSpot} loading={deleting}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[var(--muted)] mt-0.5 shrink-0" />
            <div>
              {spot.address && <p className="text-sm">{spot.address}</p>}
              <a
                href={`https://maps.google.com?q=${spot.latitude},${spot.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
              >
                {spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}
              </a>
            </div>
          </div>

          {/* Tags */}
          {spot.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {spot.tags.map(tag => (
                <Badge key={tag} className="bg-[var(--border)] text-[var(--foreground)]">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Today's sun times */}
          <SunWidget sunTimes={sunTimes} />

          {/* Notes sections */}
          {spot.notes && <NoteSection title="Notes" content={spot.notes} />}
          {spot.best_time_notes && <NoteSection title="Best time" content={spot.best_time_notes} icon={<Clock className="w-3.5 h-3.5" />} />}
          {spot.parking_notes && <NoteSection title="Parking" content={spot.parking_notes} />}
          {spot.safety_notes && <NoteSection title="Safety" content={spot.safety_notes} />}

          {/* Shoot Plans */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Shoot plans</h2>
              <Button size="sm" variant="secondary" onClick={() => setShowPlanModal(true)}>
                <CalendarPlus className="w-3.5 h-3.5" /> Plan shoot
              </Button>
            </div>
            {plans.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No planned shoots yet.</p>
            ) : (
              <div className="space-y-2">
                {plans.map(plan => (
                  <Link key={plan.id} href={`/planner?plan=${plan.id}`}
                    className="block bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 hover:border-[var(--accent)] transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{new Date(plan.planned_date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      {plan.cloud_cover != null && (
                        <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                          <Cloud className="w-3.5 h-3.5" /> {plan.cloud_cover}%
                        </span>
                      )}
                    </div>
                    {plan.best_window && <p className="text-xs text-[var(--muted)] mt-1">{plan.best_window}</p>}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Photos grid */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">Photos ({photos.length})</h2>
                <Link href={`/gallery?spot=${spot.id}`} className="text-xs text-[var(--muted)] hover:text-[var(--accent)]">
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.slice(0, 9).map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-[var(--card)]">
                    <Image src={photo.image_url} alt="" fill className="object-cover" />
                    <div className="absolute bottom-1 left-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_CONFIG[photo.status].color}`}>
                        {STATUS_CONFIG[photo.status].label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPlanModal && (
        <PlanModal
          spot={spot}
          onClose={() => setShowPlanModal(false)}
          onSaved={() => { setShowPlanModal(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function NoteSection({ title, content, icon }: { title: string; content: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
