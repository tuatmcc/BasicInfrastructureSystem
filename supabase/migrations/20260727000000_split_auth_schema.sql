-- Separate the authentication tables from the domain.
--
-- Better Auth owns user/session/account/verification. They move into app_auth,
-- and every reference that crossed between them and the domain is removed, so
-- the authentication store can later be moved to its own database without
-- touching a domain table. A foreign key cannot span databases, which is why
-- the crossings are dropped now rather than when that move happens.
--
-- The link that remains is public.app_accounts.user_id: a value, not a foreign
-- key. It is the single place that knows an authentication subject exists.

set statement_timeout = 0;
set lock_timeout = '10s';

begin;

create schema if not exists app_auth;
comment on schema app_auth is
  'Authentication store owned by Better Auth. Nothing in here may reference a domain table.';

-- Move the authentication tables. Row level security state, policies and grants
-- follow the table, so they are not restated here.
alter table public."user" set schema app_auth;
alter table public.session set schema app_auth;
alter table public.account set schema app_auth;
alter table public.verification set schema app_auth;

grant usage on schema app_auth to app_rls;

-- The directory view reads user.member_id, so it is dropped before that column
-- can go. It is recreated against app_accounts at the end of this migration.
drop view if exists app_api.member_directory_entries;

-- The domain's own record of an authentication subject. role lives here because
-- the membership trigger authorizes against it, and a trigger cannot read
-- another database.
create table public.app_accounts (
  user_id text primary key,
  member_id uuid unique references public.members(member_id) on delete set null,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_accounts_role_valid check (role in ('user', 'admin')),
  constraint app_accounts_user_id_not_blank check (btrim(user_id) <> '')
);

comment on table public.app_accounts is
  'Domain-side account record. user_id is an opaque authentication subject, intentionally not a foreign key.';
comment on column public.app_accounts.user_id is
  'Authentication subject issued by the identity provider. Deliberately unconstrained so the provider can move to its own database.';

create index app_accounts_member_id_idx on public.app_accounts (member_id);

insert into public.app_accounts (user_id, member_id, role, created_at, updated_at)
select id, member_id, role, created_at, updated_at
from app_auth."user";

-- The authentication table no longer carries domain columns, so Better Auth
-- owns its schema outright.
alter table app_auth."user" drop constraint if exists user_member_id_fkey;
alter table app_auth."user" drop constraint if exists user_role_valid;
alter table app_auth."user" drop column if exists member_id;
alter table app_auth."user" drop column if exists role;

-- Remove the crossings that pointed from the domain into authentication. The
-- actor identifiers stay as snapshots, matching member_status_history, which
-- already stored its actor without a foreign key.
alter table public.members drop constraint if exists members_reviewed_by_user_id_fkey;
alter table public.community_identities drop constraint if exists community_identities_user_id_fkey;
alter table public.community_identities drop constraint if exists community_identities_auth_account_id_fkey;

comment on column public.members.reviewed_by_user_id is
  'Reviewer identity snapshot. Not a foreign key: the authentication store may live in another database.';
comment on column public.community_identities.user_id is
  'Authentication subject snapshot. Not a foreign key, for the same reason as members.reviewed_by_user_id.';
comment on column public.community_identities.auth_account_id is
  'Linked provider account issued by the identity store. Snapshot, not a foreign key.';

grant select, insert, update on public.app_accounts to app_rls;
alter table public.app_accounts enable row level security;
alter table public.app_accounts force row level security;

drop policy if exists app_accounts_app_backend on public.app_accounts;
create policy app_accounts_app_backend on public.app_accounts
  for all to app_rls using (true) with check (true);

-- The membership trigger authorized against the authentication table. It now
-- reads the domain's own account record.
create or replace function app_private.enforce_member_workflow()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  actor_id text := nullif(current_setting('app.current_user_id', true), '');
  actor_role text := nullif(current_setting('app.current_user_role', true), '');
