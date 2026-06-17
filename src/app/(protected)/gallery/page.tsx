'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GalleryClient } from './GalleryClient';
import { hydrateSignedUrls } from '@/lib/storage';
import type { Photo, PhotoSpot } from '@/types';

type Spot = Pick<PhotoSpot, 'id' | 'name' | 'latitude' | 'longitude'>;

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
      supabase.from('photo_spots').select('id, name, latitude, longitude').order('name'),
    ]).then(async ([photosRes, spotsRes]) => {
      const raw = (photosRes.data as Photo[]) ?? [];
      const photos = await hydrateSignedUrls(raw);
      setPhotos(photos);
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
