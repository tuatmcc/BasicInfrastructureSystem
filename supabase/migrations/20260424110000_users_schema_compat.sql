-- Make auth-user linkage robust across different users table schemas.
create or replace function public.upsert_user_auth_link(
  p_auth_user_id uuid,
  p_member_id uuid,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_has_row boolean;
  v_has_discord_user_id boolean;
begin
  alter table public.users
    add column if not exists auth_user_id uuid;

  create unique index if not exists users_auth_user_id_uidx
    on public.users (auth_user_id)
    where auth_user_id is not null;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'discord_user_id'
  ) into v_has_discord_user_id;

  select exists (
    select 1
    from public.users
    where auth_user_id = p_auth_user_id
  ) into v_has_row;

  if v_has_row then
    update public.users
    set member_id = p_member_id,
        display_name = coalesce(p_display_name, display_name, '')
    where auth_user_id = p_auth_user_id;
    return;
  end if;

  if v_has_discord_user_id then
    insert into public.users (auth_user_id, member_id, display_name, discord_user_id)
    values (p_auth_user_id, p_member_id, coalesce(p_display_name, ''), p_auth_user_id::text);
  else
    insert into public.users (auth_user_id, member_id, display_name)
    values (p_auth_user_id, p_member_id, coalesce(p_display_name, ''));
  end if;
end;
$$;

create or replace function public.get_current_user_display_name()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id uuid;
  v_display_name text;
begin
  v_auth_id := auth.uid();
  if v_auth_id is null then
    return null;
  end if;

  alter table public.users
    add column if not exists auth_user_id uuid;

  select display_name
    into v_display_name
  from public.users
  where auth_user_id = v_auth_id
  limit 1;

  return v_display_name;
end;
$$;

create or replace function public.set_current_user_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id uuid;
  v_member_id uuid;
begin
  v_auth_id := auth.uid();
  if v_auth_id is null then
    return;
  end if;

  v_member_id := public.resolve_member_id_for_current_user();
  if v_member_id is null then
    return;
  end if;

  perform public.upsert_user_auth_link(v_auth_id, v_member_id, p_display_name);
end;
$$;

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

  perform public.upsert_user_auth_link(new.id, v_member_id, '');

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

  alter table public.users
    add column if not exists auth_user_id uuid;

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

    perform public.upsert_user_auth_link(v_auth_id, v_member_id, '');
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('member_id', v_member_id)
  where id = v_auth_id;

  return v_member_id;
end;
$$;

grant execute on function public.upsert_user_auth_link(uuid, uuid, text) to authenticated;
grant execute on function public.resolve_member_id_for_current_user() to authenticated;
grant execute on function public.get_current_user_display_name() to authenticated;
grant execute on function public.set_current_user_display_name(text) to authenticated;
