import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Nav } from '@/components/Nav';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-hidden pb-20">
        {children}
      </main>
      <Nav />
    </div>
  );
}