begin
  if actor_id is null or actor_role not in ('user', 'admin') then
    raise exception using
      errcode = '23514',
      message = 'member workflow requires an authenticated user or admin actor';
  end if;

  if not exists (
    select 1
    from public.app_accounts actor
    where actor.user_id = actor_id
      and actor.role = actor_role
  ) then
    raise exception using
      errcode = '23514',
      message = 'member workflow actor does not match the persisted application role';
  end if;

  if tg_op = 'INSERT' then
    if new.member_status <> 'pending'
       or new.application_version <> 1
       or new.reviewed_at is not null
       or new.reviewed_by_user_id is not null
       or new.review_reason is not null
    then
      raise exception using
        errcode = '23514',
        message = 'new membership applications must start pending at version 1 without review metadata';
    end if;

    return new;
  end if;

  if new.member_id is distinct from old.member_id
     or new.created_at is distinct from old.created_at
  then
    raise exception using
      errcode = '23514',
      message = 'member identity and creation timestamp are immutable';
  end if;

  if new.application_version <> old.application_version + 1 then
    raise exception using
      errcode = '23514',
      message = 'member application version must increase by exactly one';
  end if;

  if new.member_status is not distinct from old.member_status then
    if new.submitted_at is distinct from old.submitted_at
       or new.reviewed_at is distinct from old.reviewed_at
       or new.reviewed_by_user_id is distinct from old.reviewed_by_user_id
       or new.review_reason is distinct from old.review_reason
    then
      raise exception using
        errcode = '23514',
        message = 'submission and review metadata can only change during a status transition';
    end if;
  elsif old.member_status = 'pending'
        and new.member_status in ('active', 'rejected') then
    if actor_role <> 'admin'
       or new.reviewed_at is null
       or new.reviewed_by_user_id is distinct from actor_id
       or new.submitted_at is distinct from old.submitted_at
       or (
         new.member_status = 'active'
         and new.review_reason is not null
       )
       or (
         new.member_status = 'rejected'
         and btrim(coalesce(new.review_reason, '')) = ''
       )
    then
      raise exception using
        errcode = '23514',
        message = 'only an admin may approve or reject a pending application with consistent review metadata';
    end if;
  elsif old.member_status = 'rejected'
        and new.member_status = 'pending' then
    if actor_role not in ('user', 'admin')
       or new.reviewed_at is not null
       or new.reviewed_by_user_id is not null
       or new.review_reason is not null
    then
      raise exception using
        errcode = '23514',
        message = 'resubmission must clear all review metadata';
    end if;
  elsif old.member_status = 'active'
        and new.member_status = 'withdrawn' then
    if actor_role <> 'admin'
       or new.reviewed_at is null
       or new.reviewed_by_user_id is distinct from actor_id
       or btrim(coalesce(new.review_reason, '')) = ''
       or new.submitted_at is distinct from old.submitted_at
    then
      raise exception using
        errcode = '23514',
        message = 'only an admin may withdraw an active member with a reason';
    end if;
  else
    raise exception using
      errcode = '23514',
      message = format(
        'invalid member status transition: %s -> %s',
        old.member_status,
        new.member_status
      );
  end if;

  return new;
end
$$;

-- The directory view reached into the authentication table to find the viewer
-- and the profile owner. Both now resolve through app_accounts.
create view app_api.member_directory_entries
with (security_barrier = true)
as
select
  profile.member_id,
  profile.display_name,
  grade.code as grade_code,
  grade.display_grade,
  profile.skills,
  profile.interests,
  profile.current_activities,
  profile.bio,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'provider', identity.provider,
        'communityId', membership.community_id,
        'nickname', membership.nickname,
        'roles', membership.role_names
      )
      order by identity.provider, membership.community_id
    ) filter (where membership.membership_status = 'member'),
    '[]'::jsonb
  ) as communities
from public.member_directory_profiles profile
join public.members member on member.member_id = profile.member_id
join public.grades grade on grade.id = member.grade_id
left join public.app_accounts account on account.member_id = member.member_id
left join public.community_identities identity on identity.user_id = account.user_id
left join public.community_memberships membership on membership.identity_id = identity.identity_id
where profile.directory_visible
  and member.member_status = 'active'
  and exists (
    select 1
    from public.app_accounts viewer_account
    join public.members viewer_member on viewer_member.member_id = viewer_account.member_id
    where viewer_account.user_id = current_setting('app.current_user_id', true)
      and viewer_member.member_status = 'active'
  )
group by
  profile.member_id,
  profile.display_name,
  grade.code,
  grade.display_grade,
  profile.skills,
  profile.interests,
  profile.current_activities,
  profile.bio;

revoke all on app_api.member_directory_entries from public;
grant select on app_api.member_directory_entries to app_rls;

comment on view app_api.member_directory_entries is
  'Allowlisted active-member directory; intentionally excludes all private member fields.';

commit;
