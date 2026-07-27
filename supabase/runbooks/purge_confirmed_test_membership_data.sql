-- One-off destructive runbook. This is intentionally NOT a migration.
--
-- Replace every REPLACE_* value with a pipe-separated, fully audited set.
-- Use the literal EMPTY for an expected empty set. Values must not contain "|"
-- or "=>". Run as the database migration owner during a maintenance window,
-- review the complete result in the same session, and never reuse this file for
-- a different dataset without a new audit. If any assertion fails, issue
-- ROLLBACK in that session before correcting the audited inputs and retrying.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '10s';

do $$
declare
  expected_verification_ids_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_VERIFICATION_IDS_OR_EMPTY';
  expected_session_ids_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_SESSION_IDS_OR_EMPTY';
  expected_account_ids_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_ACCOUNT_IDS_OR_EMPTY';
  expected_user_ids_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_USER_IDS_OR_EMPTY';
  expected_member_ids_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_MEMBER_IDS_OR_EMPTY';
  expected_grade_ids_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_GRADE_IDS_OR_EMPTY';

  expected_account_user_links_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_ACCOUNT_ID=>USER_ID_LINKS_OR_EMPTY';
  expected_session_user_links_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_SESSION_ID=>USER_ID_LINKS_OR_EMPTY';
  expected_user_member_links_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_USER_ID=>MEMBER_ID_LINKS_OR_EMPTY';
  expected_member_grade_links_input constant text := 'REPLACE_WITH_PIPE_SEPARATED_MEMBER_ID=>GRADE_ID_LINKS_OR_EMPTY';

  expected_verification_ids text[];
  expected_session_ids text[];
  expected_account_ids text[];
  expected_user_ids text[];
  expected_member_ids text[];
  expected_grade_ids text[];
  expected_account_user_links text[];
  expected_session_user_links text[];
  expected_user_member_links text[];
  expected_member_grade_links text[];

  actual_verification_ids text[];
  actual_session_ids text[];
  actual_account_ids text[];
  actual_user_ids text[];
  actual_member_ids text[];
  actual_grade_ids text[];
  actual_account_user_links text[];
  actual_session_user_links text[];
  actual_user_member_links text[];
  actual_member_grade_links text[];
