import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../share/drizzle/schema.ts',
  // Supabase migrations are canonical. Generated Drizzle diffs are review-only.
  out: './.drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
