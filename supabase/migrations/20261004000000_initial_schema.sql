-- Initial application tables. RLS and policies are deferred to a later migration.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (btrim(full_name) <> ''),
  role text not null default 'framer' check (role in ('framer', 'admin'))
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> '')
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  site_id uuid not null references public.sites (id) on delete restrict,
  form_date date not null,
  ppe_worn boolean not null,
  fall_protection boolean not null,
  ladders_scaffolding_inspected boolean not null,
  tools_cords_good_condition boolean not null,
  hazards_identified boolean not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.submission_photos (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  storage_path text not null check (btrim(storage_path) <> ''),
  created_at timestamptz not null default now()
);
