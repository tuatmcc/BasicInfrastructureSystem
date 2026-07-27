# Database migration policy

## Runtime portability

The application does not use Supabase Auth, the Supabase JavaScript client, or
the Supabase Data API. Both Workers connect to the PostgreSQL connection string
with `pg` and `drizzle-orm/node-postgres`. In Workers, the connection string from
the Cloudflare Hyperdrive binding is preferred so connections are pooled; local
development falls back to `DATABASE_URL`. The shared application schema lives
in `share/drizzle/schema.ts`. Moving database providers therefore requires a
PostgreSQL connection string and running the reviewed SQL migrations, not
rewriting the application data-access layer.

The `supabase/migrations/` path records the ledger of the database currently
hosted by Supabase. Its new application migrations are PostgreSQL SQL and the
directory name does not make Supabase a runtime dependency. Historical files
fetched from the old deployment are retained only so that the existing database
ledger can be audited.

## Source of truth

`supabase/migrations/` is the only executable migration history. The files
dated `20260418` through `20260429` were fetched from the production Supabase
ledger without changing their timestamps. The former Drizzle SQL journal was
removed because it referenced a missing migration, omitted live migrations,
and could not rebuild the Better Auth schema.

`share/drizzle/schema.ts` remains the application schema and type definition. A schema
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

## Membership workflow migration

`20260716123951_membership_workflow.sql` never deletes identity, membership, or
grade data. It takes `ACCESS EXCLUSIVE` locks on `verification`, `session`,
`account`, `user`, `members`, and `grades`, and aborts unless all six tables are
empty. This makes destructive cleanup an explicit operator decision instead of
a migration side effect. `event_messages` are retained.

For confirmed disposable data only, fill and run
`supabase/runbooks/purge_confirmed_test_membership_data.sql` first. The runbook
locks the same six tables and requires exact primary-key sets plus exact
account-to-user, session-to-user, user-to-member, and member-to-grade mappings.
Any mismatch aborts before deletion; issue `ROLLBACK`, investigate, and prepare
a new reviewed input set rather than weakening an assertion.

The fixed grade master is B1-B4, M1-M2, D1-D3, OB/OG, and その他. Grade rows are
changed by migration only.

Application uniqueness is deliberately individual, not composite:

- `members.student_id` is trimmed, upper-cased, and unique.
- `members.student_email` is trimmed, lower-cased, and unique.
- `user.member_id` is unique when non-null.
- `account(provider_id, account_id)` is unique.
- `community_identities(provider, provider_account_id)` is unique.
- `community_identities(user_id, provider)` is unique.

Rejected and withdrawn applications retain these identifiers because the same
member row is edited and resubmitted. Resolving a genuinely abandoned claim is
an explicit administrator operation, not a second application record.

Membership state transitions are enforced by a database trigger, including the
actor role, review metadata, and an exact one-step application-version increment.
New applications can only start as `pending` version 1. A reviewed user cannot
be deleted while `members.reviewed_by_user_id` references it, and a member with
status history cannot be deleted implicitly. `member_status_history.changed_by_user_id`
is a required text snapshot with deliberately no user foreign key, so deleting
an authentication account does not null or erase the recorded actor identity.

## Dedicated runtime login and Hyperdrive cutover

Run `supabase/runbooks/provision_app_runtime_login.sql` through a private
operator connection after replacing its role and random-password placeholders
in a local, uncommitted copy. The runbook rejects database/object owners and
creates a `LOGIN INHERIT` role with no superuser, database/role creation,
replication, or RLS-bypass capability. Its only role membership is `app_rls`;
it receives no direct object privileges.

`INHERIT` is required because Better Auth issues autocommit queries outside the
application's short request-context transactions. The inherited `app_rls`
policies allow those auth-table queries. Business tables still use forced RLS
and expose nothing with an empty request context; each business operation must
run in a short transaction that sets validated `app.current_*` values locally.

Cut over without using the owner credential in application traffic:

1. Store the dedicated login URL as a secret and create/update the Hyperdrive
   configuration; URL-encode the generated password.
2. Connect as that role and run the verification queries printed by the
   runbook. Confirm `pg_has_role(current_user, 'app_rls', 'USAGE')`, auth-table
   access, and closed business-table RLS with empty context.
3. Deploy one Worker as a canary and verify sign-in plus a membership operation,
   then move the remaining Worker to the same Hyperdrive configuration.
4. Keep the prior configuration only for a bounded rollback window. After both
   Workers are healthy, rotate or revoke the old application credential.

## Initial administrator

There is no automatic first-admin or email-based bootstrap. After the first
operator signs in, explicitly links Discord, and verifies membership in the
target server, run the checked template in
`supabase/runbooks/promote_initial_admin.sql`. The template selects exactly one
user through the verified OAuth provider account and guild membership; it does
not embed a personal ID in a migration.
