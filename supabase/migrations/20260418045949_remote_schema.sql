-- Fetched from the production Supabase migration ledger.

-- Version: 20260418045949; name: remote_schema.



SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT pg_catalog.set_config('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."categories" (
    "category_id" "text" NOT NULL,
    "category_name" "text" NOT NULL
);

ALTER TABLE "public"."categories" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."category_role" (
    "category_id" "text" NOT NULL,
    "role_id" "text" NOT NULL
);

ALTER TABLE "public"."category_role" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."channel_role" (
    "channel_id" "text" NOT NULL,
    "role_id" "text" NOT NULL
);

ALTER TABLE "public"."channel_role" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."channels" (
    "channel_id" "text" NOT NULL,
    "channel_name" "text" NOT NULL,
    "category_id" "text"
);

ALTER TABLE "public"."channels" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."grades" (
    "id" integer NOT NULL,
    "display_grade" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."grades" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."members" (
    "name" "text" NOT NULL,
    "grade" integer NOT NULL,
    "emergency_contact" "text" NOT NULL,
    "student_id" "text" NOT NULL,
    "student_email" "text" NOT NULL,
    "insurance" boolean DEFAULT false NOT NULL,
    "some_allergy" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

ALTER TABLE "public"."members" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."roles" (
    "role_id" "text" NOT NULL,
    "role_name" "text" NOT NULL
);

ALTER TABLE "public"."roles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_role" (
    "discord_user_id" "text" NOT NULL,
    "role_id" "text" NOT NULL
);

ALTER TABLE "public"."user_role" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."users" (
    "discord_user_id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "member_id" "uuid"
);

ALTER TABLE "public"."users" OWNER TO "postgres";

ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id");

ALTER TABLE ONLY "public"."category_role"
    ADD CONSTRAINT "category_role_access_pkey" PRIMARY KEY ("category_id", "role_id");

ALTER TABLE ONLY "public"."channel_role"
    ADD CONSTRAINT "channel_role_access_pkey" PRIMARY KEY ("channel_id", "role_id");

ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("channel_id");

ALTER TABLE ONLY "public"."grades"
    ADD CONSTRAINT "grades_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("member_id");

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id");

ALTER TABLE ONLY "public"."user_role"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("discord_user_id", "role_id");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("discord_user_id");

CREATE INDEX "idx_channels_category_id" ON "public"."channels" USING "btree" ("category_id");

CREATE INDEX "idx_users_member_id" ON "public"."users" USING "btree" ("member_id");

ALTER TABLE ONLY "public"."category_role"
    ADD CONSTRAINT "category_role_access_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."category_role"
    ADD CONSTRAINT "category_role_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."channel_role"
    ADD CONSTRAINT "channel_role_access_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."channel_role"
    ADD CONSTRAINT "channel_role_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_grade_fkey" FOREIGN KEY ("grade") REFERENCES "public"."grades"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."user_role"
    ADD CONSTRAINT "user_roles_discord_user_id_fkey" FOREIGN KEY ("discord_user_id") REFERENCES "public"."users"("discord_user_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_role"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE SET NULL;

ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."category_role" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."channel_role" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."grades" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_role" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";

GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";

GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT ALL ON TABLE "public"."categories" TO "anon";

GRANT ALL ON TABLE "public"."categories" TO "authenticated";

GRANT ALL ON TABLE "public"."categories" TO "service_role";

GRANT ALL ON TABLE "public"."category_role" TO "anon";

GRANT ALL ON TABLE "public"."category_role" TO "authenticated";

GRANT ALL ON TABLE "public"."category_role" TO "service_role";

GRANT ALL ON TABLE "public"."channel_role" TO "anon";

GRANT ALL ON TABLE "public"."channel_role" TO "authenticated";

GRANT ALL ON TABLE "public"."channel_role" TO "service_role";

GRANT ALL ON TABLE "public"."channels" TO "anon";

GRANT ALL ON TABLE "public"."channels" TO "authenticated";

GRANT ALL ON TABLE "public"."channels" TO "service_role";

GRANT ALL ON TABLE "public"."grades" TO "anon";

GRANT ALL ON TABLE "public"."grades" TO "authenticated";

GRANT ALL ON TABLE "public"."grades" TO "service_role";

GRANT ALL ON TABLE "public"."members" TO "anon";

GRANT ALL ON TABLE "public"."members" TO "authenticated";

GRANT ALL ON TABLE "public"."members" TO "service_role";

GRANT ALL ON TABLE "public"."roles" TO "anon";

GRANT ALL ON TABLE "public"."roles" TO "authenticated";

GRANT ALL ON TABLE "public"."roles" TO "service_role";

GRANT ALL ON TABLE "public"."user_role" TO "anon";

GRANT ALL ON TABLE "public"."user_role" TO "authenticated";

GRANT ALL ON TABLE "public"."user_role" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";

GRANT ALL ON TABLE "public"."users" TO "authenticated";

GRANT ALL ON TABLE "public"."users" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

drop extension if exists "pg_net";
