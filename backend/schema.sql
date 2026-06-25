-- ============================================================
-- Tend — Supabase schema
-- Paste this into the Supabase dashboard → SQL Editor → Run
-- ============================================================

-- 1. PROFILES — one row per user, stores onboarding answers
create table if not exists profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null default '',
  mode          text,                       -- 'solo' | 'together'
  focus_id      text,
  focus_label   text,
  focus_detail  text,
  motivators    text[]  default '{}',
  belief_id     text,
  belief_label  text,
  belief_hint   text,
  imagination   int     default 3,
  voice_preset  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id)
);

-- 2. ROOMS — shared spaces for couples / groups
create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,          -- 5-char room code
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- 3. ROOM MEMBERS — who is in each room
create table if not exists room_members (
  id         uuid primary key default gen_random_uuid(),
  room_code  text not null references rooms(code) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  joined_at  timestamptz default now(),
  unique (room_code, user_id)
);

-- 4. SESSIONS — each story session (solo or shared)
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  room_code   text references rooms(code) on delete set null,
  title       text not null default 'Untitled story',
  story_text  text,                          -- latest chapter text
  history     jsonb default '[]',            -- full Claude message array
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- Row-level security (RLS)
-- Users can only read/write their own data.
-- ============================================================

alter table profiles     enable row level security;
alter table rooms        enable row level security;
alter table room_members enable row level security;
alter table sessions     enable row level security;

-- PROFILES
create policy "profiles: own rows"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ROOMS — owner can do anything; members can read
create policy "rooms: owner full access"
  on rooms for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "rooms: members can read"
  on rooms for select
  using (
    exists (
      select 1 from room_members
      where room_members.room_code = rooms.code
        and room_members.user_id = auth.uid()
    )
  );

-- ROOM MEMBERS — see members of rooms you belong to
create policy "room_members: own rows"
  on room_members for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "room_members: see co-members"
  on room_members for select
  using (
    exists (
      select 1 from room_members as me
      where me.room_code = room_members.room_code
        and me.user_id = auth.uid()
    )
  );

-- SESSIONS — owner + room members can read; only owner can write
create policy "sessions: owner full access"
  on sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions: room members can read"
  on sessions for select
  using (
    room_code is not null and
    exists (
      select 1 from room_members
      where room_members.room_code = sessions.room_code
        and room_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- Auto-update updated_at timestamps
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_sessions_updated_at
  before update on sessions
  for each row execute function set_updated_at();

-- ============================================================
-- Realtime — enable Supabase realtime for live couple sync
-- ============================================================

-- Allow realtime on sessions table so partner updates broadcast instantly
alter publication supabase_realtime add table sessions;
