-- Cavern Project initial schema. Run with `supabase db push`.
create extension if not exists pgcrypto;

create type public.cavern_status as enum ('planned', 'active', 'completed', 'cancelled');
create type public.goal_metric as enum ('pages_read', 'reading_minutes', 'study_minutes', 'workouts', 'habit_days', 'custom');
create type public.period_type as enum ('daily', 'weekly', 'monthly', 'total');
create type public.goal_status as enum ('active', 'completed', 'cancelled');
create type public.habit_type as enum ('positive', 'abstinence');
create type public.habit_log_status as enum ('completed', 'failed', 'skipped');
create type public.book_status as enum ('want_to_read', 'reading', 'finished', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caverns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  start_date date not null,
  end_date date not null,
  status public.cavern_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cavern_id uuid references public.caverns(id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  metric public.goal_metric not null,
  period_type public.period_type not null,
  target_value numeric(12,2) not null check (target_value > 0),
  unit text not null check (char_length(trim(unit)) > 0),
  start_date date not null,
  end_date date not null,
  status public.goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cavern_id uuid references public.caverns(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  type public.habit_type not null,
  target_days smallint check (target_days is null or target_days between 1 and 7),
  started_at date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  status public.habit_log_status not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  author text,
  file_name text not null check (char_length(trim(file_name)) > 0),
  file_path text not null check (char_length(trim(file_path)) > 0),
  storage_path text,
  total_pages integer not null check (total_pages > 0),
  current_page integer not null default 1 check (current_page > 0),
  status public.book_status not null default 'want_to_read',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_page <= total_pages),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  start_page integer not null check (start_page > 0),
  end_page integer not null check (end_page > 0),
  max_page_reached integer not null check (max_page_reached > 0),
  pages_read integer not null check (pages_read >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  check (max_page_reached >= start_page),
  check (pages_read = greatest(0, max_page_reached - start_page)),
  check (ended_at is null or ended_at >= started_at)
);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  discipline_score smallint not null check (discipline_score between 1 and 5),
  focus_score smallint not null check (focus_score between 1 and 5),
  energy_score smallint not null check (energy_score between 1 and 5),
  good_today text,
  improve_tomorrow text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index goals_user_period_idx on public.goals (user_id, start_date, end_date);
create index habit_logs_user_date_idx on public.habit_logs (user_id, date desc);
create index reading_sessions_user_started_idx on public.reading_sessions (user_id, started_at desc);
create index reading_sessions_book_started_idx on public.reading_sessions (book_id, started_at desc);
create index books_user_status_idx on public.books (user_id, status);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create or replace function public.assert_owned_relation()
returns trigger language plpgsql security invoker set search_path = public as $$
declare owner_id uuid;
begin
  if tg_table_name = 'goals' and new.cavern_id is not null then select user_id into owner_id from caverns where id = new.cavern_id;
  elsif tg_table_name = 'habits' and new.cavern_id is not null then select user_id into owner_id from caverns where id = new.cavern_id;
  elsif tg_table_name = 'habit_logs' then select user_id into owner_id from habits where id = new.habit_id;
  elsif tg_table_name = 'reading_sessions' then select user_id into owner_id from books where id = new.book_id;
  else return new;
  end if;
  if owner_id is null or owner_id <> new.user_id then raise exception 'Referenced record must belong to the same user'; end if;
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger caverns_updated_at before update on public.caverns for each row execute function public.set_updated_at();
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();
create trigger habits_updated_at before update on public.habits for each row execute function public.set_updated_at();
create trigger books_updated_at before update on public.books for each row execute function public.set_updated_at();
create trigger checkins_updated_at before update on public.daily_checkins for each row execute function public.set_updated_at();
create trigger goals_owned before insert or update on public.goals for each row execute function public.assert_owned_relation();
create trigger habits_owned before insert or update on public.habits for each row execute function public.assert_owned_relation();
create trigger habit_logs_owned before insert or update on public.habit_logs for each row execute function public.assert_owned_relation();
create trigger sessions_owned before insert or update on public.reading_sessions for each row execute function public.assert_owned_relation();
create trigger auth_user_profile after insert on auth.users for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.caverns enable row level security;
alter table public.goals enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.daily_checkins enable row level security;

create policy "profiles own rows" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "caverns own rows" on public.caverns for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals own rows" on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habits own rows" on public.habits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "habit logs own rows" on public.habit_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "books own rows" on public.books for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions own rows" on public.reading_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checkins own rows" on public.daily_checkins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public) values ('books', 'books', false) on conflict (id) do update set public = false;
create policy "books storage own objects" on storage.objects for all to authenticated
using (bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text);
