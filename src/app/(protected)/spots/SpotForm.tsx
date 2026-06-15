'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { COMMON_TAGS } from '@/lib/utils';
import type { PhotoSpot } from '@/types';
import { ArrowLeft, MapPin, X } from 'lucide-react';
import Link from 'next/link';

type Props = {
  spot?: PhotoSpot;
};

export function SpotForm({ spot }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const [form, setForm] = useState({
    name: spot?.name ?? '',
    latitude: spot?.latitude?.toString() ?? params.get('lat') ?? '',
    longitude: spot?.longitude?.toString() ?? params.get('lng') ?? '',
    address: spot?.address ?? '',
    notes: spot?.notes ?? '',
    parking_notes: spot?.parking_notes ?? '',
    safety_notes: spot?.safety_notes ?? '',
    best_time_notes: spot?.best_time_notes ?? '',
  });
  const [tags, setTags] = useState<string[]>(spot?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function addTag(tag: string) {
    const t = tag.toLowerCase().trim().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Invalid coordinates');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        user_id: user.id,
        name: form.name,
        latitude: lat,
        longitude: lng,
        address: form.address || null,
        tags,
        notes: form.notes || null,
        parking_notes: form.parking_notes || null,
        safety_notes: form.safety_notes || null,
        best_time_notes: form.best_time_notes || null,
      };

      if (spot) {
        const { error } = await supabase.from('photo_spots').update(payload).eq('id', spot.id);
        if (error) throw error;
        router.push(`/spots?id=${spot.id}`);
      } else {
        const { data, error } = await supabase.from('photo_spots').insert(payload).select().single();
        if (error) throw error;
        router.push(`/spots?id=${data.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save spot');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={spot ? `/spots?id=${spot.id}` : '/map'} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">{spot ? 'Edit spot' : 'New spot'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input id="name" label="Name *" placeholder="Downtown Garage" value={form.name}
            onChange={e => set('name', e.target.value)} required />

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <Input id="lat" label="Latitude *" placeholder="34.0522" value={form.latitude}
              onChange={e => set('latitude', e.target.value)} required inputMode="decimal" />
            <Input id="lng" label="Longitude *" placeholder="-118.2437" value={form.longitude}
              onChange={e => set('longitude', e.target.value)} required inputMode="decimal" />
          </div>
          {(form.latitude || form.longitude) && (
            <a
              href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
            >
              <MapPin className="w-3.5 h-3.5" /> Verify on Google Maps
            </a>
          )}

          <Input id="address" label="Address" placeholder="123 Main St, Los Angeles, CA"
            value={form.address} onChange={e => set('address', e.target.value)} />

          {/* Tags */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">Tags</label>
            <div className="flex flex-wrap gap-2 mb-1">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-[var(--border)] text-xs px-2 py-1 rounded-md">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => addTag(tagInput)}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COMMON_TAGS.filter(t => !tags.includes(t)).slice(0, 8).map(tag => (
                <button key={tag} type="button" onClick={() => addTag(tag)}
                  className="text-xs text-[var(--muted)] border border-[var(--border)] px-2 py-0.5 rounded-md hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <Textarea id="notes" label="Notes" placeholder="Great reflections in the rain, best with a black car..."
            value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          <Textarea id="parking_notes" label="Parking notes" placeholder="Free parking on side street, meter on Main..."
            value={form.parking_notes} onChange={e => set('parking_notes', e.target.value)} rows={2} />
          <Textarea id="safety_notes" label="Safety notes" placeholder="Secure area, no issues. Bring a spotter at night."
            value={form.safety_notes} onChange={e => set('safety_notes', e.target.value)} rows={2} />
          <Textarea id="best_time_notes" label="Best time notes" placeholder="Golden hour hits perfectly, avoid midday..."
            value={form.best_time_notes} onChange={e => set('best_time_notes', e.target.value)} rows={2} />

          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pb-4">
            <Link href={spot ? `/spots?id=${spot.id}` : '/map'} className="flex-1">
              <Button type="button" variant="secondary" className="w-full">Cancel</Button>
            </Link>
            <Button type="submit" loading={loading} className="flex-1">
              {spot ? 'Save changes' : 'Save spot'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
