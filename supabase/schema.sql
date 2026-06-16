-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Photo Spots
create table if not exists photo_spots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  tags text[] default '{}',
  notes text,
  parking_notes text,
  safety_notes text,
  best_time_notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Shoot Plans
create table if not exists shoot_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  spot_id uuid references photo_spots(id) on delete cascade not null,
  planned_date date not null,
  sunrise timestamptz,
  sunset timestamptz,
  golden_hour_morning timestamptz,
  golden_hour_evening timestamptz,
  blue_hour_morning timestamptz,
  blue_hour_evening timestamptz,
  cloud_cover integer,
  weather_summary text,
  best_window text,
  suggested_settings jsonb default '{}',
  notes text,
  created_at timestamptz default now() not null
);

-- Photos
create table if not exists photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  spot_id uuid references photo_spots(id) on delete set null,
  image_url text not null,
  storage_path text not null,
  date_taken date,
  status text not null default 'unedited' check (status in ('unedited', 'needs_edit', 'edited', 'posted', 'portfolio')),
  camera_used text,
  preset_used text,
  notes text,
  created_at timestamptz default now() not null
);

-- Row Level Security
alter table photo_spots enable row level security;
alter table shoot_plans enable row level security;
alter table photos enable row level security;

drop policy if exists "Users manage own spots" on photo_spots;
create policy "Users manage own spots"
  on photo_spots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own plans" on shoot_plans;
create policy "Users manage own plans"
  on shoot_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own photos" on photos;
create policy "Users manage own photos"
  on photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict do nothing;

drop policy if exists "Users upload own photos" on storage.objects;
create policy "Users upload own photos"
  on storage.objects for insert
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users view own photos" on storage.objects;
create policy "Users view own photos"
  on storage.objects for select
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users delete own photos" on storage.objects;
create policy "Users delete own photos"
  on storage.objects for delete
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger: updated_at for photo_spots
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists photo_spots_updated_at on photo_spots;
create trigger photo_spots_updated_at
  before update on photo_spots
  for each row execute function update_updated_at();
