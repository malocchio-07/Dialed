'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpotDetail } from './SpotDetail';
import type { PhotoSpot, Photo, ShootPlan } from '@/types';

type Loaded = { spot: PhotoSpot; photos: Photo[]; plans: ShootPlan[] };

function SpotDetailInner() {
  const id = useSearchParams().get('id');
  // undefined = loading, null = not found
  const [data, setData] = useState<Loaded | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!id) {
      setData(null);
      return;
    }
    const supabase = createClient();

    const { data: spot } = await supabase
      .from('photo_spots')
      .select('*')
      .eq('id', id)
      .single();

    if (!spot) {
      setData(null);
      return;
    }

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

    setData({
      spot: spot as PhotoSpot,
      photos: (photos as Photo[]) ?? [],
      plans: (plans as ShootPlan[]) ?? [],
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (data === undefined) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--muted)]">
        Loading spot…
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-[var(--muted)]">Spot not found.</p>
        <Link href="/map" className="text-[var(--accent)] hover:underline">
          Back to map
        </Link>
      </div>
    );
  }

  return (
    <SpotDetail
      spot={data.spot}
      photos={data.photos}
      plans={data.plans}
      onReload={load}
    />
  );
}

export default function SpotPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-[var(--muted)]">Loading…</div>}
    >
      <SpotDetailInner />
    </Suspense>
  );
}
