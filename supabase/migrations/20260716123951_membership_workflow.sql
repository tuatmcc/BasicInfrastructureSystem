-- Install the membership application workflow after the Better Auth baseline.
--
-- This migration never deletes identity or membership data. The separately
-- reviewed purge runbook must leave all six replaced tables empty before this
-- file is applied. Event message records are retained.

set statement_timeout = 0;
set lock_timeout = '10s';

-- Freeze authentication and membership writes between the emptiness check and
-- the table replacement. The lock timeout makes a busy deployment fail safely.
lock table
  public.verification,
  public.session,
  public.account,
  public."user",
  public.members,
  public.grades
in access exclusive mode;

-- Refuse to replace the schema until the reviewed one-off purge has completed.
do $$
declare
  verification_count bigint;
  session_count bigint;
  user_count bigint;
  account_count bigint;
  member_count bigint;
  grade_count bigint;
begin
  select count(*) into verification_count from public.verification;
  select count(*) into session_count from public.session;
  select count(*) into user_count from public."user";
  select count(*) into account_count from public.account;
  select count(*) into member_count from public.members;
  select count(*) into grade_count from public.grades;

  if (verification_count, session_count, user_count, account_count, member_count, grade_count)
     <> (0, 0, 0, 0, 0, 0) then
    raise exception using
      message = format(
        'membership workflow requires empty replaced tables (verification=%s sessions=%s users=%s accounts=%s members=%s grades=%s)',
        verification_count,
        session_count,
        user_count,
        account_count,
        member_count,
        grade_count
      ),
      hint = 'Run and audit supabase/runbooks/purge_confirmed_test_membership_data.sql before retrying.';
  end if;
end
$$;

-- Recreate the application tables from a known-empty state. The obsolete user
-- columns are dropped only after the reviewed purge has removed test accounts.
alter table public."user" drop constraint if exists user_member_id_fkey;
alter table public."user" drop column if exists discord_user_id;
alter table public."user" drop column if exists display_name;

drop table public.members;
drop table public.grades;

create table public.grades (
  id integer primary key,
  code text not null unique,
  display_grade text not null unique,
  sort_order smallint not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_code_not_blank check (btrim(code) <> ''),
  constraint grades_display_not_blank check (btrim(display_grade) <> '')
);

insert into public.grades (id, code, display_grade, sort_order)
values
  (1, 'B1', 'B1', 10),
  (2, 'B2', 'B2', 20),
  (3, 'B3', 'B3', 30),
  (4, 'B4', 'B4', 40),
  (5, 'M1', 'M1', 50),
  (6, 'M2', 'M2', 60),
  (7, 'D1', 'D1', 70),
  (8, 'D2', 'D2', 80),
  (9, 'D3', 'D3', 90),
  (10, 'OB_OG', 'OB/OG', 100),
  (11, 'OTHER', 'その他', 110);

