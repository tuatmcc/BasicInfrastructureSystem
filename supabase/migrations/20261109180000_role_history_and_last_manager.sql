-- U-5（FR-5.2・FR-5.3）：ロールの変更履歴と、最後の管理者を外せない制約
--
-- どちらもトリガーで行う。アプリの手順に頼らず、どの API から操作しても破れないようにする
-- （components.md 3.4。RLS ではなく整合性の決まりとして守る）。
begin;

-- ロールの変更履歴（FR-5.3：誰がいつ誰のロールを変えたかが残る）
-- member_status_history と同じ方式：トリガーだけが書き、アプリは読むことしかできない。
create table public.member_role_history (
  history_id bigint generated always as identity primary key,
  member_id uuid not null references public.members(member_id) on delete restrict,
  role_key text not null,
  action text not null,
  -- 変更した人のユーザー ID。その時点の値を写して残す（アカウントが消えても記録は残る）。
  -- アプリ以外（migration や運用手順）からの変更は 'operator' になる。
  actor_user_id text not null,
  occurred_at timestamptz not null default now(),
  constraint member_role_history_action_valid check (action in ('grant', 'revoke'))
);

create index member_role_history_member_idx on public.member_role_history (member_id, occurred_at desc);

comment on table public.member_role_history is
  'Append-only record of role grants and revocations, written only by trigger.';

-- アプリには読み取りだけを許す。追加・更新・削除の権限は与えないので、消したり書き換えたりできない。
-- RLS では守らない（components.md 3.6）。誰に見せるかは API が決める（role.manage を持つ人だけ）。
grant select on public.member_role_history to app_rls;
alter table public.member_role_history enable row level security;
alter table public.member_role_history force row level security;
create policy member_role_history_app on public.member_role_history
  for select to app_rls using (true);

-- member_roles の行が増えたり減ったりしたら、履歴を 1 行書く。
-- アプリには履歴を書く権限がないので、データベースの権限（security definer）で書く。
create function app_private.record_member_role_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor text := coalesce(nullif(current_setting('app.current_user_id', true), ''), 'operator');
begin
  if tg_op = 'INSERT' then
    insert into public.member_role_history (member_id, role_key, action, actor_user_id)
    values (new.member_id, new.role_key, 'grant', actor);
    return new;
  end if;

  insert into public.member_role_history (member_id, role_key, action, actor_user_id)
  values (old.member_id, old.role_key, 'revoke', actor);
  return old;
end;
$$;

revoke all on function app_private.record_member_role_change() from public;

create trigger member_roles_record_change
  after insert or delete on public.member_roles
  for each row
  execute function app_private.record_member_role_change();

-- 最後の管理者を外せない（FR-5.2：権限を持つ人が誰もいない状態を作れない）
-- role.manage を含むロールが外れたあと、role.manage を持つ部員が 1 人も残らなければ取り消す。
-- 退部でロールが外れるとき（U-6）も、この確認を通る。
create function app_private.keep_a_role_manager()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.role_permissions
    where role_key = old.role_key and permission_key = 'role.manage'
  ) then
    return old;
  end if;

  if not exists (
    select 1
    from public.member_roles mr
    join public.role_permissions rp on rp.role_key = mr.role_key
    where rp.permission_key = 'role.manage'
  ) then
    raise exception using
      errcode = '23514',
      message = 'at least one member must keep role.manage';
  end if;

  return old;
end;
$$;

revoke all on function app_private.keep_a_role_manager() from public;

create trigger member_roles_keep_a_role_manager
  after delete on public.member_roles
  for each row
  execute function app_private.keep_a_role_manager();

commit;
