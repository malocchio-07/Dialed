import { createClient } from '@/lib/supabase/client';
import type { Photo } from '@/types';

/** Replace stored public URLs with fresh 1-hour signed URLs so private Supabase buckets work. */
export async function hydrateSignedUrls(photos: Photo[]): Promise<Photo[]> {
  const paths = photos.map(p => p.storage_path).filter(Boolean) as string[];
  if (!paths.length) return photos;
  const supabase = createClient();
  const { data } = await supabase.storage.from('photos').createSignedUrls(paths, 3600);
  if (!data?.length) return photos;
  return photos.map(p => {
    const match = data.find(s => s.path === p.storage_path);
    return match?.signedUrl ? { ...p, image_url: match.signedUrl } : p;
  });
}
