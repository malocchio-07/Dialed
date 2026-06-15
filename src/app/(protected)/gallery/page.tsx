import { createClient } from '@/lib/supabase/server';
import { GalleryClient } from './GalleryClient';

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: photos } = await supabase
    .from('photos')
    .select('*, photo_spots(id, name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const { data: spots } = await supabase
    .from('photo_spots')
    .select('id, name')
    .eq('user_id', user!.id)
    .order('name');

  return <GalleryClient photos={photos ?? []} spots={spots ?? []} />;
}