create table public.members (
  member_id uuid primary key default gen_random_uuid(),
  registered_name text not null,
  grade_id integer not null references public.grades(id) on delete restrict,
  emergency_contact text not null,
  student_id text not null,
  student_email text not null,
  insurance boolean not null default false,
  some_allergy boolean not null default false,
  allergy_details text,
  member_status text not null default 'pending',
  application_version integer not null default 1,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id text references public."user"(id) on delete restrict,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_registered_name_format check (
    registered_name = btrim(registered_name)
    and char_length(registered_name) between 1 and 200
  ),
  constraint members_emergency_contact_format check (
    emergency_contact = btrim(emergency_contact)
    and char_length(emergency_contact) between 1 and 500
  ),
  constraint members_student_id_normalized check (
    student_id = upper(btrim(student_id))
    and char_length(student_id) between 1 and 64
  ),
  constraint members_student_email_normalized check (
    student_email = lower(btrim(student_email))
    and char_length(student_email) <= 320
    and student_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint members_allergy_details_length check (
    allergy_details is null or char_length(allergy_details) <= 2000
  ),
  constraint members_status_valid check (
    member_status in ('pending', 'active', 'rejected', 'withdrawn')
  ),
  constraint members_application_version_positive check (application_version > 0),
  constraint members_rejection_reason_required check (
    member_status <> 'rejected'
    or btrim(coalesce(review_reason, '')) <> ''
  ),
  constraint members_review_timestamp_required check (
    member_status not in ('active', 'rejected') or reviewed_at is not null
  )
);

comment on column public.members.reviewed_by_user_id is
  'Reviewer identity. Referenced users cannot be deleted while a review points to them.';

create unique index members_student_id_unique
  on public.members (student_id);
create unique index members_student_email_unique
  on public.members (student_email);
create index members_grade_id_idx
  on public.members (grade_id);
create index members_status_submitted_idx
  on public.members (member_status, submitted_at desc, member_id);
create index members_reviewed_by_user_id_idx
  on public.members (reviewed_by_user_id);

alter table public."user"
  add constraint user_member_id_fkey
  foreign key (member_id)
  references public.members(member_id)
  on delete set null;

alter table public."user" drop constraint if exists user_role_valid;
alter table public."user"
  add constraint user_role_valid check (role in ('user', 'admin'));

create unique index if not exists user_member_id_unique
  on public."user" (member_id)
  where member_id is not null;
create index if not exists user_member_id_idx
  on public."user" (member_id);

alter table public.account drop constraint if exists account_provider_account_unique;
alter table public.account
  add constraint account_provider_account_unique unique (provider_id, account_id);
create index if not exists account_user_id_idx
  on public.account (user_id);
create index if not exists session_user_id_expires_at_idx
  on public.session (user_id, expires_at desc);
create index if not exists session_expires_at_idx
  on public.session (expires_at);
create index if not exists verification_identifier_expires_at_idx
  on public.verification (identifier, expires_at);

create table public.member_directory_profiles (
  member_id uuid primary key references public.members(member_id) on delete cascade,
  display_name text not null,
  skills text[] not null default array[]::text[],
  interests text[] not null default array[]::text[],
  current_activities text not null default '',
  bio text not null default '',
  directory_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_directory_display_name_format check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 100
  ),
  constraint member_directory_skills_limit check (cardinality(skills) <= 30),
  constraint member_directory_interests_limit check (cardinality(interests) <= 30),
  constraint member_directory_activities_length check (char_length(current_activities) <= 2000),
  constraint member_directory_bio_length check (char_length(bio) <= 2000)
);

