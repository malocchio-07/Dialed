'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? '/map' : '/login');
    });
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center text-[var(--muted)]">
      Loading…
    </div>
  );
}
