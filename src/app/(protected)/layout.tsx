'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Nav } from '@/components/Nav';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace('/login');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace('/login');
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (authed !== true) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-hidden pb-20">{children}</main>
      <Nav />
    </div>
  );
}
