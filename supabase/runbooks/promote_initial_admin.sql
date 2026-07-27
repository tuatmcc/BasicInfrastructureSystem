-- Run manually in Supabase SQL Editor after replacing both placeholders.
-- Preconditions: the operator signed in, linked Discord via Better Auth, and
-- completed target-guild verification. This file is not a migration.

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
  join public.account auth_account
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

  -- role is a domain fact and lives in app_accounts, not in the auth store.
  update public.app_accounts
  set role = 'admin',
      updated_at = now()
  where user_id = matched_user_id
    and role = 'user';

  if not found then
    raise exception 'target user was not in the promotable user role';
  end if;
end
$$;

commit;
