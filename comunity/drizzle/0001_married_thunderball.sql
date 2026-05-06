ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "category_role" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "channel_role" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "channels" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_role" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_auth_user_id_fkey";
--> statement-breakpoint
DROP INDEX "idx_channels_category_id";--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "category_id" SET DATA TYPE uuid USING "category_id"::uuid;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "category_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "channel_id" SET DATA TYPE uuid USING "channel_id"::uuid;--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "channel_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "category_id" SET DATA TYPE uuid USING "category_id"::uuid;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "role_id" SET DATA TYPE uuid USING "role_id"::uuid;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "role_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "category_role" ALTER COLUMN "category_id" SET DATA TYPE uuid USING "category_id"::uuid;--> statement-breakpoint
ALTER TABLE "category_role" ALTER COLUMN "role_id" SET DATA TYPE uuid USING "role_id"::uuid;--> statement-breakpoint
ALTER TABLE "channel_role" ALTER COLUMN "channel_id" SET DATA TYPE uuid USING "channel_id"::uuid;--> statement-breakpoint
ALTER TABLE "channel_role" ALTER COLUMN "role_id" SET DATA TYPE uuid USING "role_id"::uuid;--> statement-breakpoint
ALTER TABLE "user_role" ALTER COLUMN "role_id" SET DATA TYPE uuid USING "role_id"::uuid;--> statement-breakpoint
CREATE INDEX "idx_channels_category_id" ON "channels" USING btree ("category_id" uuid_ops);