import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SpotForm } from '../../SpotForm';

export default async function EditSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: spot } = await supabase
    .from('photo_spots')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single();

  if (!spot) notFound();

  return (
    <div className="h-full">
      <SpotForm spot={spot} />
    </div>
  );
}
