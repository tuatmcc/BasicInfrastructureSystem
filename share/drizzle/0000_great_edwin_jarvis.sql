-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "grades" (
	"id" integer PRIMARY KEY NOT NULL,
	"display_grade" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"year" bigint DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"discord_user_id" text,
	"display_name" text NOT NULL,
	"member_id" uuid,
	"auth_user_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	CONSTRAINT "users_auth_user_id_key" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "members" (
	"name" text NOT NULL,
	"grade" integer NOT NULL,
	"emergency_contact" text NOT NULL,
	"student_id" text NOT NULL,
	"student_email" text NOT NULL,
	"insurance" boolean DEFAULT false NOT NULL,
	"some_allergy" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"member_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"category_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"role_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"channel_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_name" text NOT NULL,
	"category_id" uuid
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "user_role_pkey" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "channel_role" (
	"channel_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "channel_role_access_pkey" PRIMARY KEY("channel_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "category_role" (
	"category_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "category_role_access_pkey" PRIMARY KEY("category_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_grade_fkey" FOREIGN KEY ("grade") REFERENCES "public"."grades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_role" ADD CONSTRAINT "channel_role_access_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("channel_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_role" ADD CONSTRAINT "channel_role_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_role" ADD CONSTRAINT "category_role_access_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_role" ADD CONSTRAINT "category_role_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_member_id" ON "users" USING btree ("member_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_user_id_uidx" ON "users" USING btree ("auth_user_id" uuid_ops) WHERE (auth_user_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_channels_category_id" ON "channels" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE POLICY "authenticated user can read public.grades" ON "grades" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "authenticated user can read own row" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "admin user can read all rows" ON "members" AS PERMISSIVE FOR SELECT TO "authenticated";--> statement-breakpoint
CREATE POLICY "members_select_own_or_admin" ON "members" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "members_update_own_or_admin" ON "members" AS PERMISSIVE FOR UPDATE TO public;
*/