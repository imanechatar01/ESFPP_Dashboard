create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  status text not null default 'invited' check (status in ('invited', 'active', 'blocked')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'student');
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can complete their own profile" on public.profiles;
create policy "Users can complete their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.auth_role() = 'admin');

drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles"
on public.profiles
for all
to authenticated
using (public.auth_role() = 'admin')
with check (public.auth_role() = 'admin');

alter table if exists public."Admin" enable row level security;

drop policy if exists "Admins can read Admin records" on public."Admin";
create policy "Admins can read Admin records"
on public."Admin"
for select
to authenticated
using (public.auth_role() = 'admin');

drop policy if exists "Admins can manage Admin records" on public."Admin";
create policy "Admins can manage Admin records"
on public."Admin"
for all
to authenticated
using (public.auth_role() = 'admin')
with check (public.auth_role() = 'admin');
