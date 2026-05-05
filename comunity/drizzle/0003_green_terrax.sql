ALTER TABLE "user_role" DROP CONSTRAINT "user_roles_user_id_fkey";
--> statement-breakpoint
DROP INDEX "users_discord_user_id_uidx";--> statement-breakpoint
ALTER TABLE "user_role" DROP CONSTRAINT "user_roles_pkey";--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_pkey" PRIMARY KEY("user_id","role_id");--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER POLICY "authenticated user can read public.grades" ON "grades" TO authenticated USING (true);--> statement-breakpoint
ALTER POLICY "admin user can read all rows" ON "members" TO authenticated USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));--> statement-breakpoint
ALTER POLICY "authenticated user can read own row" ON "users" TO authenticated USING ((auth_user_id = auth.uid()));