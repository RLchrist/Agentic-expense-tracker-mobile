-- This already exists (you created it in Step 12)
alter table public.expenses
  add column if not exists ai_parsed boolean default false,
  add column if not exists ai_confidence decimal(3,2);  