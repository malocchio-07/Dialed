import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SpotDetail } from './SpotDetail';

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('spot_id', id)
    .order('created_at', { ascending: false })
    .limit(12);

  const { data: plans } = await supabase
    .from('shoot_plans')
    .select('*')
    .eq('spot_id', id)
    .order('planned_date', { ascending: true });

  return <SpotDetail spot={spot} photos={photos ?? []} plans={plans ?? []} />;
}