begin
  if expected_verification_ids_input like 'REPLACE_%'
     or expected_session_ids_input like 'REPLACE_%'
     or expected_account_ids_input like 'REPLACE_%'
     or expected_user_ids_input like 'REPLACE_%'
     or expected_member_ids_input like 'REPLACE_%'
     or expected_grade_ids_input like 'REPLACE_%'
     or expected_account_user_links_input like 'REPLACE_%'
     or expected_session_user_links_input like 'REPLACE_%'
     or expected_user_member_links_input like 'REPLACE_%'
     or expected_member_grade_links_input like 'REPLACE_%'
  then
    raise exception using
      message = 'replace every purge runbook placeholder before execution',
      hint = 'Use EMPTY for an audited empty set; do not infer IDs from row counts.';
  end if;

  expected_verification_ids := case
    when expected_verification_ids_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_verification_ids_input, '|')
  end;
  expected_session_ids := case
    when expected_session_ids_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_session_ids_input, '|')
  end;
  expected_account_ids := case
    when expected_account_ids_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_account_ids_input, '|')
  end;
  expected_user_ids := case
    when expected_user_ids_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_user_ids_input, '|')
  end;
  expected_member_ids := case
    when expected_member_ids_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_member_ids_input, '|')
  end;
  expected_grade_ids := case
    when expected_grade_ids_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_grade_ids_input, '|')
  end;
  expected_account_user_links := case
    when expected_account_user_links_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_account_user_links_input, '|')
  end;
  expected_session_user_links := case
    when expected_session_user_links_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_session_user_links_input, '|')
  end;
  expected_user_member_links := case
    when expected_user_member_links_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_user_member_links_input, '|')
  end;
  expected_member_grade_links := case
    when expected_member_grade_links_input = 'EMPTY' then array[]::text[]
    else string_to_array(expected_member_grade_links_input, '|')
  end;

  -- Acquire every destructive lock in one deterministic statement and retain it
  -- until COMMIT. No signup or session write can slip between audit and purge.
  lock table
    public.verification,
    public.session,
    public.account,
    public."user",
    public.members,
    public.grades
  in access exclusive mode;

  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_verification_ids from unnest(expected_verification_ids) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_session_ids from unnest(expected_session_ids) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_account_ids from unnest(expected_account_ids) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_user_ids from unnest(expected_user_ids) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_member_ids from unnest(expected_member_ids) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_grade_ids from unnest(expected_grade_ids) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_account_user_links from unnest(expected_account_user_links) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_session_user_links from unnest(expected_session_user_links) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_user_member_links from unnest(expected_user_member_links) value;
  select coalesce(array_agg(value order by value), array[]::text[])
    into expected_member_grade_links from unnest(expected_member_grade_links) value;

  select coalesce(array_agg(id order by id), array[]::text[])
    into actual_verification_ids from public.verification;
  select coalesce(array_agg(id order by id), array[]::text[])
    into actual_session_ids from public.session;
  select coalesce(array_agg(id order by id), array[]::text[])
    into actual_account_ids from public.account;
  select coalesce(array_agg(id order by id), array[]::text[])
    into actual_user_ids from public."user";
  select coalesce(array_agg(member_id::text order by member_id::text), array[]::text[])
    into actual_member_ids from public.members;
  select coalesce(array_agg(id::text order by id::text), array[]::text[])
    into actual_grade_ids from public.grades;

  if actual_verification_ids is distinct from expected_verification_ids then
    raise exception 'verification PK audit failed: expected %, found %', expected_verification_ids, actual_verification_ids;
  end if;
  if actual_session_ids is distinct from expected_session_ids then
    raise exception 'session PK audit failed: expected %, found %', expected_session_ids, actual_session_ids;
  end if;
  if actual_account_ids is distinct from expected_account_ids then
    raise exception 'account PK audit failed: expected %, found %', expected_account_ids, actual_account_ids;
  end if;
  if actual_user_ids is distinct from expected_user_ids then
    raise exception 'user PK audit failed: expected %, found %', expected_user_ids, actual_user_ids;
  end if;
  if actual_member_ids is distinct from expected_member_ids then
    raise exception 'member PK audit failed: expected %, found %', expected_member_ids, actual_member_ids;
  end if;
  if actual_grade_ids is distinct from expected_grade_ids then
    raise exception 'grade PK audit failed: expected %, found %', expected_grade_ids, actual_grade_ids;
  end if;

  select coalesce(
    array_agg(account_row.id || '=>' || account_row.user_id order by account_row.id || '=>' || account_row.user_id),
    array[]::text[]
  ) into actual_account_user_links
  from public.account account_row;

  select coalesce(
    array_agg(session_row.id || '=>' || session_row.user_id order by session_row.id || '=>' || session_row.user_id),
    array[]::text[]
  ) into actual_session_user_links
  from public.session session_row;

  select coalesce(
    array_agg(
      user_row.id || '=>' || coalesce(user_row.member_id::text, '<NULL>')
      order by user_row.id || '=>' || coalesce(user_row.member_id::text, '<NULL>')
    ),
    array[]::text[]
  ) into actual_user_member_links
  from public."user" user_row;

  select coalesce(
    array_agg(
      member_row.member_id::text || '=>' || member_row.grade::text
      order by member_row.member_id::text || '=>' || member_row.grade::text
    ),
    array[]::text[]
  ) into actual_member_grade_links
  from public.members member_row;

  if actual_account_user_links is distinct from expected_account_user_links then
    raise exception 'account->user audit failed: expected %, found %', expected_account_user_links, actual_account_user_links;
  end if;
  if actual_session_user_links is distinct from expected_session_user_links then
    raise exception 'session->user audit failed: expected %, found %', expected_session_user_links, actual_session_user_links;
  end if;
  if actual_user_member_links is distinct from expected_user_member_links then
    raise exception 'user->member audit failed: expected %, found %', expected_user_member_links, actual_user_member_links;
  end if;
  if actual_member_grade_links is distinct from expected_member_grade_links then
    raise exception 'member->grade audit failed: expected %, found %', expected_member_grade_links, actual_member_grade_links;
  end if;

  delete from public.verification;
  delete from public.session;
  delete from public.account;
  delete from public."user";
  delete from public.members;
  delete from public.grades;

  if exists (select 1 from public.verification)
     or exists (select 1 from public.session)
     or exists (select 1 from public.account)
     or exists (select 1 from public."user")
     or exists (select 1 from public.members)
     or exists (select 1 from public.grades)
  then
    raise exception 'post-delete emptiness verification failed';
  end if;
end
$$;

commit;
