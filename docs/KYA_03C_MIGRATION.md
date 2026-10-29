# KYA-03C migration

The migration is `supabase/migrations/20261029120000_kya_identity_foundation.sql`. It was applied to the live KYA project `guqyvrqokihydmrjmrwl` on 2026-10-29 and recorded as version `20261029120000`. Static review notes from KYA-03C-V remain below. Runtime results are in the KYA-03C-LIVE report, not in this file.

There is no `supabase/config.toml` and no linked project. Do not create one that points at production.

## Where these commands may run

Use a local database, or a new Supabase project created by hand for this work. Do not use the production project. Do not put a connection URI on a command line. Pass the password with `PGPASSWORD` from `read -rs`, or with a `.pgpass` file. The runner scrubs the host and password from psql output and does not pass a URI to psql.

Local connection:

```sh
export PGHOST=127.0.0.1
export PGPORT=54322
export PGUSER=postgres
export PGDATABASE=postgres
read -rs PGPASSWORD
export PGPASSWORD
```

Hosted development connection, after a new project exists:

```sh
export KYA_ALLOW_DEV_DATABASE=yes
export KYA_DEV_PROJECT_REF="<new 20-character ref>"
export KYA_PRODUCTION_PROJECT_REF="<production 20-character ref>"
export PGHOST="db.${KYA_DEV_PROJECT_REF}.supabase.co"
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=postgres
export PGSSLMODE=require
read -rs PGPASSWORD
export PGPASSWORD
```

The runner accepts that host only when both refs are set, they differ, and `KYA_ALLOW_DEV_DATABASE=yes`. It refuses pooler hosts, every other host, and a development ref that equals the production ref. Hosted tests must use `postgres`, because the script changes roles and replaces functions inside a transaction.

Unset `PGPASSWORD` when finished. Do not commit it.

## Apply, after review

Local, with Docker already running:

1. `supabase init` only if `supabase/config.toml` is still absent. Keep the existing `supabase/migrations` directory.
2. `supabase db reset` recreates the local database and runs the migration.

Hosted development, from the repository root, with the exports above:

```sh
export KYA_APPLY_MIGRATION=yes
python3 supabase/tests/kya_psql.py supabase/migrations/20261029120000_kya_identity_foundation.sql
unset KYA_APPLY_MIGRATION
```

That command is a committed change. It is refused unless `KYA_APPLY_MIGRATION=yes` and the host guard passes. Do not run `supabase db push` against a linked production project.

## Transactional tests

`supabase/tests/kya_03c_identity.sql` is one transaction and ends in `ROLLBACK`. Run it only through the runner:

```sh
sh supabase/tests/run.sh
unset PGPASSWORD
```

The connection role must be able to `SET ROLE` to `anon`, `authenticated`, `service_role`, and `kya_writer`. On hosted Supabase that is `postgres`. `service_role` cannot run this file.

A dropped connection rolls the open transaction back. The file contains no `COMMIT`.

## Simultaneous registrations

`sh supabase/tests/run_concurrent.sh` opens two sessions at once. It is not part of `run.sh`. It requires `KYA_ALLOW_DEV_WRITE=yes` plus the same connection guard.

Before the sessions, it deletes only this hour's `register` windows for `global` and for the fixed test subjects, then sets `global_hourly_limit` to 1. On exit it writes the previous cap back. If that restore fails, the script says so and the cap must be put back by hand before the database is used again.

One session should print `kya_concurrent_ok` and the other `kya_concurrent_limited`. The script prints those two counts. It exits if the output contains a management token. The successful registration is committed. The identity cannot be deleted; revoke it later with `operator_set_lifecycle` if the development project should not keep it. Run this only on a database you can discard.

```sh
export KYA_ALLOW_DEV_WRITE=yes
sh supabase/tests/run_concurrent.sh
unset PGPASSWORD
unset KYA_ALLOW_DEV_WRITE
```

## Supabase compatibility

- `postgres` on hosted projects can create roles and bypass RLS, and is not a superuser. The migration creates `kya_reader` and `kya_writer` with `NOINHERIT NOLOGIN` and leaves the other attributes at their defaults.
- Hosted `supautils.hint_roles` allows `SET ROLE` only for `anon`, `authenticated`, and `service_role`. Changing a function owner to `kya_reader` or `kya_writer` is rejected. The functions stay owned by the migration role and mark writes with `kya.function_write`. Triggers reject unmarked writes. `postgres` bypasses RLS inside those functions. `anon`, `authenticated`, and `service_role` still have no table privileges.
- `kya_sha256_hex` and `kya_random_bytes` stay owned by the migration role and are the only callers of `extensions.digest` and `extensions.gen_random_bytes`. The migration does not grant the `extensions` schema to `kya_writer`.
- `kya_auth_user_exists` stays owned by the migration role for the same reason: `kya_writer` must not receive `SELECT` on `auth.users`. It returns a boolean. `EXECUTE` is granted only to `kya_writer`.
- `pgcrypto` is expected in the `extensions` schema, which hosted projects already have. The migration creates that schema or extension only when it is absent.
- `anon`, `authenticated`, `service_role`, and `auth.users` must already exist. A bare Postgres server without Supabase Auth fails closed with `kya_unavailable`.
- Direct connections use `db.<ref>.supabase.co`. The session pooler is refused because `SET ROLE` and temporary objects are not reliable there. Some projects expose that direct host only over IPv6. This procedure does not switch to the pooler to work around that.
- `FORCE ROW LEVEL SECURITY` is enabled on every identity table. `postgres` bypasses RLS, so the function bodies are the access check. A direct insert is still rejected because it does not set `kya.function_write`.

