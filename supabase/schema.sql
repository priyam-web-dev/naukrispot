create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  email text,
  city text,
  state text,
  qualification text,
  graduation_year integer,
  experience text,
  skills text,
  preferred_role text,
  preferred_location text,
  work_preference text,
  job_type text,
  membership_start date,
  membership_expiry date,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  title text not null,
  category text,
  location text,
  work_mode text,
  experience text,
  qualification text,
  skills text,
  salary text,
  source text,
  source_url text,
  application_url text,
  posted_date date,
  deadline date,
  discovered_at timestamptz not null default now(),
  verification_status text not null default 'Unverified',
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create index if not exists members_status_idx on public.members(status);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_discovered_idx on public.jobs(discovered_at desc);

alter table public.members enable row level security;
alter table public.jobs enable row level security;

-- Development policies only. Replace with authenticated-admin policies before public launch.
drop policy if exists "temporary members read" on public.members;
drop policy if exists "temporary jobs read" on public.jobs;
drop policy if exists "development members access" on public.members;
drop policy if exists "development jobs access" on public.jobs;

create policy "development members access"
on public.members for all to anon, authenticated using (true) with check (true);

create policy "development jobs access"
on public.jobs for all to anon, authenticated using (true) with check (true);
