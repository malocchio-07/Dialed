'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpotDetail } from './SpotDetail';
import { Button } from '@/components/ui/Button';
import { MapPin, Plus } from 'lucide-react';
import { hydrateSignedUrls } from '@/lib/storage';
import type { PhotoSpot, Photo, ShootPlan } from '@/types';

type Loaded = { spot: PhotoSpot; photos: Photo[]; plans: ShootPlan[] };

// ---------------------------------------------------------------------------
// Spot detail view (existing behaviour when ?id= is present)
// ---------------------------------------------------------------------------

function SpotDetailInner() {
  const id = useSearchParams().get('id');
  const [data, setData] = useState<Loaded | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!id) { setData(null); return; }
    const supabase = createClient();

    const { data: spot } = await supabase
      .from('photo_spots')
      .select('*')
      .eq('id', id)
      .single();

    if (!spot) { setData(null); return; }

    const [{ data: photos }, { data: plans }] = await Promise.all([
      supabase
        .from('photos')
        .select('*')
        .eq('spot_id', id)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('shoot_plans')
        .select('*')
        .eq('spot_id', id)
        .order('planned_date', { ascending: true }),
    ]);

    const hydratedPhotos = await hydrateSignedUrls((photos as Photo[]) ?? []);

    setData({
      spot: spot as PhotoSpot,
      photos: hydratedPhotos,
      plans: (plans as ShootPlan[]) ?? [],
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (data === undefined) {
    return <div className="h-full flex items-center justify-center text-[var(--muted)]">Loading spot…</div>;
  }
  if (data === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-[var(--muted)]">Spot not found.</p>
        <Link href="/spots" className="text-[var(--accent)] hover:underline">Back to spots</Link>
      </div>
    );
  }

  return <SpotDetail spot={data.spot} photos={data.photos} plans={data.plans} onReload={load} />;
}

// ---------------------------------------------------------------------------
// Spots list view (shown when no ?id= param)
// ---------------------------------------------------------------------------

function SpotsListInner() {
  const [spots, setSpots] = useState<PhotoSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from('photo_spots')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setSpots((data as PhotoSpot[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold">Spots</h1>
          <Link href="/spots/new">
            <Button size="sm"><Plus className="w-4 h-4" /> New</Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-[var(--muted)]">Loading…</p>
        ) : spots.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--muted)] mb-4">No spots saved yet.</p>
            <Link href="/spots/new"><Button>Add your first spot</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {spots.map(spot => (
              <Link key={spot.id} href={`/spots?id=${spot.id}`}>
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--accent)] transition-colors active:scale-[0.99]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{spot.name}</p>
                      {spot.address && (
                        <p className="text-sm text-[var(--muted)] mt-0.5 truncate">{spot.address}</p>
                      )}
                      {spot.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {spot.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-xs bg-[var(--border)] px-2 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Router: list vs detail
// ---------------------------------------------------------------------------

function SpotPageInner() {
  const id = useSearchParams().get('id');
  return id ? <SpotDetailInner /> : <SpotsListInner />;
}

export default function SpotPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--muted)]">Loading…</div>}>
      <SpotPageInner />
    </Suspense>
  );
}
