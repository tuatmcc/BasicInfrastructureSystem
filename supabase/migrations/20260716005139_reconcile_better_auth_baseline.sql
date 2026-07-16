-- Reconcile the fetched Supabase Auth history with the Better Auth schema that
-- is currently running in production. This migration is intentionally
-- compatible with the current application; the membership workflow schema is
-- introduced by a later migration together with its consuming code.

set statement_timeout = 0;
set lock_timeout = '10s';

-- Remove obsolete Supabase Auth entry points before touching legacy tables.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_create_member on auth.users;
drop trigger if exists members_ensure_user_link_after_write on public.members;

drop function if exists public.ensure_user_link_for_member_row() cascade;
drop function if exists public.save_current_user_discord_link(text, text) cascade;
drop function if exists public.patch_current_user_member(text, integer, text, text, text, boolean, boolean, text) cascade;
drop function if exists public.save_current_user_registration(text, integer, text, text, text, boolean, boolean, text) cascade;
drop function if exists public.set_current_user_display_name(text) cascade;
drop function if exists public.get_current_user_display_name() cascade;
drop function if exists public.resolve_member_id_for_current_user() cascade;
drop function if exists public.handle_new_auth_user_create_member() cascade;
drop function if exists public.ensure_current_user_member_seed() cascade;
drop function if exists public.ensure_member_seed_for_auth_user(uuid) cascade;
drop function if exists public.upsert_user_auth_link(uuid, uuid, text) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.rls_auto_enable() cascade;

-- The plural tables belong to the superseded Supabase Auth model. Never drop
-- them silently if rows appear in a fresh audit.
do $$
declare
  legacy_table text;
  has_rows boolean;
begin
  foreach legacy_table in array array[
    'category_role',
    'channel_role',
    'user_role',
    'channels',
    'categories',
    'roles',
    'users'
  ]
  loop
    if to_regclass(format('public.%I', legacy_table)) is not null then
      execute format(
        'select exists (select 1 from public.%I limit 1)',
        legacy_table
      ) into has_rows;

      if has_rows then
        raise exception using
          message = format('legacy table public.%I is not empty', legacy_table),
          hint = 'Inspect and migrate the rows before retrying this migration.';
      end if;
    end if;
  end loop;
end
$$;

drop table if exists public.category_role cascade;
drop table if exists public.channel_role cascade;
drop table if exists public.user_role cascade;
drop table if exists public.channels cascade;
drop table if exists public.categories cascade;
drop table if exists public.roles cascade;
drop table if exists public.users cascade;

-- The historical ledger never recorded the Better Auth tables. CREATE IF NOT
-- EXISTS makes an empty replay converge while preserving the running schema.
create table if not exists public."user" (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null,
  image text,
  created_at timestamp without time zone not null,
  updated_at timestamp without time zone not null,
  discord_user_id text,
  display_name text,
  member_id uuid references public.members(member_id) on delete set null,
  role text not null default 'user'
);

create table if not exists public.account (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references public."user"(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp without time zone,
  refresh_token_expires_at timestamp without time zone,
  scope text,
  password text,
  created_at timestamp without time zone not null,
  updated_at timestamp without time zone not null
);

create table if not exists public.session (
  id text primary key,
  expires_at timestamp without time zone not null,
  token text not null unique,
  created_at timestamp without time zone not null,
  updated_at timestamp without time zone not null,
  ip_address text,
  user_agent text,
  user_id text not null references public."user"(id) on delete cascade
);

create table if not exists public.verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamp without time zone not null,
  created_at timestamp without time zone,
  updated_at timestamp without time zone
);

create table if not exists public.event_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  message_id text not null unique,
  content text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Match the application schema generated after the fetched history.
