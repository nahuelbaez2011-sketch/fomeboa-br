-- FomeBoa SP: one user identity shared by browser, Android and iOS.
-- Run once in the Supabase SQL Editor of the project you own.
-- Never give the frontend a service-role / secret key.

create table if not exists public.fomeboa_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Explorador',
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fomeboa_display_name_length check (char_length(display_name) between 2 and 40)
);

alter table public.fomeboa_profiles enable row level security;
revoke all on table public.fomeboa_profiles from public, anon, authenticated;
grant select on table public.fomeboa_profiles to authenticated;
grant update (display_name) on table public.fomeboa_profiles to authenticated;

drop policy if exists "fomeboa_owner_select" on public.fomeboa_profiles;
create policy "fomeboa_owner_select"
on public.fomeboa_profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "fomeboa_owner_update_name" on public.fomeboa_profiles;
create policy "fomeboa_owner_update_name"
on public.fomeboa_profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.fomeboa_create_profile_on_signup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  if pg_catalog.char_length(chosen_name) < 2 then
    chosen_name := 'Explorador';
  end if;
  insert into public.fomeboa_profiles (id, display_name)
  values (new.id, pg_catalog.left(chosen_name,40))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.fomeboa_create_profile_on_signup() from public;
drop trigger if exists fomeboa_auth_user_created on auth.users;
create trigger fomeboa_auth_user_created
after insert on auth.users for each row
execute function public.fomeboa_create_profile_on_signup();

-- Existing accounts from an earlier Auth setup, if any:
insert into public.fomeboa_profiles(id,display_name)
select id,'Explorador' from auth.users
on conflict (id) do nothing;

-- Security invariant: browser clients may change display_name only.
-- XP and level are server-controlled; never award XP from browser JavaScript.
-- Use Supabase Dashboard > Authentication > Users to count registered users.
-- App Store release will require in-app account deletion with an authenticated backend.
