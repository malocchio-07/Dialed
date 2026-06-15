'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GalleryClient } from './GalleryClient';
import type { Photo } from '@/types';

type Spot = { id: string; name: string };

function GalleryInner() {
  const initialSpotId = useSearchParams().get('spot') ?? '';
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from('photos')
        .select('*, photo_spots(id, name)')
        .order('created_at', { ascending: false }),
      supabase.from('photo_spots').select('id, name').order('name'),
    ]).then(([photosRes, spotsRes]) => {
      setPhotos((photosRes.data as Photo[]) ?? []);
      setSpots((spotsRes.data as Spot[]) ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-6 text-[var(--muted)]">Loading gallery…</div>;
  }

  return <GalleryClient photos={photos} spots={spots} initialSpotId={initialSpotId} />;
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--muted)]">Loading…</div>}>
      <GalleryInner />
    </Suspense>
  );
}
