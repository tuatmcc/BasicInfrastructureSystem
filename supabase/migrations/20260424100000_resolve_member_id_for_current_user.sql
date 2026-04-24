-- Resolve member_id for authenticated user and self-heal missing linkage.
create or replace function public.resolve_member_id_for_current_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id uuid;
  v_member_id uuid;
  v_default_grade integer;
begin
  v_auth_id := auth.uid();

  if v_auth_id is null then
    return null;
  end if;

  select (raw_app_meta_data ->> 'member_id')::uuid
    into v_member_id
  from auth.users
  where id = v_auth_id;

  if v_member_id is not null then
    return v_member_id;
  end if;

  select member_id
    into v_member_id
  from public.users
  where auth_user_id = v_auth_id
  limit 1;

  if v_member_id is null then
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
    values (v_auth_id, v_member_id, '')
    on conflict (auth_user_id) do update
      set member_id = excluded.member_id,
          display_name = coalesce(public.users.display_name, '');
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('member_id', v_member_id)
  where id = v_auth_id;

  return v_member_id;
end;
$$;

grant execute on function public.resolve_member_id_for_current_user() to authenticated;
