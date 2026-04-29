-- Move MemberDatabase ownership checks to public.members.auth_user_id.

drop trigger if exists on_auth_user_created_create_member on auth.users;

drop function if exists public.save_current_user_registration(text, integer, text, text, text, boolean, boolean, text);
drop function if exists public.patch_current_user_member(text, integer, text, text, text, boolean, boolean, text);
drop function if exists public.save_current_user_discord_link(text, text);
drop function if exists public.set_current_user_display_name(text);
drop function if exists public.get_current_user_display_name();
drop function if exists public.handle_new_auth_user_create_member();
drop function if exists public.resolve_member_id_for_current_user();
drop function if exists public.ensure_current_user_member_seed();
drop function if exists public.ensure_member_seed_for_auth_user(uuid);
drop function if exists public.upsert_user_auth_link(uuid, uuid, text);

alter table public.users
  add column if not exists auth_user_id uuid references auth.users(id),
  add column if not exists discord_id text,
  add column if not exists display_name text not null default '',
  add column if not exists member_id uuid references public.members(member_id);

alter table public.members
  add column if not exists auth_user_id uuid references auth.users(id);

update public.members as members
set auth_user_id = users.auth_user_id
from public.users as users
where members.auth_user_id is null
  and users.auth_user_id is not null
  and users.member_id = members.member_id;

do $$
begin
  if exists (
    select 1
    from public.members
    where auth_user_id is null
  ) then
    raise exception 'public.members.auth_user_id backfill failed: member rows without users.auth_user_id linkage remain';
  end if;
end;
$$;

alter table public.members
  alter column auth_user_id set not null;

create unique index if not exists members_auth_user_id_uidx
  on public.members (auth_user_id);

do $$
begin
  if exists (
    select 1
    from public.users
    where auth_user_id is null
  ) then
    raise exception 'public.users.auth_user_id contains null rows';
  end if;
end;
$$;

alter table public.users
  alter column auth_user_id set not null;

drop index if exists public.users_auth_user_id_uidx;

create unique index users_auth_user_id_uidx
  on public.users (auth_user_id);

create unique index if not exists users_discord_id_uidx
  on public.users (discord_id)
  where discord_id is not null;

alter table public.members enable row level security;
alter table public.members force row level security;

drop policy if exists members_select_own_or_admin on public.members;
drop policy if exists members_update_own_or_admin on public.members;
drop policy if exists members_insert_own_or_admin on public.members;

create policy members_select_own_or_admin
on public.members
for select
using (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

create policy members_insert_own_or_admin
on public.members
for insert
with check (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

create policy members_update_own_or_admin
on public.members
for update
using (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
)
with check (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

grant select, insert, update on public.members to authenticated;

alter table public.users enable row level security;
alter table public.users force row level security;

drop policy if exists users_select_own_or_admin on public.users;
drop policy if exists users_insert_own_or_admin on public.users;
drop policy if exists users_update_own_or_admin on public.users;

create policy users_select_own_or_admin
on public.users
for select
using (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

create policy users_insert_own_or_admin
on public.users
for insert
with check (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

create policy users_update_own_or_admin
on public.users
for update
using (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
)
with check (
  auth_user_id = auth.uid()
  or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

grant select, insert, update on public.users to authenticated;
