-- Provision the dedicated database LOGIN used by Workers/Hyperdrive.
-- Run this from a private operator session after replacing both placeholders in
-- a local copy. Never commit the filled password. Store the resulting dedicated
-- role URL (never postgres) directly in the Worker/Hyperdrive secret store.

begin;

do $$
declare
  runtime_role constant text := 'REPLACE_WITH_APP_RUNTIME_LOGIN_ROLE';
  runtime_password constant text := 'REPLACE_WITH_STRONG_RANDOM_PASSWORD';
  runtime_oid oid;
  role_record record;
begin
  if runtime_role like 'REPLACE_%' then
    raise exception 'replace the runtime login role placeholder before execution';
  end if;

  if runtime_password like 'REPLACE_%' or char_length(runtime_password) < 32 then
    raise exception 'replace the runtime password placeholder with at least 32 random characters';
  end if;

  if runtime_role in (
    'anon', 'authenticated', 'authenticator', 'postgres', 'service_role',
    'supabase_admin', 'app_rls'
  ) then
    raise exception 'reserved or privileged role % cannot be the application login', runtime_role;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_rls') then
    raise exception 'app_rls must be created by the membership workflow migration first';
  end if;

  select * into role_record
  from pg_roles
  where rolname = runtime_role;

  if not found then
    execute format(
      'create role %I login inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password %L',
      runtime_role,
      runtime_password
    );
  else
    if not role_record.rolcanlogin
       or role_record.rolsuper
       or role_record.rolcreatedb
       or role_record.rolcreaterole
       or role_record.rolreplication
       or role_record.rolbypassrls
    then
      raise exception 'existing role % is not a least-privilege application login', runtime_role;
    end if;
  end if;

  select oid into strict runtime_oid
  from pg_roles
  where rolname = runtime_role;

  if exists (
    select 1
    from pg_auth_members membership
    join pg_roles granted_role on granted_role.oid = membership.roleid
    where membership.member = runtime_oid
      and granted_role.rolname <> 'app_rls'
  ) then
    raise exception 'runtime role % already belongs to an unexpected database role', runtime_role;
  end if;

  if exists (select 1 from pg_database where datdba = runtime_oid)
     or exists (select 1 from pg_class where relowner = runtime_oid)
     or exists (select 1 from pg_namespace where nspowner = runtime_oid)
     or exists (select 1 from pg_proc where proowner = runtime_oid)
  then
    raise exception 'runtime role % owns a database or database objects and cannot be safely constrained', runtime_role;
  end if;

  execute format(
    'alter role %I login inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password %L',
    runtime_role,
    runtime_password
  );

  execute format('revoke all on schema public, app_private, app_api from %I', runtime_role);
  execute format('revoke all on all tables in schema public from %I', runtime_role);
  execute format('revoke all on all sequences in schema public from %I', runtime_role);
  execute format('revoke execute on all functions in schema public from %I', runtime_role);
  -- app_auth only exists once the authentication tables have been split out,
  -- so this stays optional for a database that has not reached that migration.
  if exists (select 1 from pg_namespace where nspname = 'app_auth') then
    execute format('revoke all on schema app_auth from %I', runtime_role);
    execute format('revoke all on all tables in schema app_auth from %I', runtime_role);
    execute format('revoke all on all sequences in schema app_auth from %I', runtime_role);
  end if;
  execute format('revoke all on all tables in schema app_private from %I', runtime_role);
  execute format('revoke all on all sequences in schema app_private from %I', runtime_role);
  execute format('revoke execute on all functions in schema app_private from %I', runtime_role);
  execute format('revoke all on all tables in schema app_api from %I', runtime_role);
  execute format('revoke all on all sequences in schema app_api from %I', runtime_role);
  execute format('revoke execute on all functions in schema app_api from %I', runtime_role);

  execute format('grant app_rls to %I', runtime_role);

  if not pg_has_role(runtime_role, 'app_rls', 'MEMBER') then
    raise exception 'runtime role % was not granted app_rls membership', runtime_role;
  end if;

  if not (select rolinherit from pg_roles where rolname = runtime_role) then
    raise exception 'runtime role % must INHERIT app_rls for Better Auth autocommit queries', runtime_role;
  end if;

  if not pg_has_role(runtime_role, 'app_rls', 'USAGE') then
    raise exception 'runtime role % cannot use inherited app_rls privileges', runtime_role;
  end if;
end
$$;

commit;

-- Operator verification after connecting as the new login:
--   select session_user, current_user,
--          pg_has_role(current_user, 'app_rls', 'USAGE') as inherits_app_rls;
--   select count(*) from public."user"; -- Better Auth tables remain usable.
--   reset all;
--   select count(*) from public.members; -- Empty request context must expose 0.
-- Expected: both users are the dedicated login, inherits_app_rls is true, and
-- business-table RLS remains closed until a short transaction SET LOCALs the
-- validated request context.
