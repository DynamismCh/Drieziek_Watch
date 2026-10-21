-- Drieziek Watch initial shared-backend schema
-- Apply this migration in the Supabase SQL Editor.
-- Residents can read community incidents/messages after signing in.
-- Only incident owners and trusted staff can update incident status.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Community member',
  role text not null default 'resident'
    check (role in ('resident', 'moderator', 'security')),
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 120),
  category text not null check (category in (
    'Suspicious activity', 'Theft', 'Break-in', 'Medical emergency',
    'Fire', 'Missing person', 'Infrastructure', 'Other'
  )),
  urgency text not null default 'Normal' check (urgency in ('Normal', 'High', 'Critical')),
  description text not null check (char_length(trim(description)) between 3 and 4000),
  location_text text not null default 'Location not provided',
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  photo_path text,
  status text not null default 'Active' check (status in ('Active', 'Monitoring', 'Resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_status_idx on public.incidents (status);
create index if not exists incidents_category_idx on public.incidents (category);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  location_text text,
  created_at timestamptz not null default now()
);

create index if not exists community_messages_created_at_idx
  on public.community_messages (created_at desc);

create table if not exists public.incident_audit (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'status_changed', 'edited')),
  old_status text,
  new_status text,
  created_at timestamptz not null default now()
);

-- Create a resident profile on signup. The role is always resident by default;
-- staff roles must be assigned by a trusted administrator.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Community member'),
    'resident'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_trusted_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('moderator', 'security')
  );
$$;

alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.community_messages enable row level security;
alter table public.incident_audit enable row level security;

drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Signed-in users can view profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users can view community incidents" on public.incidents;
create policy "Users can view community incidents"
  on public.incidents for select to authenticated using (true);

drop policy if exists "Users can create incidents as themselves" on public.incidents;
create policy "Users can create incidents as themselves"
  on public.incidents for insert to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists "Owners or staff can update incidents" on public.incidents;
create policy "Owners or staff can update incidents"
  on public.incidents for update to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_trusted_staff()))
  with check (reporter_id = (select auth.uid()) or (select public.is_trusted_staff()));

drop policy if exists "Signed-in users can view community messages" on public.community_messages;
create policy "Signed-in users can view community messages"
  on public.community_messages for select to authenticated using (true);

drop policy if exists "Users can post as themselves" on public.community_messages;
create policy "Users can post as themselves"
  on public.community_messages for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors or staff can delete messages" on public.community_messages;
create policy "Authors or staff can delete messages"
  on public.community_messages for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_trusted_staff()));

drop policy if exists "Users can view incident audit" on public.incident_audit;
create policy "Users can view incident audit"
  on public.incident_audit for select to authenticated using ((select public.is_trusted_staff()));

drop policy if exists "Signed-in users can add incident audit" on public.incident_audit;
create policy "Signed-in users can add incident audit"
  on public.incident_audit for insert to authenticated
  with check (actor_id = (select auth.uid()) and (select public.is_trusted_staff()));

-- Private bucket. App code should upload to <user-id>/<filename> and use
-- authenticated downloads or short-lived signed URLs, never public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('incident-photos', 'incident-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Signed-in users can view incident photos" on storage.objects;
create policy "Signed-in users can view incident photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'incident-photos');

drop policy if exists "Users upload photos to their own folder" on storage.objects;
create policy "Users upload photos to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'incident-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owners or staff can delete incident photos" on storage.objects;
create policy "Owners or staff can delete incident photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'incident-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_trusted_staff())
    )
  );

-- NOTE: no client-accessible policy permits changing profile roles.
-- Assign moderator/security roles only from the Supabase dashboard or a
-- trusted administrative process. Enable email confirmation before launch.
