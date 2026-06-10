-- Fix: profiles table is missing updated_at column but the trigger references it.
-- This migration adds the column and recreates the trigger cleanly.

-- 1. Drop the broken trigger
drop trigger if exists profiles_set_updated_at on public.profiles;

-- 2. Add the missing updated_at column
alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

-- 3. Backfill updated_at for existing rows
update public.profiles set updated_at = created_at where updated_at = now();

-- 4. Recreate the function (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5. Recreate the trigger
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
