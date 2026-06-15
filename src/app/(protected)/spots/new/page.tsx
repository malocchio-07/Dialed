import { Suspense } from 'react';
import { SpotForm } from '../SpotForm';

export default function NewSpotPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--muted)]">Loading...</div>}>
      <SpotForm />
    </Suspense>
  );
}
