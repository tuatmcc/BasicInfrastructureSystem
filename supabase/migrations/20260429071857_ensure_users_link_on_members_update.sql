-- Fetched from the production Supabase migration ledger.

-- Version: 20260429071857; name: ensure_users_link_on_members_update.



create or replace function public.ensure_user_link_for_member_row()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id uuid;
begin
  select auth_user_id
    into v_auth_id
  from public.users
  where member_id = new.member_id
  order by auth_user_id asc
  limit 1;

  if v_auth_id is null then
    select id
      into v_auth_id
    from auth.users
    where raw_app_meta_data ->> 'member_id' = new.member_id::text
    order by created_at asc
    limit 1;
  end if;

  if v_auth_id is null then
    return new;
  end if;

  perform public.upsert_user_auth_link(v_auth_id, new.member_id, null);

  return new;
end;
$$;

drop trigger if exists members_ensure_user_link_after_write on public.members;

create trigger members_ensure_user_link_after_write
after insert or update on public.members
for each row
execute function public.ensure_user_link_for_member_row();
