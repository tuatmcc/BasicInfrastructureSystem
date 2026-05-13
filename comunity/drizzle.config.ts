import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../share/drizzle/schema.ts',
  out: '../share/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});