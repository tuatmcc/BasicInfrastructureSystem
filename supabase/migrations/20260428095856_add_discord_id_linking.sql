-- Add Discord account linkage storage for dashboard OAuth flow.
alter table public.users
  add column if not exists discord_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'discord_user_id'
  ) then
    execute $sql$
      update public.users
      set discord_id = coalesce(discord_id, nullif(discord_user_id, ''))
      where discord_id is null
        and discord_user_id is not null
        and discord_user_id <> ''
    $sql$;
  end if;
end;
$$;

create unique index if not exists users_discord_id_uidx
  on public.users (discord_id)
  where discord_id is not null;

create or replace function public.save_current_user_discord_link(
  p_discord_id text,
  p_display_name text default null
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id uuid;
  v_member_id uuid;
  v_normalized_discord_id text;
begin
  v_auth_id := auth.uid();
  if v_auth_id is null then
    return null;
  end if;

  v_normalized_discord_id := nullif(btrim(p_discord_id), '');
  if v_normalized_discord_id is null or v_normalized_discord_id !~ '^[0-9]+$' then
    raise exception 'discord_id must be a numeric Discord snowflake';
  end if;

  v_member_id := public.ensure_current_user_member_seed();
  if v_member_id is null then
    return null;
  end if;

  perform public.upsert_user_auth_link(v_auth_id, v_member_id, p_display_name);

  update public.users
  set
    discord_id = v_normalized_discord_id,
    display_name = coalesce(nullif(btrim(p_display_name), ''), display_name)
  where auth_user_id = v_auth_id;

  return v_normalized_discord_id;
end;
$$;

grant execute on function public.save_current_user_discord_link(text, text) to authenticated;
