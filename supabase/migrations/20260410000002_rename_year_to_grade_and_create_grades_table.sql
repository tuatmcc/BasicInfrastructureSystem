-- yearをgradeに変更し、gradesテーブルを作成

-- 1. gradesテーブルを作成
create table if not exists public.grades (
    id integer primary key,
    name text not null,
    display_grade text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. membersテーブルのyearカラムをgradeに名前変更
alter table public.members rename column year to grade;

-- 3. membersテーブルにdisplay_gradeカラムを追加
alter table public.members add column display_grade text;

-- 4. membersテーブルのgradeカラムをgradesテーブルの外部キーとして参照
alter table public.members add constraint members_grade_fkey
  foreign key (grade) references public.grades(id) on delete set null;
