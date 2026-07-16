# Database migration policy

## Source of truth

`supabase/migrations/` is the only executable migration history. The files
dated `20260418` through `20260429` were fetched from the production Supabase
ledger without changing their timestamps. The former Drizzle SQL journal was
removed because it referenced a missing migration, omitted live migrations,
and could not rebuild the Better Auth schema.

`share/drizzle/schema.ts` remains the application type definition. A schema
change is complete only when the Supabase migration and Drizzle schema agree.
`drizzle-kit generate` may be used to inspect a diff, but its output is not an
executable migration and is ignored under each package's `.drizzle/` folder.

## Creating a migration

```sh
supabase migration new descriptive_name
```

Then:

1. Edit the generated SQL.
2. Update `share/drizzle/schema.ts` and `share/drizzle/relations.ts`.
3. Run `supabase db reset` against a local Supabase stack twice.
4. Run package tests and type checks.
5. Review `supabase db diff` and both Supabase advisors.
6. Apply the exact reviewed file to the linked project only after the code that
   consumes it is ready.

Never use `migration repair` as a substitute for running schema-changing SQL,
and never run `db reset --linked`.

## Reconciliation baseline

`20260716005139_reconcile_better_auth_baseline.sql` removes only empty legacy
Supabase Auth tables and obsolete functions, records the running Better Auth
tables in the executable history, and narrows database privileges/RLS to the
`app_rls` role. It does not delete current Better Auth users, members, grades,
or event messages and remains compatible with the pre-workflow application.

The membership workflow, fixed grade master, generic community identities,
status history, and approved-member directory are introduced in a subsequent
migration together with the code that consumes them. This avoids an interval
where the database has advanced but the deployed application cannot run.
