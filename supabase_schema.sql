-- ==================================================
-- FIT COACH AI — Supabase Database Schema (Idempotent)
-- Safe to run multiple times — drops and recreates policies/triggers.
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bleaekgciwewwyrrtmhj/sql/new
-- ==================================================

-- 1. PROFILES TABLE
create table if not exists profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  name         text,
  gender       text,
  age          int,
  height       numeric,
  weight       numeric,
  goal         text,
  level        text,
  avatar_url   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. WORKOUT HISTORY TABLE
create table if not exists workout_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade not null,
  exercise     text not null,
  reps         int default 0,
  sets         int default 1,
  duration     int default 0,
  accuracy     int default 0,
  calories     int default 0,
  grade        text default 'B',
  intensity    int default 0,
  created_at   timestamptz default now()
);

-- 3. USER DATA TABLE (plans, PRs, settings)
create table if not exists user_data (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade not null unique,
  workout_plan  jsonb default '[]',
  macro_plan    jsonb default '{}',
  prs           jsonb default '{}',
  settings      jsonb default '{}',
  updated_at    timestamptz default now()
);

-- 4. DAILY LOGS TABLE (hydration, habits)
create table if not exists daily_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete cascade not null,
  log_date        date not null default current_date,
  water_ml        int default 0,
  electrolytes    boolean default false,
  habits          jsonb default '{}',
  created_at      timestamptz default now(),
  unique (user_id, log_date)
);

-- ==================================================
-- ROW LEVEL SECURITY
-- ==================================================

alter table profiles        enable row level security;
alter table workout_history enable row level security;
alter table user_data       enable row level security;
alter table daily_logs      enable row level security;

-- Drop existing policies first (safe re-run)
do $$ begin

  -- profiles
  drop policy if exists "Users can view own profile"    on profiles;
  drop policy if exists "Users can insert own profile"  on profiles;
  drop policy if exists "Users can update own profile"  on profiles;
  drop policy if exists "Users can delete own profile"  on profiles;

  -- workout_history
  drop policy if exists "Users can select own workouts" on workout_history;
  drop policy if exists "Users can insert own workouts" on workout_history;
  drop policy if exists "Users can delete own workouts" on workout_history;

  -- user_data
  drop policy if exists "Users can select own data"     on user_data;
  drop policy if exists "Users can upsert own data"     on user_data;
  drop policy if exists "Users can update own data"     on user_data;
  drop policy if exists "Users can delete own data"     on user_data;

  -- daily_logs
  drop policy if exists "Users can select own logs"     on daily_logs;
  drop policy if exists "Users can insert own logs"     on daily_logs;
  drop policy if exists "Users can update own logs"     on daily_logs;
  drop policy if exists "Users can delete own logs"     on daily_logs;

end $$;

-- PROFILES policies
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can delete own profile"
  on profiles for delete using (auth.uid() = id);

-- WORKOUT HISTORY policies
create policy "Users can select own workouts"
  on workout_history for select using (auth.uid() = user_id);

create policy "Users can insert own workouts"
  on workout_history for insert with check (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on workout_history for delete using (auth.uid() = user_id);

-- USER DATA policies
create policy "Users can select own data"
  on user_data for select using (auth.uid() = user_id);

create policy "Users can upsert own data"
  on user_data for insert with check (auth.uid() = user_id);

create policy "Users can update own data"
  on user_data for update using (auth.uid() = user_id);

create policy "Users can delete own data"
  on user_data for delete using (auth.uid() = user_id);

-- DAILY LOGS policies
create policy "Users can select own logs"
  on daily_logs for select using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on daily_logs for insert with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on daily_logs for update using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on daily_logs for delete using (auth.uid() = user_id);

-- ==================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ==================================================

create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop triggers before recreating (safe re-run)
drop trigger if exists set_profiles_updated_at  on profiles;
drop trigger if exists set_user_data_updated_at on user_data;

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();

create trigger set_user_data_updated_at
  before update on user_data
  for each row execute function handle_updated_at();

-- ==================================================
-- NEW USER TRIGGER — Auto-creates profile + user_data
-- row when a user signs up (Google, Email, Apple)
-- ==================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_data (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
