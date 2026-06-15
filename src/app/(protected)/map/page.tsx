'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpotMap } from '@/components/map/SpotMap';
import type { PhotoSpot } from '@/types';

export default function MapPage() {
  const router = useRouter();
  const [spots, setSpots] = useState<PhotoSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('photo_spots')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSpots((data as PhotoSpot[]) ?? []);
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
      <SpotMap spots={spots} onAddSpot={handleAddSpot} />
    </div>
  );
}
