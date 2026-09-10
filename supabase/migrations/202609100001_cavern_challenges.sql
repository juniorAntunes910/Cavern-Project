-- Cavern Challenges: configuration is syncable; progress remains derived from source events.
create type public.challenge_status as enum ('DRAFT', 'ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED');
create type public.challenge_type as enum ('FOCUS', 'FITNESS', 'READING', 'HABITS', 'FINANCE', 'FULL_CAVERN', 'CUSTOM');
create type public.challenge_difficulty as enum ('EASY', 'NORMAL', 'HARD', 'EXTREME');

create table public.challenges (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0), description text not null default '',
  type public.challenge_type not null, difficulty public.challenge_difficulty not null default 'NORMAL', status public.challenge_status not null default 'DRAFT',
  start_date date not null, end_date date not null, duration_days integer not null check (duration_days > 0),
  rules jsonb not null default '[]'::jsonb, checkpoints jsonb not null default '[]'::jsonb, rewards jsonb not null default '[]'::jsonb,
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create table public.challenge_rule_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade, rule_id uuid not null,
  date date not null, value numeric not null check (value >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (challenge_id, rule_id, date)
);
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null, ended_at timestamptz, duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null check (status in ('active', 'paused', 'completed', 'cancelled')),
  goal_id uuid references public.goals(id) on delete set null, habit_id uuid references public.habits(id) on delete set null,
  challenge_id uuid references public.challenges(id) on delete set null, project_name text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.xp_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null, points integer not null check (points > 0), title text not null, created_at timestamptz not null default now(), unique (user_id, source_key)
);
alter table public.xp_ledger add column embers integer not null default 0;
create table public.inventory_items (
  user_id uuid not null references auth.users(id) on delete cascade, item_id text not null,
  acquired_at timestamptz not null default now(), acquisition_type text not null,
  primary key (user_id, item_id)
);
create table public.user_customizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  fire_skin_id text not null default 'fire-classic', mascot_id text not null default 'bot-mk1',
  head_item_id text, body_item_id text, accessory_item_id text, effect_item_id text, updated_at timestamptz not null default now()
);
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null, description text, metadata jsonb, created_at timestamptz not null default now()
);
create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade, achievement_id text not null, unlocked_at timestamptz not null default now(), primary key (user_id, achievement_id)
);
alter table public.challenges enable row level security; alter table public.challenge_rule_logs enable row level security; alter table public.focus_sessions enable row level security; alter table public.xp_ledger enable row level security; alter table public.timeline_events enable row level security; alter table public.user_achievements enable row level security;
alter table public.inventory_items enable row level security; alter table public.user_customizations enable row level security;
create policy "challenges own rows" on public.challenges for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "challenge logs own rows" on public.challenge_rule_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "focus sessions own rows" on public.focus_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "xp own rows" on public.xp_ledger for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "timeline own rows" on public.timeline_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "achievements own rows" on public.user_achievements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "inventory own rows" on public.inventory_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "customization own row" on public.user_customizations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger challenges_updated_at before update on public.challenges for each row execute function public.set_updated_at();
create trigger challenge_rule_logs_updated_at before update on public.challenge_rule_logs for each row execute function public.set_updated_at();
create trigger focus_sessions_updated_at before update on public.focus_sessions for each row execute function public.set_updated_at();
