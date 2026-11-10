-- U-6（FR-4.7）：退部するとロールが外れる
--
-- 退部の処理（部員の状態を withdrawn にする）だけでロールが外れるよう、トリガーで行う。
-- アプリの手順に頼らないので、どの API から退部させても外れる。
-- 申請と部員を分けないと決めた（components.md Q-4）ため、これが無いと再入部で権限が戻ってしまう。
begin;

-- 退部の操作は member.edit を持つ人ができるが、ロールを外すには role.manage が要る。
-- 承認時に基本ロールを付けるトリガー（grant_base_member_role）と同じく、データベースの権限で行う。
-- 外した記録は member_role_history に「退部させた人」の名前で残る（record_member_role_change）。
-- 最後の管理者を退部させようとすると、keep_a_role_manager が拒み、退部の操作ごと取り消される。
create function app_private.remove_roles_on_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.member_roles where member_id = new.member_id;
  return new;
end;
$$;

revoke all on function app_private.remove_roles_on_withdrawal() from public;

create trigger members_remove_roles_on_withdrawal
  after update of member_status on public.members
  for each row
  when (new.member_status = 'withdrawn' and old.member_status is distinct from 'withdrawn')
  execute function app_private.remove_roles_on_withdrawal();

commit;
