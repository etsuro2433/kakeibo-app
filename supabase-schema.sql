-- 家計簿アプリ Supabase スキーマ
create table if not exists transactions (
  id text primary key,
  household_id text not null,
  date text not null,
  type text not null,
  amount numeric not null,
  category_id text not null,
  cost_type text,
  payment_method text not null,
  card_name text,
  memo text,
  receipt_data_url text,
  recurring_id text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_household_idx on transactions(household_id, date desc);

create table if not exists categories (
  id text primary key,
  household_id text not null,
  name text not null,
  type text not null,
  color text not null
);
create index if not exists categories_household_idx on categories(household_id);

create table if not exists budgets (
  household_id text not null,
  category_id text not null,
  amount numeric not null,
  primary key (household_id, category_id)
);

create table if not exists recurring_rules (
  id text primary key,
  household_id text not null,
  name text not null,
  day_of_month integer not null,
  type text not null,
  amount numeric not null,
  category_id text not null,
  cost_type text,
  payment_method text not null,
  card_name text,
  memo text,
  active boolean not null default true,
  start_month text not null,
  generated_months text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists recurring_household_idx on recurring_rules(household_id);

create table if not exists household_cards (
  household_id text not null,
  name text not null,
  sort_order integer not null default 0,
  primary key (household_id, name)
);

-- Row Level Security (全員読み書き可 ─ 世帯IDで論理的に分離)
alter table transactions enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table recurring_rules enable row level security;
alter table household_cards enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='transactions' and policyname='open_access') then
    create policy "open_access" on transactions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='categories' and policyname='open_access') then
    create policy "open_access" on categories for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='budgets' and policyname='open_access') then
    create policy "open_access" on budgets for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='recurring_rules' and policyname='open_access') then
    create policy "open_access" on recurring_rules for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='household_cards' and policyname='open_access') then
    create policy "open_access" on household_cards for all using (true) with check (true);
  end if;
end $$;

-- リアルタイム配信を有効化
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table budgets;
alter publication supabase_realtime add table recurring_rules;
alter publication supabase_realtime add table household_cards;
