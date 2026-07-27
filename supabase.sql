create extension if not exists pgcrypto;

create table if not exists public.casts (
  id uuid primary key default gen_random_uuid(),
  store_id text not null check (store_id in ('rootA','キノコ','untake','TurnA','酔','エクラス')),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  store_id text not null check (store_id in ('rootA','キノコ','untake','TurnA','酔','エクラス')),
  cast_id uuid not null references public.casts(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.casts enable row level security;
alter table public.shifts enable row level security;

drop policy if exists casts_read on public.casts;
drop policy if exists casts_insert on public.casts;
drop policy if exists casts_update on public.casts;
drop policy if exists casts_delete on public.casts;
drop policy if exists shifts_read on public.shifts;
drop policy if exists shifts_insert on public.shifts;
drop policy if exists shifts_update on public.shifts;
drop policy if exists shifts_delete on public.shifts;

create policy casts_read on public.casts for select using (true);
create policy casts_insert on public.casts for insert with check (true);
create policy casts_update on public.casts for update using (true) with check (true);
create policy casts_delete on public.casts for delete using (true);

create policy shifts_read on public.shifts for select using (true);
create policy shifts_insert on public.shifts for insert with check (true);
create policy shifts_update on public.shifts for update using (true) with check (true);
create policy shifts_delete on public.shifts for delete using (true);

create index if not exists casts_store_id_idx on public.casts(store_id);
create index if not exists shifts_store_date_idx on public.shifts(store_id, shift_date);
