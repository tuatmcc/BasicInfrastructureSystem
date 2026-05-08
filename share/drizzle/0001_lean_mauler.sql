ALTER TABLE "users" RENAME COLUMN "auth_user_id" TO "auth_id";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_auth_user_id_key";--> statement-breakpoint
DROP INDEX "users_auth_user_id_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_id_uidx" ON "users" USING btree ("auth_id" uuid_ops) WHERE (auth_id IS NOT NULL);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_id_key" UNIQUE("auth_id");