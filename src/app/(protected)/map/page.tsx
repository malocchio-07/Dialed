import { createClient } from '@/lib/supabase/server';
import { MapClient } from './MapClient';

export default async function MapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: spots } = await supabase
    .from('photo_spots')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  return <MapClient initialSpots={spots ?? []} />;
}