create table public.community_identities (
  identity_id uuid primary key default gen_random_uuid(),
  user_id text not null references public."user"(id) on delete cascade,
  auth_account_id text not null unique references public.account(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  username text not null,
  provider_display_name text,
  avatar_url text,
  oauth_verified_at timestamptz not null,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_identities_provider_not_blank check (btrim(provider) <> ''),
  constraint community_identities_account_not_blank check (btrim(provider_account_id) <> ''),
  constraint community_identities_username_not_blank check (btrim(username) <> ''),
  constraint community_identities_user_provider_unique unique (user_id, provider),
  constraint community_identities_provider_account_unique unique (provider, provider_account_id)
);

create index community_identities_user_id_idx
  on public.community_identities (user_id);

create table public.community_memberships (
  identity_id uuid not null references public.community_identities(identity_id) on delete cascade,
  community_id text not null,
  membership_status text not null default 'unknown',
  nickname text,
  role_ids text[] not null default array[]::text[],
  role_names text[] not null default array[]::text[],
  verified_at timestamptz,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (identity_id, community_id),
  constraint community_memberships_community_not_blank check (btrim(community_id) <> ''),
  constraint community_memberships_status_valid check (
    membership_status in ('member', 'not_member', 'unknown')
  ),
  constraint community_memberships_member_verified check (
    membership_status <> 'member' or verified_at is not null
  )
);

create index community_memberships_community_status_idx
  on public.community_memberships (community_id, membership_status);

create table public.member_status_history (
  history_id bigint generated always as identity primary key,
  member_id uuid not null references public.members(member_id) on delete restrict,
  from_status text,
  to_status text not null,
  changed_by_user_id text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint member_status_history_from_valid check (
    from_status is null or from_status in ('pending', 'active', 'rejected', 'withdrawn')
  ),
  constraint member_status_history_to_valid check (
    to_status in ('pending', 'active', 'rejected', 'withdrawn')
  ),
  constraint member_status_history_reason_length check (
    reason is null or char_length(reason) <= 2000
  )
);

comment on column public.member_status_history.changed_by_user_id is
  'Immutable actor ID snapshot. Deliberately has no user foreign key so account deletion cannot erase attribution.';

create index member_status_history_member_created_idx
  on public.member_status_history (member_id, created_at desc);
create index member_status_history_to_status_created_idx
  on public.member_status_history (to_status, created_at desc);
create index member_status_history_changed_by_idx
  on public.member_status_history (changed_by_user_id);

-- Private trigger functions are deliberately kept out of the Data API schema.
create schema if not exists app_private;
revoke all on schema app_private from public;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

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
    from public."user" actor
    where actor.id = actor_id
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

create or replace function app_private.record_member_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id text;
  transition_reason text;
begin
  if tg_op = 'INSERT' or new.member_status is distinct from old.member_status then
    actor_id := nullif(current_setting('app.current_user_id', true), '');
    transition_reason := coalesce(
      nullif(current_setting('app.member_status_reason', true), ''),
      nullif(new.review_reason, '')
    );

    insert into public.member_status_history (
      member_id,
      from_status,
      to_status,
      changed_by_user_id,
      reason
    ) values (
      new.member_id,
      case when tg_op = 'INSERT' then null else old.member_status end,
      new.member_status,
      actor_id,
      transition_reason
    );
  end if;

  return new;
end
$$;

create or replace function app_private.enforce_directory_visibility()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.directory_visible and not exists (
    select 1
    from public.members
    where member_id = new.member_id
      and member_status = 'active'
  ) then
    raise exception 'directory profile can only be visible for an active member';
  end if;

  return new;
end
$$;

create or replace function app_private.hide_inactive_directory_profile()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.member_status <> 'active' and old.member_status is distinct from new.member_status then
    update public.member_directory_profiles
    set directory_visible = false,
        updated_at = now()
    where member_id = new.member_id
      and directory_visible;
  end if;

  return new;
end
$$;

create trigger grades_set_updated_at
before update on public.grades
for each row execute function app_private.set_updated_at();

create trigger members_set_updated_at
before update on public.members
for each row execute function app_private.set_updated_at();

create trigger members_workflow_guard
before insert or update on public.members
for each row execute function app_private.enforce_member_workflow();

create trigger member_directory_profiles_set_updated_at
before update on public.member_directory_profiles
for each row execute function app_private.set_updated_at();

create trigger community_identities_set_updated_at
before update on public.community_identities
for each row execute function app_private.set_updated_at();

create trigger community_memberships_set_updated_at
before update on public.community_memberships
for each row execute function app_private.set_updated_at();

create trigger member_status_history_append
after insert or update of member_status on public.members
for each row execute function app_private.record_member_status_change();

create trigger member_directory_visibility_check
before insert or update of directory_visible on public.member_directory_profiles
for each row execute function app_private.enforce_directory_visibility();

create trigger member_directory_hide_inactive
after update of member_status on public.members
for each row execute function app_private.hide_inactive_directory_profile();

-- The runtime connects as app_rls. Data API roles receive no table/function
-- privileges, and every public table still has RLS as a second line of defense.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_rls') then
    create role app_rls nologin noinherit;
  end if;

  execute format('grant app_rls to %I', current_user);
end
$$;

grant usage on schema public to app_rls;
revoke all on schema app_private from public, app_rls;
revoke execute on all functions in schema app_private from public, app_rls;

revoke execute on all functions in schema public from public;
revoke all on all tables in schema public from app_rls;
revoke all on all sequences in schema public from app_rls;

alter default privileges in schema public
  revoke execute on functions from public;
alter default privileges in schema public
  revoke all on tables from app_rls;
alter default privileges in schema public
  revoke all on sequences from app_rls;
alter default privileges in schema app_private
  revoke execute on functions from public, app_rls;

grant select, insert, update, delete on public."user", public.account, public.session, public.verification to app_rls;
grant select on public.grades to app_rls;
grant select, insert, update on public.members to app_rls;
grant select, insert, update on public.member_directory_profiles to app_rls;
grant select, insert, update on public.community_identities, public.community_memberships to app_rls;
grant select on public.member_status_history to app_rls;
grant select, insert, update, delete on public.event_messages to app_rls;

alter table public."user" enable row level security;
alter table public.account enable row level security;
alter table public.session enable row level security;
alter table public.verification enable row level security;
alter table public.grades enable row level security;
alter table public.members enable row level security;
alter table public.member_directory_profiles enable row level security;
alter table public.community_identities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.member_status_history enable row level security;
alter table public.event_messages enable row level security;

alter table public."user" force row level security;
alter table public.account force row level security;
alter table public.session force row level security;
alter table public.verification force row level security;
alter table public.grades force row level security;
alter table public.members force row level security;
alter table public.member_directory_profiles force row level security;
alter table public.community_identities force row level security;
alter table public.community_memberships force row level security;
alter table public.member_status_history force row level security;
alter table public.event_messages force row level security;

drop policy if exists user_app_backend on public."user";
create policy user_app_backend on public."user"
  for all to app_rls using (true) with check (true);

drop policy if exists account_app_backend on public.account;
create policy account_app_backend on public.account
  for all to app_rls using (true) with check (true);

drop policy if exists session_app_backend on public.session;
create policy session_app_backend on public.session
  for all to app_rls using (true) with check (true);

drop policy if exists verification_app_backend on public.verification;
create policy verification_app_backend on public.verification
  for all to app_rls using (true) with check (true);

drop policy if exists grades_select_app_user on public.grades;
create policy grades_select_app_user on public.grades
  for select to app_rls
  using ((select current_setting('app.current_user_id', true)) <> '');

drop policy if exists members_select_self_or_admin on public.members;
create policy members_select_self_or_admin on public.members
  for select to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  );

