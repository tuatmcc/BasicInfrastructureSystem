-- Run manually in Supabase SQL Editor after replacing both placeholders.
-- Preconditions: the operator signed in, linked Discord via Better Auth, and
-- completed target-guild verification and submitted a membership application. This file is not a migration.

begin;

do $$
declare
  target_discord_account_id constant text := 'REPLACE_WITH_DISCORD_USER_ID';
  target_discord_guild_id constant text := 'REPLACE_WITH_DISCORD_GUILD_ID';
  matched_user_id text;
  matched_count integer;
begin
  if target_discord_account_id like 'REPLACE_%'
     or target_discord_guild_id like 'REPLACE_%'
  then
    raise exception 'replace both bootstrap placeholders before running';
  end if;

  select count(*), min(identity.user_id)
    into matched_count, matched_user_id
  from public.community_identities identity
  join public.community_memberships membership
    on membership.identity_id = identity.identity_id
  -- The authentication tables live in app_auth since the schema split.
  join app_auth.account auth_account
    on auth_account.id = identity.auth_account_id
  where identity.provider = 'discord'
    and identity.provider_account_id = target_discord_account_id
    and identity.oauth_verified_at is not null
    and auth_account.provider_id = 'discord'
    and auth_account.account_id = identity.provider_account_id
    and membership.community_id = target_discord_guild_id
    and membership.membership_status = 'member'
    and membership.verified_at is not null;

  if matched_count <> 1 then
    raise exception 'expected exactly one verified Discord/guild identity, found %', matched_count;
  end if;

  -- Bootstrap is an operator-only grant; normal delegation is implemented in U-5.
  insert into public.member_roles(member_id, role_key, granted_by_user_id)
  select member_id, 'admin', 'operator:initial-admin'
  from public.app_accounts
  where user_id = matched_user_id and member_id is not null
  on conflict do nothing;

  if not exists (
    select 1 from public.app_accounts a
    join public.member_roles mr on mr.member_id = a.member_id
    where a.user_id = matched_user_id and mr.role_key = 'admin'
  ) then
    raise exception 'target user must submit a membership application before bootstrap';
  end if;
end
$$;

commit;
