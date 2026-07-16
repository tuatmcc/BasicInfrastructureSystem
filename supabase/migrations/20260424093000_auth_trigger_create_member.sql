-- Fetched from the production Supabase migration ledger.

-- Version: 20260424093000; name: auth_trigger_create_member.



-- Create member/users bootstrap rows when a new Supabase Auth user is created.
create or replace function public.handle_new_auth_user_create_member()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_member_id uuid;
  v_default_grade integer;
begin
  select id
    into v_default_grade
  from public.grades
  order by id asc
  limit 1;

  if v_default_grade is null then
    raise exception 'grades table is empty';
  end if;

  insert into public.members (
    name,
    grade,
    emergency_contact,
    student_id,
    student_email,
    insurance,
    some_allergy
  )
  values ('', v_default_grade, '', '', '', false, false)
  returning member_id into v_member_id;

  insert into public.users (auth_user_id, member_id, display_name)
  values (new.id, v_member_id, '')
  on conflict (auth_user_id) do update
    set member_id = excluded.member_id,
        display_name = coalesce(public.users.display_name, '');

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('member_id', v_member_id)
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_member on auth.users;

create trigger on_auth_user_created_create_member
after insert on auth.users
for each row
execute function public.handle_new_auth_user_create_member();
