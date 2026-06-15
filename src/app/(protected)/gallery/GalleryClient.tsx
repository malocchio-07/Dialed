'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { STATUS_CONFIG } from '@/lib/utils';
import type { Photo, PhotoStatus } from '@/types';
import { Upload, X, ChevronDown } from 'lucide-react';

const STATUS_FILTERS: { value: PhotoStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unedited', label: 'Unedited' },
  { value: 'needs_edit', label: 'Needs Edit' },
  { value: 'edited', label: 'Edited' },
  { value: 'posted', label: 'Posted' },
  { value: 'portfolio', label: 'Portfolio' },
];

type Spot = { id: string; name: string };

type Props = {
  photos: Photo[];
  spots: Spot[];
  initialSpotId?: string;
};

export function GalleryClient({ photos: initial, spots, initialSpotId = '' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [filter, setFilter] = useState<PhotoStatus | 'all'>('all');
  const [selectedSpot, setSelectedSpot] = useState<string>(initialSpotId);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Photo | null>(null);

  const filtered = photos.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (selectedSpot && p.spot_id !== selectedSpot) return false;
    return true;
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage.from('photos').upload(path, file);
        if (uploadError) continue;

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);

        const { data: photo } = await supabase.from('photos').insert({
          user_id: user.id,
          spot_id: selectedSpot || null,
          image_url: urlData.publicUrl,
          storage_path: path,
          status: 'unedited',
        }).select().single();

        if (photo) setPhotos(prev => [photo, ...prev]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function updateStatus(photo: Photo, status: PhotoStatus) {
    const supabase = createClient();
    await supabase.from('photos').update({ status }).eq('id', photo.id);
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status } : p));
    if (selected?.id === photo.id) setSelected({ ...photo, status });
  }

  async function deletePhoto(photo: Photo) {
    if (!confirm('Delete this photo?')) return;
    const supabase = createClient();
    await supabase.storage.from('photos').remove([photo.storage_path]);
    await supabase.from('photos').delete().eq('id', photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setSelected(null);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Gallery</h1>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <Button size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" /> Upload
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === value
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-black font-medium'
                  : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Spot filter */}
        {spots.length > 0 && (
          <div className="mt-2 relative">
            <select
              value={selectedSpot}
              onChange={e => setSelectedSpot(e.target.value)}
              className="w-full appearance-none bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm pr-8 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">All spots</option>
              {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-[var(--muted)] mb-4">
              {photos.length === 0 ? 'No photos yet. Upload your first one!' : 'No photos match this filter.'}
            </p>
            {photos.length === 0 && (
              <Button onClick={() => fileRef.current?.click()} loading={uploading}>
                <Upload className="w-4 h-4" /> Upload photos
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {filtered.map(photo => (
              <button
                key={photo.id}
                onClick={() => setSelected(photo)}
                className="relative aspect-square rounded-lg overflow-hidden bg-[var(--card)] group"
              >
                <Image src={photo.image_url} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-200" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-1 left-1">
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${STATUS_CONFIG[photo.status].color}`}>
                    {STATUS_CONFIG[photo.status].label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo detail overlay */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <button onClick={() => setSelected(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X className="w-5 h-5" />
            </button>
            <div className="flex gap-2 flex-wrap justify-end">
              {(Object.keys(STATUS_CONFIG) as PhotoStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(selected, s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selected.status === s
                      ? STATUS_CONFIG[s].color + ' border-transparent'
                      : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 relative">
            <Image src={selected.image_url} alt="" fill className="object-contain" />
          </div>
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <div>
              {selected.photo_spots && (
                <p className="text-xs text-[var(--muted)]">{selected.photo_spots.name}</p>
              )}
              <p className="text-xs text-[var(--muted)]">{new Date(selected.created_at).toLocaleDateString()}</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => deletePhoto(selected)}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
