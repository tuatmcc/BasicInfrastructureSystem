-- Roles and permissions, as decided in docs/aidlc/components.md section 3.
--
-- Three things make this different from the `app_accounts.role` column it will
-- replace:
--
--   * A role belongs to a member, not to a login account. A person who has not
--     joined cannot hold one, and losing a Discord account does not lose it.
--   * A member may hold several roles at once, so "treasurer and publicity" is
--     expressible without inventing a combined role.
--   * Permissions hang off roles. Nothing grants a permission to a member
--     directly, so there is one place to look to answer "why can they do that".
--
-- The old column stays for now. This migration only adds, so a deployment that
-- still reads the column keeps working; U-3 moves the checks across and U-4
-- drops the column.

begin;

-- What a permission is, as data rather than as a list in the source. Adding one
-- is an INSERT; the code that checks it still has to be written, but the set of
-- permissions is inspectable in the database.
create table public.permissions (
  permission_key text primary key,
  description text not null,
  created_at timestamptz not null default now(),
  constraint permissions_key_shape check (permission_key ~ '^[a-z][a-z_]*\.[a-z][a-z_]*$')
);

comment on table public.permissions is
  'Every permission the application can check. Referenced by role_permissions.';

-- Named app_roles, not roles: the pre-Better-Auth schema had a public.roles
-- table, and a test asserts it stays gone. Reusing the name would both defeat
-- that guard and make the two hard to tell apart when reading history. The
-- app_ prefix matches app_accounts, which exists for the same reason.
create table public.app_roles (
  role_key text primary key,
  display_name text not null,
  description text not null default '',
  -- A role the application depends on, so it cannot be deleted by an
  -- administrator tidying up. `member` and `admin` are both such roles.
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_roles_key_shape check (role_key ~ '^[a-z][a-z_]*$'),
  constraint app_roles_display_name_length check (char_length(display_name) between 1 and 100)
);

comment on table public.app_roles is
  'Named sets of permissions. "admin" is one row here, not a special case.';

create table public.role_permissions (
  role_key text not null references public.app_roles(role_key) on update cascade on delete cascade,
  permission_key text not null references public.permissions(permission_key) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

comment on table public.role_permissions is
  'Which permissions a role carries. The only path from a member to a permission.';

-- The foreign key is what enforces FR-4.6: there is no member row to point at
-- for someone who has not joined, so a role cannot be granted to them. Deleting
-- the member takes the grants with it.
create table public.member_roles (
  member_id uuid not null references public.members(member_id) on delete cascade,
  role_key text not null references public.app_roles(role_key) on update cascade on delete restrict,
  -- A snapshot, like member_status_history.changed_by_user_id: the account may
  -- be deleted later and the record of who granted this must survive it.
  granted_by_user_id text not null,
  granted_at timestamptz not null default now(),
  primary key (member_id, role_key)
);

comment on table public.member_roles is
  'Which roles a member holds. Roles attach to the member, never to the login account.';

create index member_roles_role_key_idx on public.member_roles (role_key);

insert into public.permissions (permission_key, description) values
  ('member.read_public',  'Read other members'' public directory entries'),
  ('member.read_private', 'Read members'' private details, including what the university asks for'),
  ('member.review',       'Approve or reject membership applications'),
  ('member.edit',         'Edit another member''s record'),
  ('role.manage',         'Grant and revoke roles'),
  ('event.manage',        'Create and read event announcements'),
  ('reaction.read',       'Read who reacted to an event announcement');

insert into public.app_roles (role_key, display_name, description, is_system) values
  ('member', '部員',   'Held by every active member. Carries directory access and nothing else.', true),
  ('admin',  '管理者', 'Runs the club''s side of the system.', true);

insert into public.role_permissions (role_key, permission_key)
select 'member', 'member.read_public'
union all
select 'admin', permission_key from public.permissions;

-- Carry the current state across. Every active member gets the base role, and
-- whoever the old column calls an admin also gets the admin role, so the two
-- representations agree until U-4 removes the column.
do $$
declare
  orphaned_admins text;
begin
  select string_agg(user_id, ', ')
    into orphaned_admins
  from public.app_accounts
  where role = 'admin'
    and member_id is null;

  if orphaned_admins is not null then
    -- docs/aidlc/intent.md 6.4 settles that an administrator is always a member.
    -- An account that is an admin without one contradicts that, and silently
    -- dropping its privileges during a migration would be worse than stopping.
    raise exception 'these admin accounts have no member row and cannot hold a role: %', orphaned_admins;
  end if;
end
$$;

insert into public.member_roles (member_id, role_key, granted_by_user_id)
select member_id, 'member', 'system:20260904000000'
from public.members
where member_status = 'active';

insert into public.member_roles (member_id, role_key, granted_by_user_id)
select account.member_id, 'admin', 'system:20260904000000'
from public.app_accounts account
join public.members member on member.member_id = account.member_id
where account.role = 'admin'
on conflict do nothing;

grant select on public.permissions to app_rls;
grant select on public.app_roles to app_rls;
grant select on public.role_permissions to app_rls;
grant select, insert, delete on public.member_roles to app_rls;

alter table public.permissions enable row level security;
alter table public.permissions force row level security;
alter table public.app_roles enable row level security;
alter table public.app_roles force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
alter table public.member_roles enable row level security;
alter table public.member_roles force row level security;

-- These policies still ask whether the actor's role is 'admin', which is the
-- thing U-3 exists to remove. They cannot ask about permissions yet: nothing
-- installs the actor's permissions into the request context until U-2. U-3
-- rewrites every one of them, here and in the earlier migration, together.

create policy permissions_select on public.permissions
  for select to app_rls
  using (true);

create policy roles_select on public.app_roles
  for select to app_rls
  using (true);

create policy role_permissions_select on public.role_permissions
  for select to app_rls
  using (true);

-- A member sees their own grants; an administrator sees everyone's.
create policy member_roles_select_self_or_admin on public.member_roles
  for select to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  );

create policy member_roles_insert_admin on public.member_roles
  for insert to app_rls
  with check ((select current_setting('app.current_user_role', true)) = 'admin');

create policy member_roles_delete_admin on public.member_roles
  for delete to app_rls
  using ((select current_setting('app.current_user_role', true)) = 'admin');

commit;
