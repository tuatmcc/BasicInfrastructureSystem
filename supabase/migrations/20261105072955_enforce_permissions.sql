-- U-3: FR-4.3/4.4/4.5 and C-4. The application supplies only a subject.
begin;

grant usage on schema app_private to app_rls;

create function app_private.permissions_for(subject_id text)
returns text[] language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select coalesce(array_agg(distinct rp.permission_key), array[]::text[])
  from public.app_accounts a
  join public.member_roles mr on mr.member_id = a.member_id
  join public.role_permissions rp on rp.role_key = mr.role_key
  where a.user_id = subject_id
$$;

create function app_private.has_permission(subject_id text, required_permission text)
returns boolean language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select coalesce(required_permission = any(app_private.permissions_for(subject_id)), false)
$$;

create function app_private.current_member_id()
returns uuid language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select member_id from public.app_accounts
  where user_id = nullif(current_setting('app.current_user_id', true), '')
$$;

revoke all on function app_private.permissions_for(text) from public;
revoke all on function app_private.has_permission(text, text) from public;
revoke all on function app_private.current_member_id() from public;
grant execute on function app_private.permissions_for(text), app_private.has_permission(text, text), app_private.current_member_id() to app_rls;

drop policy if exists members_select_self_or_admin on public.members;
drop policy if exists members_insert_self_or_admin on public.members;
drop policy if exists members_update_self_or_admin on public.members;
drop policy if exists member_directory_profiles_select_self_or_admin on public.member_directory_profiles;
drop policy if exists member_directory_profiles_insert_admin on public.member_directory_profiles;
drop policy if exists member_directory_profiles_update_self_or_admin on public.member_directory_profiles;
drop policy if exists community_identities_select_self_or_admin on public.community_identities;
drop policy if exists community_identities_insert_self_or_admin on public.community_identities;
drop policy if exists community_identities_update_self_or_admin on public.community_identities;
drop policy if exists community_memberships_select_self_or_admin on public.community_memberships;
drop policy if exists community_memberships_insert_self_or_admin on public.community_memberships;
drop policy if exists community_memberships_update_self_or_admin on public.community_memberships;
drop policy if exists member_status_history_select_self_or_admin on public.member_status_history;
drop policy if exists event_messages_admin_all on public.event_messages;
drop policy if exists members_delete_admin on public.members;
drop policy if exists grades_write_admin on public.grades;
drop policy member_roles_insert_admin on public.member_roles;
drop policy member_roles_delete_admin on public.member_roles;

-- RLS の範囲（docs/aidlc/components.md 3.6、2026-11-09 決定）
--
-- 原則 1：RLS は API より必ず緩くする。API が許す操作を RLS が拒むことはない。
--         （拒まれた行は黙って消えるので、食い違うと「0 件」に見えて原因が分かりにくい）
-- 原則 2：RLS が止めるのは、どの API でも起きてはならない次の 2 つだけ。
--         - 他人の個人情報が、部員を管理する権限のない人に渡ること
--         - 権限が勝手に広がること
-- それ以外の判定は API が行う。

-- 部員を管理する権限（3 つのうちどれか）を持つか。個人情報を守る表で共通に使う。
create function app_private.is_member_manager()
returns boolean language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select app_private.has_permission(current_setting('app.current_user_id', true), 'member.read_private')
      or app_private.has_permission(current_setting('app.current_user_id', true), 'member.review')
      or app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')
$$;

revoke all on function app_private.is_member_manager() from public;
grant execute on function app_private.is_member_manager() to app_rls;

-- 個人情報を守る表：本人か、部員を管理する権限を持つ人だけ
create policy members_read on public.members
  for select to app_rls
  using (member_id = (select app_private.current_member_id()) or (select app_private.is_member_manager()));

-- 入部申請は、まだ部員と結び付いていないアカウントの本人が出す
create policy members_apply on public.members
  for insert to app_rls
  with check (
    (select app_private.is_member_manager())
    or exists (
      select 1 from public.app_accounts
      where user_id = current_setting('app.current_user_id', true) and member_id is null
    )
  );

create policy members_write on public.members
  for update to app_rls
  using (member_id = (select app_private.current_member_id()) or (select app_private.is_member_manager()))
  with check (member_id = (select app_private.current_member_id()) or (select app_private.is_member_manager()));

create policy members_delete on public.members
  for delete to app_rls
  using ((select app_private.is_member_manager()));

-- Grade data remains migration-managed; app_rls has SELECT privileges only.

create policy profiles_read on public.member_directory_profiles
  for select to app_rls
  using (member_id = (select app_private.current_member_id()) or (select app_private.is_member_manager()));

create policy profiles_insert on public.member_directory_profiles
  for insert to app_rls
  with check ((select app_private.is_member_manager()));

create policy profiles_update on public.member_directory_profiles
  for update to app_rls
  using (member_id = (select app_private.current_member_id()) or (select app_private.is_member_manager()))
  with check (member_id = (select app_private.current_member_id()) or (select app_private.is_member_manager()));

create policy history_read on public.member_status_history
  for select to app_rls
  using (member_id = (select app_private.current_member_id()) or (select app_private.is_member_manager()));

-- 権限を広げる書き込み：ロールの付与と剥奪は role.manage を持つ人だけ
create policy member_roles_grant on public.member_roles
  for insert to app_rls
  with check ((select app_private.has_permission(current_setting('app.current_user_id', true), 'role.manage')));

