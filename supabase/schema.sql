-- ============================================================================
-- SUPABASE COMPLETE DATABASE SCHEMA
-- Realtime Math Exam Platform (Kahoot/Quizizz Style)
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- PROFILES (Linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  name text not null,
  role text not null check (role in ('teacher', 'student', 'admin')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ROOMS (Exam Lobbies & Sessions)
create table if not exists public.rooms (
  id uuid default gen_random_uuid() primary key,
  code varchar(6) not null unique,
  password text,
  max_students integer default 50 not null,
  late_join_enabled boolean default true not null,
  is_locked boolean default false not null,
  status text default 'lobby' not null check (status in ('lobby', 'countdown', 'active', 'ended')),
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  config jsonb not null, -- Stores ExamConfig
  questions jsonb not null, -- Stores MathQuestion[]
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- PARTICIPANTS (Students in active exam sessions)
create table if not exists public.participants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  is_ready boolean default false not null,
  score integer default 0 not null,
  correct_answers integer default 0 not null,
  wrong_answers integer default 0 not null,
  progress numeric(5,2) default 0.00 not null, -- percentage of questions answered
  current_question_index integer default 0 not null,
  answers jsonb default '{}'::jsonb not null, -- mapping of questionId -> studentAnswer
  time_spent integer default 0 not null, -- total seconds spent
  disconnected boolean default false not null,
  last_active timestamptz default timezone('utc'::text, now()) not null,
  unique (room_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES FOR PERFORMANCE Optimization
-- ----------------------------------------------------------------------------
create index if not exists idx_rooms_code on public.rooms (code);
create index if not exists idx_rooms_teacher_id on public.rooms (teacher_id);
create index if not exists idx_rooms_status on public.rooms (status);
create index if not exists idx_participants_room_id on public.participants (room_id);
create index if not exists idx_participants_user_id on public.participants (user_id);
create index if not exists idx_participants_score on public.participants (score desc);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.participants enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Rooms Policies
create policy "Rooms are viewable by anyone authenticated" 
  on public.rooms for select 
  using (auth.role() = 'authenticated');

create policy "Teachers can insert their own rooms" 
  on public.rooms for insert 
  with check (auth.uid() = teacher_id AND exists (
    select 1 from public.profiles where id = auth.uid() and role in ('teacher', 'admin')
  ));

create policy "Teachers can update their own rooms" 
  on public.rooms for update 
  using (auth.uid() = teacher_id);

create policy "Teachers can delete their own rooms" 
  on public.rooms for delete 
  using (auth.uid() = teacher_id);

-- Participants Policies
create policy "Participants are viewable by anyone in the same room" 
  on public.participants for select 
  using (exists (
    select 1 from public.rooms r 
    where r.id = room_id and (r.teacher_id = auth.uid() or exists (
      select 1 from public.participants p where p.room_id = r.id and p.user_id = auth.uid()
    ))
  ));

create policy "Students can join rooms by inserting participant row" 
  on public.participants for insert 
  with check (auth.uid() = user_id);

create policy "Students can update their own progress" 
  on public.participants for update 
  using (auth.uid() = user_id or exists (
    select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()
  ));

create policy "Teachers can remove participants from their rooms" 
  on public.participants for delete 
  using (exists (
    select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION SETUP
-- ----------------------------------------------------------------------------
-- Enable Realtime for rooms and participants
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;

-- ----------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE CREATION ON SIGN-UP TRIGGER
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  user_name text;
begin
  -- Retrieve metadata fields passed during signUp
  user_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, user_name, user_role);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger linked to auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. SEED DATA (For initial testing)
-- ----------------------------------------------------------------------------
-- Note: Profiles can be populated for mock or direct testing.
-- To test in the database console, the following block seeds a teacher profile
-- if a matching user is registered.

-- INSERT INTO public.profiles (id, email, name, role) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'teacher@mathquest.com', 'Professor Newton', 'teacher')
-- ON CONFLICT (id) DO NOTHING;
