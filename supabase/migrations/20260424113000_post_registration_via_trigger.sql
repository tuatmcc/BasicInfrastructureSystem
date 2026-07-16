-- Fetched from the production Supabase migration ledger.

-- Version: 20260424113000; name: post_registration_via_trigger.



-- Shared registration/update functions for API and auth trigger.
create or replace function public.ensure_member_seed_for_auth_user(p_auth_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_member_id uuid;
  v_default_grade integer;
begin
  if p_auth_user_id is null then
    return null;
  end if;

  select member_id
    into v_member_id
  from public.users
  where auth_user_id = p_auth_user_id
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

    perform public.upsert_user_auth_link(p_auth_user_id, v_member_id, '');
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('member_id', v_member_id)
  where id = p_auth_user_id;

  return v_member_id;
end;
$$;

create or replace function public.ensure_current_user_member_seed()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id uuid;
begin
  v_auth_id := auth.uid();
  return public.ensure_member_seed_for_auth_user(v_auth_id);
end;
$$;

create or replace function public.resolve_member_id_for_current_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return public.ensure_current_user_member_seed();
end;
$$;

create or replace function public.handle_new_auth_user_create_member()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.ensure_member_seed_for_auth_user(new.id);
  return new;
end;
$$;

create or replace function public.save_current_user_registration(
  p_full_name text,
  p_grade integer,
  p_student_id text,
  p_emergency_contact text,
  p_student_email text,
  p_insurance boolean,
  p_some_allergy boolean,
  p_discord_name text
)
returns uuid
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
    return null;
  end if;

  v_member_id := public.ensure_current_user_member_seed();
  if v_member_id is null then
    return null;
  end if;

  update public.members
  set
    name = p_full_name,
    grade = p_grade,
    student_id = p_student_id,
    emergency_contact = p_emergency_contact,
    student_email = p_student_email,
    insurance = p_insurance,
    some_allergy = p_some_allergy
  where member_id = v_member_id;

  perform public.upsert_user_auth_link(v_auth_id, v_member_id, p_discord_name);

  return v_member_id;
end;
$$;

create or replace function public.patch_current_user_member(
  p_full_name text default null,
  p_grade integer default null,
  p_student_id text default null,
  p_emergency_contact text default null,
  p_student_email text default null,
  p_insurance boolean default null,
  p_some_allergy boolean default null,
  p_discord_name text default null
)
returns uuid
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
    return null;
  end if;

  v_member_id := public.ensure_current_user_member_seed();
  if v_member_id is null then
    return null;
  end if;

  update public.members
  set
    name = coalesce(p_full_name, name),
    grade = coalesce(p_grade, grade),
    student_id = coalesce(p_student_id, student_id),
    emergency_contact = coalesce(p_emergency_contact, emergency_contact),
    student_email = coalesce(p_student_email, student_email),
    insurance = coalesce(p_insurance, insurance),
    some_allergy = coalesce(p_some_allergy, some_allergy)
  where member_id = v_member_id;

  if p_discord_name is not null then
    perform public.upsert_user_auth_link(v_auth_id, v_member_id, p_discord_name);
  end if;

  return v_member_id;
end;
$$;

grant execute on function public.ensure_member_seed_for_auth_user(uuid) to authenticated;

grant execute on function public.ensure_current_user_member_seed() to authenticated;

grant execute on function public.resolve_member_id_for_current_user() to authenticated;

grant execute on function public.save_current_user_registration(text, integer, text, text, text, boolean, boolean, text) to authenticated;

grant execute on function public.patch_current_user_member(text, integer, text, text, text, boolean, boolean, text) to authenticated;
