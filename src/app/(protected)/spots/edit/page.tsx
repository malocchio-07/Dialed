'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpotForm } from '../SpotForm';
import type { PhotoSpot } from '@/types';

function EditInner() {
  const id = useSearchParams().get('id');
  const [spot, setSpot] = useState<PhotoSpot | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setSpot(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from('photo_spots')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setSpot((data as PhotoSpot) ?? null));
  }, [id]);

  if (spot === undefined) {
    return <div className="p-6 text-[var(--muted)]">Loading…</div>;
  }

  if (spot === null) {
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
    <div className="h-full">
      <SpotForm spot={spot} />
    </div>
  );
}

export default function EditSpotPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--muted)]">Loading…</div>}>
      <EditInner />
    </Suspense>
  );
}
