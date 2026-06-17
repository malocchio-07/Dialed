'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpotMap } from '@/components/map/SpotMap';
import type { PhotoSpot } from '@/types';

export default function MapPage() {
  const router = useRouter();
  const [spots, setSpots] = useState<PhotoSpot[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('photo_spots').select('*').order('created_at', { ascending: false }),
      supabase
        .from('photos')
        .select('spot_id, storage_path')
        .not('spot_id', 'is', null)
        .order('created_at', { ascending: false }),
    ]).then(async ([spotsRes, photosRes]) => {
      setSpots((spotsRes.data as PhotoSpot[]) ?? []);

      // Build one thumbnail path per spot (most recent photo wins).
      const photos = (photosRes.data ?? []) as Array<{ spot_id: string; storage_path: string }>;
      const seen = new Set<string>();
      const entries: Array<{ spot_id: string; storage_path: string }> = [];
      for (const p of photos) {
        if (p.spot_id && p.storage_path && !seen.has(p.spot_id)) {
          seen.add(p.spot_id);
          entries.push(p);
        }
      }

      if (entries.length) {
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrls(entries.map(e => e.storage_path), 3600);
        const byPath: Record<string, string> = {};
        for (const s of signed ?? []) {
          if (s.signedUrl && s.path) byPath[s.path] = s.signedUrl;
        }
        const thumbMap: Record<string, string> = {};
        for (const e of entries) {
          const url = byPath[e.storage_path];
          if (url) thumbMap[e.spot_id] = url;
        }
        setThumbnails(thumbMap);
      }

      setLoading(false);
    });
  }, []);

  function handleAddSpot(lat: number, lng: number) {
    router.push(`/spots/new?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
  }

  return (
    <div className="h-full w-full relative">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--background)] text-[var(--muted)]">
          Loading map…
        </div>
      )}
      <SpotMap spots={spots} thumbnails={thumbnails} onAddSpot={handleAddSpot} shadow />
    </div>
  );
}
