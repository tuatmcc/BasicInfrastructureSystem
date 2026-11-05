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

create policy members_read on public.members
  for select to app_rls
  using (member_id = (select app_private.current_member_id())
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.read_private')));

create policy members_apply on public.members
  for insert to app_rls
  with check ((select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')) or exists (select 1 from public.app_accounts where user_id = current_setting('app.current_user_id', true) and member_id is null));

create policy members_write on public.members
  for update to app_rls
  using (member_id = (select app_private.current_member_id())
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')))
  with check (member_id = (select app_private.current_member_id())
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

create policy members_delete on public.members
  for delete to app_rls
  using ((select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

-- Grade data remains migration-managed; app_rls has SELECT privileges only.

create policy profiles_read on public.member_directory_profiles
  for select to app_rls
  using (member_id = (select app_private.current_member_id())
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.read_private')));

create policy profiles_insert on public.member_directory_profiles
  for insert to app_rls
  with check ((select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

create policy profiles_update on public.member_directory_profiles
  for update to app_rls
  using (member_id = (select app_private.current_member_id())
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')))
  with check (member_id = (select app_private.current_member_id())
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

create policy history_read on public.member_status_history
  for select to app_rls
  using (member_id = (select app_private.current_member_id())
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.read_private')));

create policy community_identities_read on public.community_identities
  for select to app_rls
  using (user_id = (select current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.read_private'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'reaction.read')));

create policy community_identities_insert on public.community_identities
  for insert to app_rls
  with check (user_id = (select current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

create policy community_identities_update on public.community_identities
  for update to app_rls
  using (user_id = (select current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')))
  with check (user_id = (select current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

create policy community_memberships_read on public.community_memberships
  for select to app_rls
  using (exists (select 1 from public.community_identities i where i.identity_id = community_memberships.identity_id and i.user_id = current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.read_private'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'reaction.read')));

create policy community_memberships_insert on public.community_memberships
  for insert to app_rls
  with check (exists (select 1 from public.community_identities i where i.identity_id = community_memberships.identity_id and i.user_id = current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

create policy community_memberships_update on public.community_memberships
  for update to app_rls
  using (exists (select 1 from public.community_identities i where i.identity_id = community_memberships.identity_id and i.user_id = current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')))
  with check (exists (select 1 from public.community_identities i where i.identity_id = community_memberships.identity_id and i.user_id = current_setting('app.current_user_id', true))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.review'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'member.edit')));

create policy events_read on public.event_messages
  for select to app_rls
  using ((select app_private.has_permission(current_setting('app.current_user_id', true), 'event.manage'))
    or (select app_private.has_permission(current_setting('app.current_user_id', true), 'reaction.read')));

create policy events_insert on public.event_messages
  for insert to app_rls
  with check ((select app_private.has_permission(current_setting('app.current_user_id', true), 'event.manage')));

create policy events_update on public.event_messages
  for update to app_rls
  using ((select app_private.has_permission(current_setting('app.current_user_id', true), 'event.manage')))
  with check ((select app_private.has_permission(current_setting('app.current_user_id', true), 'event.manage')));

create policy events_delete on public.event_messages
  for delete to app_rls
  using ((select app_private.has_permission(current_setting('app.current_user_id', true), 'event.manage')));

create policy member_roles_grant on public.member_roles
  for insert to app_rls
  with check ((select app_private.has_permission(current_setting('app.current_user_id', true), 'role.manage')));

create policy member_roles_revoke on public.member_roles
  for delete to app_rls
  using ((select app_private.has_permission(current_setting('app.current_user_id', true), 'role.manage')));

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

commit;

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
