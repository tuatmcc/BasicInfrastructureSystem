-- Allow authenticated users to read their own member row and admins to read/update all.
alter table public.members enable row level security;

alter table public.members force row level security;

drop policy if exists members_select_own_or_admin on public.members;
create policy members_select_own_or_admin
on public.members
for select
using (
  member_id = nullif(auth.jwt() -> 'app_metadata' ->> 'member_id', '')::uuid
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

drop policy if exists members_update_own_or_admin on public.members;
create policy members_update_own_or_admin
on public.members
for update
using (
  member_id = nullif(auth.jwt() -> 'app_metadata' ->> 'member_id', '')::uuid
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
)
with check (
  member_id = nullif(auth.jwt() -> 'app_metadata' ->> 'member_id', '')::uuid
  or exists (
    select 1
    from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
    where lower(role_name.role) = 'admin'
  )
);

grant select, update on public.members to authenticated;
