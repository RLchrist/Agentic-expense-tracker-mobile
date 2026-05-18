-- Add language column to public.profiles if not exists
alter table public.profiles
  add column if not exists language text default 'en';