drop policy if exists members_insert_self_or_admin on public.members;
create policy members_insert_self_or_admin on public.members
  for insert to app_rls
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or (
      (select current_setting('app.current_user_id', true)) <> ''
      and member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
    )
  );

drop policy if exists members_update_self_or_admin on public.members;
create policy members_update_self_or_admin on public.members
  for update to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  )
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  );

drop policy if exists member_directory_profiles_select_self_or_admin on public.member_directory_profiles;
create policy member_directory_profiles_select_self_or_admin on public.member_directory_profiles
  for select to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  );

drop policy if exists member_directory_profiles_insert_admin on public.member_directory_profiles;
create policy member_directory_profiles_insert_admin on public.member_directory_profiles
  for insert to app_rls
  with check ((select current_setting('app.current_user_role', true)) = 'admin');

drop policy if exists member_directory_profiles_update_self_or_admin on public.member_directory_profiles;
create policy member_directory_profiles_update_self_or_admin on public.member_directory_profiles
  for update to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  )
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  );

drop policy if exists community_identities_select_self_or_admin on public.community_identities;
create policy community_identities_select_self_or_admin on public.community_identities
  for select to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or user_id = (select current_setting('app.current_user_id', true))
  );

drop policy if exists community_identities_insert_self_or_admin on public.community_identities;
create policy community_identities_insert_self_or_admin on public.community_identities
  for insert to app_rls
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or user_id = (select current_setting('app.current_user_id', true))
  );

drop policy if exists community_identities_update_self_or_admin on public.community_identities;
create policy community_identities_update_self_or_admin on public.community_identities
  for update to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or user_id = (select current_setting('app.current_user_id', true))
  )
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or user_id = (select current_setting('app.current_user_id', true))
  );

drop policy if exists community_memberships_select_self_or_admin on public.community_memberships;
create policy community_memberships_select_self_or_admin on public.community_memberships
  for select to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or exists (
      select 1
      from public.community_identities identity
      where identity.identity_id = community_memberships.identity_id
        and identity.user_id = (select current_setting('app.current_user_id', true))
    )
  );

