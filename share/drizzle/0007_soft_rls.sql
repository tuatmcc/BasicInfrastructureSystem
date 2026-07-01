DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    CREATE ROLE app_rls;
  END IF;

  EXECUTE format('GRANT app_rls TO %I', current_user);
END
$$;

GRANT USAGE ON SCHEMA public TO app_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_rls;

ALTER TABLE "grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_messages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "grades" FORCE ROW LEVEL SECURITY;
ALTER TABLE "members" FORCE ROW LEVEL SECURITY;
ALTER TABLE "event_messages" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grades_select_authenticated" ON "grades";
DROP POLICY IF EXISTS "grades_write_admin" ON "grades";
DROP POLICY IF EXISTS "members_select_self_or_admin" ON "members";
DROP POLICY IF EXISTS "members_insert_authenticated" ON "members";
DROP POLICY IF EXISTS "members_update_self_or_admin" ON "members";
DROP POLICY IF EXISTS "members_delete_admin" ON "members";
DROP POLICY IF EXISTS "event_messages_admin_all" ON "event_messages";

CREATE POLICY "grades_select_authenticated"
ON "grades"
FOR SELECT
USING (current_setting('app.current_user_id', true) <> '');

CREATE POLICY "grades_write_admin"
ON "grades"
FOR ALL
USING (current_setting('app.current_user_role', true) = 'admin')
WITH CHECK (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY "members_select_self_or_admin"
ON "members"
FOR SELECT
USING (
  current_setting('app.current_user_role', true) = 'admin'
  OR "member_id" = NULLIF(current_setting('app.current_member_id', true), '')::uuid
);

CREATE POLICY "members_insert_authenticated"
ON "members"
FOR INSERT
WITH CHECK (current_setting('app.current_user_id', true) <> '');

CREATE POLICY "members_update_self_or_admin"
ON "members"
FOR UPDATE
USING (
  current_setting('app.current_user_role', true) = 'admin'
  OR "member_id" = NULLIF(current_setting('app.current_member_id', true), '')::uuid
)
WITH CHECK (
  current_setting('app.current_user_role', true) = 'admin'
  OR "member_id" = NULLIF(current_setting('app.current_member_id', true), '')::uuid
);

CREATE POLICY "members_delete_admin"
ON "members"
FOR DELETE
USING (current_setting('app.current_user_role', true) = 'admin');

CREATE POLICY "event_messages_admin_all"
ON "event_messages"
FOR ALL
USING (current_setting('app.current_user_role', true) = 'admin')
WITH CHECK (current_setting('app.current_user_role', true) = 'admin');
