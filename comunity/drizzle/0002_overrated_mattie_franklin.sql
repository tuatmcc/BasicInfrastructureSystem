ALTER TABLE "user_role" RENAME COLUMN "discord_user_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "discord_id" TO "id";--> statement-breakpoint
ALTER TABLE "user_role" DROP CONSTRAINT "user_roles_discord_user_id_fkey";
--> statement-breakpoint
DROP INDEX "users_discord_id_uidx";--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'users'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "users" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "discord_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_user_id_uidx" ON "users" USING btree ("discord_user_id" text_ops) WHERE (discord_user_id IS NOT NULL);--> statement-breakpoint
ALTER TABLE "user_role" DROP CONSTRAINT "user_roles_pkey";
--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id");