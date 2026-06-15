'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SpotMap } from '@/components/map/SpotMap';
import type { PhotoSpot } from '@/types';

type Props = {
  initialSpots: PhotoSpot[];
};

export function MapClient({ initialSpots }: Props) {
  const router = useRouter();
  const [spots] = useState<PhotoSpot[]>(initialSpots);

  function handleAddSpot(lat: number, lng: number) {
    router.push(`/spots/new?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
  }

  return (
    <div className="h-full w-full">
      <SpotMap spots={spots} onAddSpot={handleAddSpot} />
    </div>
  );
}