drop policy if exists community_memberships_insert_self_or_admin on public.community_memberships;
create policy community_memberships_insert_self_or_admin on public.community_memberships
  for insert to app_rls
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or exists (
      select 1
      from public.community_identities identity
      where identity.identity_id = community_memberships.identity_id
        and identity.user_id = (select current_setting('app.current_user_id', true))
    )
  );

drop policy if exists community_memberships_update_self_or_admin on public.community_memberships;
create policy community_memberships_update_self_or_admin on public.community_memberships
  for update to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or exists (
      select 1
      from public.community_identities identity
      where identity.identity_id = community_memberships.identity_id
        and identity.user_id = (select current_setting('app.current_user_id', true))
    )
  )
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or exists (
      select 1
      from public.community_identities identity
      where identity.identity_id = community_memberships.identity_id
        and identity.user_id = (select current_setting('app.current_user_id', true))
    )
  );

drop policy if exists member_status_history_select_self_or_admin on public.member_status_history;
create policy member_status_history_select_self_or_admin on public.member_status_history
  for select to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  );

drop policy if exists member_status_history_insert_self_or_admin on public.member_status_history;

drop policy if exists event_messages_admin_all on public.event_messages;
create policy event_messages_admin_all on public.event_messages
  for all to app_rls
  using ((select current_setting('app.current_user_role', true)) = 'admin')
  with check ((select current_setting('app.current_user_role', true)) = 'admin');

-- A private-schema, owner-executed view is the only general-member directory
-- read surface. It exposes no registered name, student identifier/email,
-- emergency contact, insurance, allergy, OAuth token, or provider account ID.
create schema if not exists app_api;
revoke all on schema app_api from public;
grant usage on schema app_api to app_rls;

create or replace view app_api.member_directory_entries
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
left join public."user" app_user on app_user.member_id = member.member_id
left join public.community_identities identity on identity.user_id = app_user.id
left join public.community_memberships membership on membership.identity_id = identity.identity_id
where profile.directory_visible
  and member.member_status = 'active'
  and exists (
    select 1
    from public."user" viewer_user
    join public.members viewer_member on viewer_member.member_id = viewer_user.member_id
    where viewer_user.id = current_setting('app.current_user_id', true)
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

-- Named Supabase API roles are optional in standalone/fresh replay databases.
-- Revoke their current and future access only when each role exists so this
-- migration remains portable while keeping direct-connection deployments closed.
do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated', 'service_role']
  loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on all tables in schema public from %I', api_role);
      execute format('revoke all on all sequences in schema public from %I', api_role);
      execute format('revoke execute on all functions in schema public from %I', api_role);

      execute format('revoke all on schema app_private, app_api from %I', api_role);
      execute format('revoke all on all tables in schema app_private from %I', api_role);
      execute format('revoke all on all sequences in schema app_private from %I', api_role);
      execute format('revoke execute on all functions in schema app_private from %I', api_role);
      execute format('revoke all on all tables in schema app_api from %I', api_role);
      execute format('revoke all on all sequences in schema app_api from %I', api_role);
      execute format('revoke execute on all functions in schema app_api from %I', api_role);

      if api_role = 'service_role' then
        execute format('revoke all on schema public from %I', api_role);
      end if;

      execute format(
        'alter default privileges in schema public revoke all on tables from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema public revoke all on sequences from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema public revoke execute on functions from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema app_private revoke all on tables from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema app_private revoke all on sequences from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema app_private revoke execute on functions from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema app_api revoke all on tables from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema app_api revoke all on sequences from %I',
        api_role
      );
      execute format(
        'alter default privileges in schema app_api revoke execute on functions from %I',
        api_role
      );
    end if;
  end loop;
end
$$;

comment on table public.members is
  'Private identity/contact data plus the pending-active-rejected-withdrawn application lifecycle.';
comment on table public.member_directory_profiles is
  'Approved-member directory data safe for other active members.';
comment on view app_api.member_directory_entries is
  'Allowlisted active-member directory; intentionally excludes all private member fields.';
