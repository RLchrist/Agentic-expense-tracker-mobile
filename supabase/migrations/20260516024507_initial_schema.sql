-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  currency text default 'NPR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CATEGORIES
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- EXPENSES
create table if not exists public.expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount decimal(12,2) not null,
  currency text default 'NPR',
  category_id uuid references public.categories(id),
  title text not null,
  note text,
  receipt_url text,
  expense_date date default current_date,
  payment_method text default 'cash',
  is_synced boolean default true,
  local_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- BUDGETS
create table if not exists public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id),
  amount decimal(12,2) not null,
  period text default 'monthly',
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);

-- SYNC QUEUE
create table if not exists public.sync_queue (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  operation text not null,
  table_name text not null,
  record_id uuid not null,
  payload jsonb not null,
  synced_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.sync_queue enable row level security;

-- RLS POLICIES
-- RLS POLICIES
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can manage own profile'
  ) then
    create policy "Users can manage own profile"
      on public.profiles for all using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'categories' and policyname = 'Users can manage own categories'
  ) then
    create policy "Users can manage own categories"
      on public.categories for all using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'expenses' and policyname = 'Users can manage own expenses'
  ) then
    create policy "Users can manage own expenses"
      on public.expenses for all using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'budgets' and policyname = 'Users can manage own budgets'
  ) then
    create policy "Users can manage own budgets"
      on public.budgets for all using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'sync_queue' and policyname = 'Users can manage own sync queue'
  ) then
    create policy "Users can manage own sync queue"
      on public.sync_queue for all using (auth.uid() = user_id);
  end if;
end $$;

-- AUTO updated_at TRIGGER
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_expenses_updated_at on public.expenses;
create trigger update_expenses_updated_at
  before update on public.expenses
  for each row execute function update_updated_at();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

drop trigger if exists on_new_user_created on public.profiles;
create trigger on_new_user_created
  after insert on public.profiles
  for each row execute function create_default_categories();

-- DEFAULT CATEGORIES TRIGGER
create or replace function create_default_categories()
returns trigger as $$
begin
  if not exists (
    select 1 from public.categories where user_id = new.id
  ) then
    insert into public.categories (user_id, name, icon, color, is_default) values
      (new.id, 'Food & Dining',   '🍜', '#FF6B6B', true),
      (new.id, 'Transport',       '🚌', '#4ECDC4', true),
      (new.id, 'Shopping',        '🛍️', '#45B7D1', true),
      (new.id, 'Utilities',       '💡', '#96CEB4', true),
      (new.id, 'Health',          '💊', '#FFEAA7', true),
      (new.id, 'Entertainment',   '🎬', '#DDA0DD', true),
      (new.id, 'Education',       '📚', '#98D8C8', true),
      (new.id, 'Other',           '📦', '#B0B0B0', true);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_user_created
  after insert on public.profiles
  for each row execute function create_default_categories();