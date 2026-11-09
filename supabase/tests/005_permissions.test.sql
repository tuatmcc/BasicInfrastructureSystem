begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select plan(8);

select hasnt_column('public', 'app_accounts', 'role', 'the old account role is gone');
select is(
  (select count(*)::int from pg_policies where coalesce(qual, '') || coalesce(with_check, '') like '%app.current_user_role%'),
  0, 'no policy trusts an application role claim'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app_private' and p.prosrc like '%app.current_user_role%'),
  0, 'no live workflow function reads the old role claim'
);
select ok(not has_function_privilege('anon', 'app_private.permissions_for(text)', 'EXECUTE'), 'anonymous API role cannot invoke the permission resolver');
select ok(not has_function_privilege('app_rls', 'app_private.grant_base_member_role()', 'EXECUTE'), 'the fixed base grant is callable only as a trigger');

grant usage on schema extensions to app_rls;
grant execute on all functions in schema extensions to app_rls;
set local role app_rls;
select set_config('app.current_user_id', '', true), set_config('app.current_user_role', 'admin', true);
select is(app_private.has_permission('', 'role.manage'), false, 'an anonymous caller cannot claim admin privileges');
select is(app_private.has_permission('missing-user', 'member.read_private'), false, 'unknown subjects have no permissions');
select results_eq($$select * from unnest(app_private.permissions_for('missing-user'))$$, array[]::text[], 'unknown subjects resolve to an empty permission list');
select * from finish();
rollback;
