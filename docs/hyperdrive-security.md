# Hyperdrive security operations

Both Workers access PostgreSQL through their `HYPERDRIVE` binding with `pg` and
Drizzle. Supabase SDK, Supabase Auth, and the Data API are not part of the
runtime path.

## Security invariants

1. **Use a dedicated database login.** Hyperdrive must never store `postgres`,
   a database owner, a superuser, or a role with `BYPASSRLS`. Provision the
   dedicated login from a private copy of
   `supabase/runbooks/provision_app_runtime_login.sql`; never commit its
   password.
2. **Keep authorization state transaction-local.** Hyperdrive uses transaction
   pooling. Each protected database unit starts a short transaction, executes
   `SET LOCAL ROLE app_rls`, installs the validated request identity with local
   `set_config`, performs only its database work, and commits or rolls back.
   Request identity must never be installed with session-level `SET`.
3. **Never wait on an external service in a database transaction.** Discord and
   OAuth requests happen before or after the short database unit. This prevents
   a slow upstream from pinning an origin connection and exhausting the pool.
4. **Fail closed on an unsafe login.** Worker database initialization rejects a
   login that is a superuser, has `BYPASSRLS`, or cannot use `app_rls`.
5. **Disable query caching for authorization-sensitive traffic.** Authentication,
   sessions, permissions, RLS-filtered directory results, admin data, and
   read-after-write responses all share these bindings, so both Hyperdrive
   configurations must have `caching.disabled: true`.
6. **Do not override TLS verification in application code.** The connection
   string supplied by Hyperdrive owns the TLS policy. Never set
   `rejectUnauthorized: false`.

These rules follow Cloudflare's current guidance for
[transaction pooling](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/),
[short connection lifecycles](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/),
and [cache-disabled authorization reads](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/).

## Production change order

Use a maintenance window. Do not deploy the new Worker code halfway through
this sequence.

1. Back up the database and stop application writes.
2. Audit every existing test row, fill a private copy of
   `supabase/runbooks/purge_confirmed_test_membership_data.sql`, and execute it.
3. Apply `20260716123951_membership_workflow.sql`. It refuses to run while any
   replaced authentication/member/grade table is non-empty.
4. Fill and execute a private copy of
   `supabase/runbooks/provision_app_runtime_login.sql` with a generated password
   of at least 32 characters.
5. Update both Hyperdrive origin credentials through a secret-safe Cloudflare
   surface. Do not put the password in source control, CI logs, chat, or shell
   history.
6. Verify both configurations before deploying:

   ```bash
   cd community
   npx wrangler hyperdrive get 9fdd8328502e4698ae4433453a49acd3
   npx wrangler hyperdrive get b28287cdd8df4631b3f0b3014d36122a
   ```

   Each result must show `caching.disabled: true`, and the origin user must be
   the dedicated login rather than `postgres`.
7. Deploy both Workers and exercise sign-in, Discord verification, application
   submission, approval, and directory access. Restore writes only after these
   checks pass.

## Database verification

Connect using the dedicated runtime credentials and verify the boundary:

```sql
select
  session_user,
  current_user,
  rolsuper,
  rolbypassrls,
  pg_has_role(current_user, 'app_rls', 'USAGE') as can_use_app_rls
from pg_roles
where rolname = current_user;

reset all;
select count(*) from public.members;
```

The role must not be privileged, `can_use_app_rls` must be true, and the final
query must expose no business rows without a validated transaction-local
request context. Better Auth tables remain available to the runtime role so its
adapter can use normal autocommit queries.

## TLS hardening

Hyperdrive requires encrypted origin connections by default. If the database
CA for the deployment is available as a single regional certificate, upload it
to Cloudflare and move both configurations to `verify-full` so the certificate
chain and hostname are explicitly pinned. This requires a Cloudflare CA
certificate ID; do not select `verify-full` without first uploading the correct
database CA. See Cloudflare's
[Hyperdrive TLS certificate guide](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive/).

## Local development

Keep each Worker's secrets in its own ignored `.dev.vars`. Hyperdrive's local
connection override is a Wrangler **process environment variable**, not a
normal Worker variable:

```bash
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE='postgresql://app_runtime_login:password@localhost:5432/postgres'
```

Do not copy the repository-wide `.env` into both Workers; that exposes secrets
to components that do not need them.
