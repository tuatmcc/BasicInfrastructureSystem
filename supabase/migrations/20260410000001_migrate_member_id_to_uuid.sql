-- member_idをtext型からuuid型へマイグレーション
-- Supabaseでのマイグレーション手順

-- 1. 新しいuuid型のカラムを追加
alter table public.members add column member_id_uuid uuid;

-- 2. 既存のtext型member_idをuuidに変換してコピー
-- text→uuid変換が必要な場合は、以下を参考に調整：
update public.members 
set member_id_uuid = case 
    when member_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then member_id::uuid
    else gen_random_uuid()
end;

-- 3. デフォルト値を追加（新規挿入用）
alter table public.members alter column member_id_uuid set default gen_random_uuid();
alter table public.members alter column member_id_uuid set not null;

-- 4. usersテーブルのmember_id参照を更新
alter table public.users add column member_id_uuid uuid;

-- 5. 外部キー制約を削除してからデータ更新
alter table public.users drop constraint if exists users_member_id_fkey;

-- 6. member_idのマッピングを利用して更新
update public.users u
set member_id_uuid = m.member_id_uuid
from public.members m
where u.member_id = m.member_id;

-- 7. usersテーブルの古いカラムを削除し、新しいカラムを名前変更
alter table public.users drop column member_id;
alter table public.users rename column member_id_uuid to member_id;

-- 8. membersテーブルの古いmember_idを削除し、新しいuuid型をプライマリキーに
alter table public.members drop constraint members_pkey;
alter table public.members drop column member_id;
alter table public.members rename column member_id_uuid to member_id;
alter table public.members add primary key (member_id);

-- 9. 外部キー制約を再作成
alter table public.users add constraint users_member_id_fkey 
  foreign key (member_id) references public.members(member_id) on delete set null;

-- 10. インデックスを再作成
drop index if exists idx_users_member_id;
create index if not exists idx_users_member_id on public.users(member_id);