alter table public.grades
  add column if not exists year bigint not null default extract(year from current_date);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'grades'
      and column_name = 'id'
      and is_identity = 'YES'
  ) then
    alter table public.grades
      alter column id add generated always as identity;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public."user"'::regclass
      and conname = 'user_member_id_fkey'
  ) then
    alter table public."user"
      add constraint user_member_id_fkey
      foreign key (member_id)
      references public.members(member_id)
      on delete set null;
  end if;
end
$$;

alter table public."user" drop constraint if exists user_role_valid;
alter table public."user"
  add constraint user_role_valid check (role in ('user', 'admin'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.account'::regclass
      and conname = 'account_provider_account_unique'
  ) then
    alter table public.account
      add constraint account_provider_account_unique unique (provider_id, account_id);
  end if;
end
$$;

create unique index if not exists user_member_id_unique
  on public."user" (member_id)
  where member_id is not null;
create index if not exists user_member_id_idx
  on public."user" (member_id);
create index if not exists account_user_id_idx
  on public.account (user_id);
create index if not exists session_user_id_expires_at_idx
  on public.session (user_id, expires_at desc);
create index if not exists session_expires_at_idx
  on public.session (expires_at);
create index if not exists verification_identifier_expires_at_idx
  on public.verification (identifier, expires_at);
create index if not exists members_grade_idx
  on public.members (grade);

-- The Workers connect as app_rls. Data API roles receive no table/function
-- privileges, and public tables use role-scoped RLS as defense in depth.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_rls') then
    create role app_rls nologin noinherit;
  end if;

  execute format('grant app_rls to %I', current_user);
end
$$;

grant usage on schema public to app_rls;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke all on all tables in schema public from app_rls;
revoke all on all sequences in schema public from app_rls;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, app_rls;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, app_rls;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

grant select, insert, update, delete
  on public."user", public.account, public.session, public.verification
  to app_rls;
grant select, insert, update, delete
  on public.grades, public.members, public.event_messages
  to app_rls;
grant usage, select on all sequences in schema public to app_rls;

alter table public."user" enable row level security;
alter table public.account enable row level security;
alter table public.session enable row level security;
alter table public.verification enable row level security;
alter table public.grades enable row level security;
alter table public.members enable row level security;
alter table public.event_messages enable row level security;

alter table public."user" force row level security;
alter table public.account force row level security;
alter table public.session force row level security;
alter table public.verification force row level security;
alter table public.grades force row level security;
alter table public.members force row level security;
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

drop policy if exists grades_select_authenticated on public.grades;
create policy grades_select_authenticated on public.grades
  for select to app_rls
  using ((select current_setting('app.current_user_id', true)) <> '');

drop policy if exists grades_write_admin on public.grades;
create policy grades_write_admin on public.grades
  for all to app_rls
  using ((select current_setting('app.current_user_role', true)) = 'admin')
  with check ((select current_setting('app.current_user_role', true)) = 'admin');

drop policy if exists members_select_own_or_admin on public.members;
drop policy if exists members_select_self_or_admin on public.members;
create policy members_select_self_or_admin on public.members
  for select to app_rls
  using (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
  );

drop policy if exists members_insert_authenticated on public.members;
create policy members_insert_authenticated on public.members
  for insert to app_rls
  with check (
    (select current_setting('app.current_user_role', true)) = 'admin'
    or (
      (select current_setting('app.current_user_id', true)) <> ''
      and member_id = nullif((select current_setting('app.current_member_id', true)), '')::uuid
    )
  );

drop policy if exists members_update_own_or_admin on public.members;
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

drop policy if exists members_delete_admin on public.members;
create policy members_delete_admin on public.members
  for delete to app_rls
  using ((select current_setting('app.current_user_role', true)) = 'admin');

drop policy if exists event_messages_admin_all on public.event_messages;
create policy event_messages_admin_all on public.event_messages
  for all to app_rls
  using ((select current_setting('app.current_user_role', true)) = 'admin')
  with check ((select current_setting('app.current_user_role', true)) = 'admin');

comment on table public."user" is
  'Better Auth application users; app authorization is separate from community identities.';
