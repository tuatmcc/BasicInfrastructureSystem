-- Harden auth user linkage for environments where users.auth_user_id constraints were missing.
alter table public.users
  add column if not exists auth_user_id uuid;

create unique index if not exists users_auth_user_id_uidx
  on public.users (auth_user_id)
  where auth_user_id is not null;

create or replace function public.handle_new_auth_user_create_member()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_member_id uuid;
  v_default_grade integer;
  v_has_user boolean;
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

  select exists(
    select 1 from public.users where auth_user_id = new.id
  ) into v_has_user;

  if v_has_user then
    update public.users
    set member_id = v_member_id,
        display_name = coalesce(display_name, '')
    where auth_user_id = new.id;
  else
    insert into public.users (auth_user_id, member_id, display_name)
    values (new.id, v_member_id, '');
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('member_id', v_member_id)
  where id = new.id;

  return new;
end;
$$;

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
  v_has_user boolean;
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

    select exists(
      select 1 from public.users where auth_user_id = v_auth_id
    ) into v_has_user;

    if v_has_user then
      update public.users
      set member_id = v_member_id,
          display_name = coalesce(display_name, '')
      where auth_user_id = v_auth_id;
    else
      insert into public.users (auth_user_id, member_id, display_name)
      values (v_auth_id, v_member_id, '');
    end if;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('member_id', v_member_id)
  where id = v_auth_id;

  return v_member_id;
end;
$$;

grant execute on function public.resolve_member_id_for_current_user() to authenticated;
