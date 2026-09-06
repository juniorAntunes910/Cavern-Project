-- Remove the retired focus-cycle feature while retaining users' goals and habits.
alter table public.goals drop constraint if exists goals_cavern_id_fkey;
alter table public.habits drop constraint if exists habits_cavern_id_fkey;
alter table public.goals drop column if exists cavern_id;
alter table public.habits drop column if exists cavern_id;
drop policy if exists "caverns own rows" on public.caverns;
drop table if exists public.caverns;
drop type if exists public.cavern_status;

create table public.goal_habit_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (goal_id, habit_id)
);

create type public.finance_kind as enum ('income', 'expense', 'transfer', 'buy_btc', 'sell_btc', 'contribution');
create type public.finance_goal_currency as enum ('BRL', 'BTC');
create type public.finance_goal_status as enum ('active', 'completed', 'cancelled');
create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  kind public.finance_kind not null,
  amount_brl numeric(16,2) not null check (amount_brl >= 0),
  btc_amount numeric(20,8),
  btc_unit_price_brl numeric(16,2),
  category text not null default '', account text not null default '', note text,
  created_at timestamptz not null default now(),
  check ((kind in ('buy_btc', 'sell_btc')) = (btc_amount is not null and btc_unit_price_brl is not null))
);
create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  target_amount numeric(20,8) not null check (target_amount > 0),
  currency public.finance_goal_currency not null,
  deadline date, saved_amount numeric(20,8) not null default 0 check (saved_amount >= 0),
  status public.finance_goal_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.goal_habit_links enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.financial_goals enable row level security;
create policy "goal habit links own rows" on public.goal_habit_links for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "finance transactions own rows" on public.finance_transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "financial goals own rows" on public.financial_goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger financial_goals_updated_at before update on public.financial_goals for each row execute function public.set_updated_at();

-- Keep relation ownership checks valid after cavern_id is retired.
create or replace function public.assert_owned_relation()
returns trigger language plpgsql security invoker set search_path = public as $$
declare owner_id uuid;
begin
  if tg_table_name = 'habit_logs' then select user_id into owner_id from habits where id = new.habit_id;
  elsif tg_table_name = 'reading_sessions' then select user_id into owner_id from books where id = new.book_id;
  elsif tg_table_name = 'goal_habit_links' then
    select user_id into owner_id from goals where id = new.goal_id;
    if owner_id is null or owner_id <> new.user_id then raise exception 'Referenced goal must belong to the same user'; end if;
    select user_id into owner_id from habits where id = new.habit_id;
  else return new;
  end if;
  if owner_id is null or owner_id <> new.user_id then raise exception 'Referenced record must belong to the same user'; end if;
  return new;
end;
$$;
create trigger goal_habit_links_owned before insert or update on public.goal_habit_links for each row execute function public.assert_owned_relation();