## What the migration enforces

- Anonymous and authenticated roles have no privileges on the base tables, credential hashes, challenge secrets, event rows, or request windows.
- They may execute `lookup_public_agent` and `search_public_agents` only.
- `service_role` may execute the write functions and `purge_request_windows`. It cannot read or write the base tables directly, and it cannot execute `kya_auth_user_exists`, `kya_sha256_hex`, or `kya_random_bytes`.
- Write and public-read functions are owned by the migration role on hosted Supabase. `kya_reader` and `kya_writer` are not granted to `anon`, `authenticated`, or `service_role`.
- Management functions hash the presented bearer. They do not take a hash, a lifecycle, or a verification state as an argument.
- `register_agent` creates the agent, the one active credential, and the audit event in one function. A failed credential insert rolls the agent back. A public-id collision retries three times.
- `p_owner_user_id` is accepted only when `kya_auth_user_exists` is true. The route must pass `auth.getUser()` or null. The database cannot see the end-user JWT on a `service_role` connection, so a stolen service-role key can name an existing account. That is the server trust boundary, not a grant to `anon`.
- Rate counters use one conditional upsert. Lock order is global, then network, then address. A missing policy or a null cap raises `kya_unavailable` and inserts nothing.
- Search returns active rows whose stored verification is `verified` and whose `verification_expires_at` is still in the future.
- Lookup returns a public profile for an active identity, including an unverified one. Suspended and revoked identities return `publicId`, `identityUrl`, `lifecycle`, and `registered`.
- Several agents may be verified for one host. There is no unique index on `claimed_host` or `verified_host`.
- Revoked public ids stay in the table. Deletes of identity rows are rejected.
- `inspector_reports` exists so a later inspector does not reshape these tables. A trigger rejects every write. Verification functions do not read it.

## Route contracts for KYA-04

The database does not see the raw HTTP body, the platform IP, or DNS.

| Condition | Database result | HTTP |
|---|---|---|
| `kya_invalid` | raise | 400 |
| `kya_unauthorized` | raise | 401 |
| `kya_forbidden` | raise | 403 |
| `kya_not_found` | raise, or lookup returns null | 404 |
| `kya_conflict`, `kya_collision` | raise | 409 |
| `kya_not_implemented` | raise | 501 |
| `kya_rate_limited` | raise | 429 |
| `kya_unavailable` | raise | 503 |
| `complete_dns_challenge` returns `{"error": ...}` | no raise, including `kya_not_found` for an unknown challenge | 400, or 404 when the error is `kya_not_found`. The route must commit |

`p_owner_user_id` is the id from `auth.getUser()`, or null. Never copy it from the JSON body.

IP subjects are `ip:` plus the hex SHA-256 of the platform client address. Network subjects are `net:` plus the hex SHA-256 of the IPv4 `/24` or IPv6 `/64` prefix. The global bucket is internal. If the platform address is missing, do not call `register_agent`; return 503. Do not trust a caller-supplied `X-Forwarded-For`.

The server resolves `_kya-challenge.<host>` itself and passes only those TXT values. Unicode hostnames are converted to IDNA2008 A-labels before the call. The database rejects non-ASCII names, wildcards, addresses, and single-label or local suffixes.

Responses that contain `managementToken` or `publishedToken` send `Cache-Control: no-store`. Logs may keep `publicId` and `credentialPrefix`. They must not keep the bearer, the hash, or the `Authorization` header.

`operator_set_lifecycle` is not a public route.

## Deferred

- REST handlers, registry and profile reads, registration UI, MCP, and OpenAI.
- Actually querying DNS. The SQL tests simulate observations.
- IDNA conversion and the platform IP header. The SQL tests pass already hashed subjects.
- Executing the SQL. `run_concurrent.sh` is the two-session procedure. It has not been run. The sequential cap remains in the transactional test, which has also not been run.
- Replacing the inspector trigger. KYA-05 does that, and it still must not write verification columns.