create policy member_roles_revoke on public.member_roles
  for delete to app_rls
  using ((select app_private.has_permission(current_setting('app.current_user_id', true), 'role.manage')));

-- 権限を広げる書き込み：アカウントと部員の結び付け（app_accounts.member_id）
-- 結び付けた部員のロールがそのまま権限になるので、他人の部員に付け替えられると権限が広がる。
-- ポリシーでは変更前の値を見られないので、トリガーで確かめる。
-- 許すのは次の 3 つだけ。
--   - 結び付けを外す（権限は狭まるだけ）
--   - 本人が、まだ空の自分のアカウントを、ロールを 1 つも持たない部員に結び付ける（入部申請）
--     ロールを持つ部員に結び付けられると、そのロールの権限をそのまま得てしまうため
--   - 部員を管理する権限を持つ人が結び付ける（入部の承認）
-- migration や運用手順（runbook）はアプリの接続ユーザー（app_rls）で動かないので対象外。
create function app_private.guard_member_link()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  -- 行を追加するときは「まだ結び付いていない」状態から始まるとみなす。
  was_linked boolean := false;
begin
  if current_user <> 'app_rls' then
    return new;
  end if;

  if new.member_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    was_linked := old.member_id is not null;
  end if;

  if not was_linked
     and new.user_id = nullif(current_setting('app.current_user_id', true), '')
     and not exists (select 1 from public.member_roles where member_id = new.member_id) then
    return new;
  end if;

  if app_private.is_member_manager() then
    return new;
  end if;

  raise exception using
    errcode = '42501',
    message = 'only the account owner or a member manager may link an account to a member';
end;
$$;

revoke all on function app_private.guard_member_link() from public;

-- 結び付けを変える更新と、最初から結び付いた行の追加の両方を確かめる。
create trigger app_accounts_guard_member_link
  before update of member_id on public.app_accounts
  for each row
  when (old.member_id is distinct from new.member_id)
  execute function app_private.guard_member_link();

create trigger app_accounts_guard_member_link_on_insert
  before insert on public.app_accounts
  for each row
  when (new.member_id is not null)
  execute function app_private.guard_member_link();

-- 残りの表は RLS では守らず、アプリの接続ユーザーにすべて許す。判定は API が行う。
create policy community_identities_app on public.community_identities
  for all to app_rls using (true) with check (true);

create policy community_memberships_app on public.community_memberships
  for all to app_rls using (true) with check (true);

create policy event_messages_app on public.event_messages
  for all to app_rls using (true) with check (true);

create or replace function app_private.enforce_member_workflow()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  actor_id text := nullif(current_setting('app.current_user_id', true), '');
begin
  if actor_id is null then
    raise exception using
      errcode = '23514',
      message = 'member workflow requires an authenticated actor';
  end if;

  if not exists (
    select 1
    from public.app_accounts actor
    where actor.user_id = actor_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'member workflow requires an application account';
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

  -- A reviewer can transition applications, not edit arbitrary private fields.
  if old.member_id is distinct from app_private.current_member_id()
     and not app_private.has_permission(actor_id, 'member.edit')
     and (to_jsonb(new) - array['member_status','application_version','updated_at','reviewed_at','reviewed_by_user_id','review_reason'])
         is distinct from
         (to_jsonb(old) - array['member_status','application_version','updated_at','reviewed_at','reviewed_by_user_id','review_reason']) then
    raise exception using errcode = '42501', message = 'member.edit is required to edit another member';
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
    if not app_private.has_permission(actor_id, 'member.review')
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
        message = 'member.review is required to approve or reject a pending application with consistent review metadata';
    end if;
  elsif old.member_status = 'rejected'
        and new.member_status = 'pending' then
    if new.reviewed_at is not null
       or new.reviewed_by_user_id is not null
       or new.review_reason is not null
    then
      raise exception using
        errcode = '23514',
        message = 'resubmission must clear all review metadata';
    end if;
  elsif old.member_status = 'active'
        and new.member_status = 'withdrawn' then
    if not app_private.has_permission(actor_id, 'member.edit')
       or new.reviewed_at is null
       or new.reviewed_by_user_id is distinct from actor_id
       or btrim(coalesce(new.review_reason, '')) = ''
       or new.submitted_at is distinct from old.submitted_at
    then
      raise exception using
        errcode = '23514',
        message = 'member.edit is required to withdraw an active member with a reason';
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
left join public.app_accounts account on account.member_id = member.member_id
left join public.community_identities identity on identity.user_id = account.user_id
left join public.community_memberships membership on membership.identity_id = identity.identity_id
where profile.directory_visible
  and member.member_status = 'active'
  and app_private.has_permission(current_setting('app.current_user_id', true), 'member.read_public')
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

-- Fixed base grant on approval, not a user-controlled grant path (FR-4.3).
create function app_private.grant_base_member_role()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if new.member_status = 'active' and old.member_status <> 'active' then
    insert into public.member_roles(member_id, role_key, granted_by_user_id)
    values (new.member_id, 'member', current_setting('app.current_user_id', true))
    on conflict do nothing;
  end if;
  return new;
end
$$;
revoke all on function app_private.grant_base_member_role() from public;
create trigger members_grant_base_role after update of member_status on public.members
for each row execute function app_private.grant_base_member_role();

alter table public.app_accounts drop column role;
commit;
