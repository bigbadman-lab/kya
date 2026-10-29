# KYA-03B — Permissionless agent identity

Status: architecture locked by KYA-03C. The SQL migration is written and has not been applied. REST, DNS resolution, MCP, and OpenAI are not implemented.
Baseline: KYA-03A identity architecture (design report). That design was not committed as a file in this repository. This document does not replace or rewrite it. The committed application remains the KYA-02 frontend on `main`.
Implementation notes: `docs/KYA_03C_MIGRATION.md`.

This revision changes who may create an identity and who may manage it. Registration, domain control, and management authority stay separate facts.

## 1. Changes from KYA-03A

| Topic | KYA-03A | KYA-03B |
|---|---|---|
| Autonomous registration | Required a bearer credential that a signed-in developer had already created | `POST /api/v1/agents/register` requires no session and no pre-existing key |
| `owner_user_id` | Not null | Nullable. Null does not grant public management |
| Management credential | Account-scoped token with `register` and `manage`, able to create further agents | One active credential scoped to one agent. It cannot register other agents or mint extra credentials |
| Verified host | Partial unique index: one active verified agent per host | Removed. Each agent that completes its own challenge can be verified for the same host |
| Public search | Active identities, with a filter for unverified or verified | Search returns only active identities whose domain verification is unexpired. Unverified identities resolve by direct lookup only |
| API paths | Unversioned `/api/agents` | `/api/v1/...` |
| Rate-limit subject | Credential id | IP, network prefix, and a global ceiling, because registration has no credential yet |
| Lost token | Not specified | No unauthenticated reissue. Domain control does not rotate credentials |
| Human link | Owner set at creation | Optional later association, only with the current management secret and a signed-in user |

Unchanged from KYA-03A:

- Internal UUID and server-generated `public_id` (`kya_` + 26 lowercase Crockford base32 characters, encoding 128 random bits). Client-supplied ids are ignored.
- Public URL `/agents/{public_id}`. Revoked ids stay reserved.
- DNS TXT is the only verification method implemented for the MVP. `http_well_known` stays in the enum and is not enabled.
- Challenge lifetime 15 minutes. Verification validity 90 days.
- Changing the claimed host clears verification. Revocation clears active verification.
- Inspector output cannot change verification. Registration does not call OpenAI.
- Service-role key stays on the server. Browser clients use the anon key only.
- Categories and capabilities remain the KYA-02 allowlists.

## 2. Schema

All timestamps are `timestamptz`. Ids that clients may send are rejected by validation before SQL. Critical transitions run inside one database function so a partial write cannot commit.

### `agents`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | Primary key, `gen_random_uuid()`. Immutable |
| `public_id` | `text` | no | Unique. Check `^kya_[0-9a-hjkmnp-tv-z]{26}$`. Immutable. 128 random bits, two padding bits |
| `owner_user_id` | `uuid` | yes | References `auth.users(id)` when set. Null for agent-first registration. Not a management grant by itself |
| `name` | `text` | no | Length 2–80 |
| `description` | `text` | no | Length 10–500 |
| `endpoint_url` | `text` | no | Canonical HTTPS URL |
| `claimed_host` | `text` | no | Normalized hostname. Not unique |
| `category` | `text` | no | `Research`, `Commerce`, `Operations`, `Developer tools` |
| `capabilities` | `text[]` | no | 1–12 values, each in `search`, `summarize`, `scheduling`, `checkout`, `code-review`, `monitoring` |
| `agent_card_url` | `text` | yes | Optional HTTPS URL. Stored, not fetched |
| `lifecycle` | `text` | no | Default `active`. `active`, `suspended`, `revoked` |
| `domain_verification` | `text` | no | Default `unverified`. `unverified`, `verified`, `expired` |
| `verified_host` | `text` | yes | Host that passed the check. Must equal `claimed_host` while verified |
| `verification_expires_at` | `timestamptz` | yes | Required when the column says `verified` |
| `created_at` | `timestamptz` | no | Default `now()`. Immutable |
| `updated_at` | `timestamptz` | no | Default `now()` |
| `revoked_at` | `timestamptz` | yes | Set when lifecycle becomes `revoked` |

Checks:

- `domain_verification = 'verified'` implies `verified_host = claimed_host` and `verification_expires_at` is not null.
- `lifecycle = 'revoked'` implies `domain_verification <> 'verified'`.
- `lifecycle = 'revoked'` implies `revoked_at` is not null.

Indexes:

- Unique `public_id`.
- `owner_user_id` where not null.
- `(lifecycle, domain_verification, verification_expires_at, created_at desc)` for search.
- GIN on stored `search_vector` over name, description, and capabilities.
- `claimed_host` as a non-unique lookup index.

No unique constraint on `claimed_host` or `verified_host`.

Retention: rows are permanent. Revocation does not delete the row. `public_id` is never reused.

### `agent_management_credentials`

Replaces the KYA-03A account-level `api_credentials` model. One table, one active credential per agent.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | Primary key |
| `agent_id` | `uuid` | no | References `agents(id)` |
| `token_prefix` | `text` | no | Non-secret display prefix, e.g. `kya_mgmt_` plus 8 characters |
| `token_hash` | `text` | no | Unique. SHA-256 hex of the full secret |
| `expires_at` | `timestamptz` | yes | Null means no expiry. MVP credentials are created with null expiry |
| `revoked_at` | `timestamptz` | yes | |
| `last_used_at` | `timestamptz` | yes | Updated by privileged code. Not a secret |
| `created_at` | `timestamptz` | no | Default `now()` |

Partial unique index: one row per `agent_id` where `revoked_at` is null.

The secret is 32 random bytes, encoded so it can travel in an `Authorization: Bearer` header. The database stores the hash and the prefix. Nothing in this table grants `register` on other agents.

Retention: revoked rows stay so a leaked old token still hashes to a revoked record and fails. Do not delete hashes to “clean” a leak.

### `verification_challenges`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | Primary key |
| `agent_id` | `uuid` | no | References `agents(id)` |
| `method` | `text` | no | `dns_txt` or `http_well_known`. Only `dns_txt` can be created in the MVP |
| `token_hash` | `text` | no | SHA-256 of the published token |
| `host` | `text` | no | `claimed_host` at issue time. Immutable |
| `status` | `text` | no | `pending`, `passed`, `failed`, `expired` |
| `expires_at` | `timestamptz` | no | `created_at + 15 minutes` |
| `consumed_at` | `timestamptz` | yes | |
| `created_at` | `timestamptz` | no | |

Partial unique index: one `pending` row per `agent_id`.

### `verification_evidence`

Append-only. Current status on `agents` is a projection of the latest unrevoked passing row plus the clock.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | Primary key |
| `agent_id` | `uuid` | no | References `agents(id)` |
| `challenge_id` | `uuid` | no | Unique. References `verification_challenges(id)` |
| `method` | `text` | no | |
| `host` | `text` | no | |
| `result` | `text` | no | `passed` or `failed` |
| `expires_at` | `timestamptz` | yes | Pass sets this to 90 days. Fail leaves it null |
| `revoked_at` | `timestamptz` | yes | |
| `created_at` | `timestamptz` | no | |

Do not store DNS or HTTP bodies.

### `agent_events`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | Primary key |
| `agent_id` | `uuid` | no | References `agents(id)` |
| `event_type` | `text` | no | `created`, `updated`, `challenge_issued`, `verification_passed`, `verification_failed`, `verification_expired`, `verification_revoked`, `suspended`, `reinstated`, `revoked`, `credential_rotated`, `credential_revoked`, `owner_associated` |
| `metadata` | `jsonb` | no | Default `{}`. No tokens, hashes, or raw `Authorization` values |
| `actor_user_id` | `uuid` | yes | Set when a Supabase user performed the act |
| `created_at` | `timestamptz` | no | |

Retention: keep for the life of the identity.

### `request_windows`

Shared counters for every Vercel instance.

| Column | Type | Null | Notes |
|---|---|---|---|
| `subject` | `text` | no | `ip:<hash>`, `net:<hash>`, or `global` |
| `action` | `text` | no | `register`, `challenge_issue`, `challenge_complete` |
| `window_start` | `timestamptz` | no | Truncated hour |
| `hits` | `integer` | no | |

Primary key `(subject, action, window_start)`.

Store a hash of the network address, not the raw address. Retention: delete windows older than 48 hours with `purge_request_windows()`. Failure to clean up must not block registration.

Caps live in `rate_limit_policies`, one row per action. The locked registration row is 5 per IP hour, 20 per IPv4 `/24` or IPv6 `/64` hour, and 500 globally per hour. Challenge rows are 30 issues and 10 completions per agent hour. Change caps only with a reviewed migration. A missing registration row fails closed.

### `inspector_reports`

Included so KYA-05 does not alter identity tables. Unused until then.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | Primary key |
| `agent_id` | `uuid` | no | References `agents(id)` |
| `summary` | `text` | no | |
| `created_at` | `timestamptz` | no | |

No trigger and no application path may copy `summary` into `domain_verification`.

### Immutable fields

Database privileges and checks, not only application code:

- `agents.id`, `agents.public_id`, `agents.created_at` never update.
- `verification_challenges.host` and `token_hash` never update.
- `verification_evidence` inserts only. Later revocation sets `revoked_at` and does not rewrite `result`.
- `agent_events` inserts only.

`owner_user_id` updates only inside `associate_agent_owner`. Verification columns update only inside verification and revocation functions.

## 3. RLS and grants

Enable RLS on every table, including `inspector_reports`.

`security_barrier` on a view stops predicate leakage. It does not apply the caller’s RLS. In Postgres 15 and later a view with `security_invoker = false` (the historical default) runs with the view owner’s rights. If that owner can read the base tables, a mistake in the view exposes rows the caller’s policies would hide. `security_invoker = true` uses the caller’s rights, which means the caller also needs `SELECT` on the base table, and then column exposure depends on grants.

KYA-03B does not use a superuser-owned view as the public API.

Pattern:

- `anon` and `authenticated` have no `INSERT`, `UPDATE`, `DELETE`, or `SELECT` on the base tables.
- Public read goes through two `SECURITY DEFINER` functions owned by a role that can read `agents` and nothing else. `search_path` is locked. `EXECUTE` is granted to `anon` and `authenticated`.
  - `lookup_public_agent(public_id text)`
  - `search_public_agents(query text, category text, cursor timestamptz, limit int)`
- Writes go through `SECURITY DEFINER` functions that are executable by `service_role` only:
  - `register_agent(...)`
  - `update_agent_metadata(...)`
  - `issue_dns_challenge(...)`
  - `complete_dns_challenge(...)`
  - `rotate_management_credential(...)`
  - `revoke_management_credential(...)`
  - `associate_agent_owner(...)`
  - `set_lifecycle(...)`
- The Next.js server calls those functions with the service role. The function receives the presented bearer and hashes it internally. It has no argument for a client-supplied hash. It also checks `owner_user_id` when the bearer is absent. A route cannot authorize a call by passing a hash it read from the database.
- Authenticated humans do not get a policy that updates `domain_verification`, `verified_host`, `verification_expires_at`, `lifecycle`, or `public_id`.
- `token_hash` is not in any function return signature except the internal comparison. No policy grants `SELECT` on `agent_management_credentials` to `anon` or `authenticated`.

| Relation | anon | authenticated | service role |
|---|---|---|---|
| Base tables | no privileges | no privileges | bypasses RLS; used only inside the functions above |
| `lookup_public_agent`, `search_public_agents` | execute | execute | execute |
| Write functions | no | no | execute |
| `agent_management_credentials` | no | no | function-only |
| `verification_challenges`, `verification_evidence`, `agent_events`, `request_windows` | no | no | function-only |
| `inspector_reports` | no | no | no, until KYA-05 adds an insert function |

Owner dashboards read through the server with the user session. The server uses a function `list_owned_agents(owner uuid)` that returns management fields and the token prefix, never `token_hash`.

## 4. Public and private identity

### Direct lookup

`lookup_public_agent` computes verification with the clock:

```text
effective_verification =
  expired    if column is verified and verification_expires_at <= now()
  verified   if column is verified and verification_expires_at > now()
  otherwise  the stored unverified or expired value
```

Search uses the same predicate, so a stale `verified` flag cannot keep an identity in the registry after expiry.

| Lifecycle | Lookup body |
|---|---|
| `active` | `publicId`, `identityUrl`, `name`, `description`, `category`, `capabilities`, `endpointUrl`, `claimedHost`, `lifecycle`, `domainVerification` (effective), `verificationExpiresAt`, `registered: true` |
| `suspended` or `revoked` | `publicId`, `identityUrl`, `lifecycle`, `registered: true`. No name, endpoint, capabilities, or verification detail |

Unknown `public_id`: `404`. A tombstone is returned only when the row exists.

### Search

`search_public_agents` returns the active lookup shape for rows where `lifecycle = 'active'` and effective verification is `verified`. Unverified, expired, suspended, and revoked rows are absent. There is no trust score, endorsement, or user count.

### Private management view

Returned to an authorized manager, still without secrets except at the moments listed below:

`agentCardUrl`, `createdAt`, `updatedAt`, `ownerAssociated` (boolean, not the user uuid), `credentialPrefix`, `credentialRevokedAt`, pending challenge instructions when one exists.

The plaintext management token appears only in:

- the `201` from registration
- the `200` from rotation

Those responses set `Cache-Control: no-store`.

## 5. Registration and credentials

### Permissionless registration

`POST /api/v1/agents/register` accepts no `Authorization` requirement.

If a Supabase session is present, the same call sets `owner_user_id` to that user. Absence of a session leaves it null. The management token is issued either way. A session is not required.

Rejected body fields: `id`, `publicId`, `ownerUserId`, `lifecycle`, `domainVerification`, and any unknown property.

The handler does not call OpenAI.

### Token

1. `register_agent` reads 32 bytes from `gen_random_bytes`.
2. Encode them as `kya_mgmt_` plus 52 lowercase Crockford characters.
3. SHA-256 the exact bearer string inside the database.
4. Persist the hash and the non-secret prefix (`kya_mgmt_` plus the first 8 characters).
5. Return the bearer string once. The route must not log that return value.

Logs, traces, and error strings may include `public_id` and `token_prefix`. They must not include the bearer string, the hash, or the `Authorization` header. Redact those keys in the error formatter before logging.

### Authority

| Actor | May do |
|---|---|
| Anonymous caller | Register a new identity. Nothing else |
| Holders of the active unexpired management credential for that agent | Update metadata, run DNS verification, rotate or revoke that credential, suspend, reinstate, or revoke the identity |
| Supabase user where `owner_user_id` matches | The same management actions, plus rotate or revoke the credential without presenting the old secret |
| Anyone else | Public lookup and search only |

The management credential cannot call `POST /api/v1/agents/register` for another identity and cannot insert a second active credential. Rotation revokes the current row and inserts the replacement in the same transaction.

### Expiry, rotation, loss

Default `expires_at` is null. Revocation sets `revoked_at`. A revoked or expired credential fails closed.

Rotation requires the current credential or the associated human owner. The old hash stops working when the transaction commits.

Lost-token recovery:

- No unauthenticated reissue.
- Completing DNS verification does not mint a credential.
- Matching `claimed_host` or `name` does not mint a credential or set `owner_user_id`.
- If `owner_user_id` is set, that signed-in user may rotate the credential.
- If `owner_user_id` is null and the secret is lost, management of that `public_id` is gone. The row remains. A new registration creates a different `public_id`, even for the same host. Operator suspension of the abandoned row is a service-role action, not a public endpoint.

### Human association

`POST /api/v1/agents/{publicId}/association` requires both the active management bearer and a Supabase session, in one request.

The function sets `owner_user_id` only when it is null. If it already equals that user, the call is a no-op success. If it is a different user, the call returns `409`. Association does not delete the agent credential.

A human who registers while signed in is associated at creation and does not need this call.

## 6. Verification lifecycle

```text
create            lifecycle active, domain_verification unverified
issue challenge   stays unverified; one pending challenge for the current claimed_host
pass              unverified or expired -> verified, verified_host = host, expires in 90 days
fail or expire    stays unverified; challenge row is failed or expired
clock expiry      effective state becomes expired even if the column still says verified
host change       verified -> unverified, verified_host null, passing evidence revoked_at set
revoke check      verified or expired -> unverified, evidence revoked_at set
suspend           lifecycle suspended; search hides the row; lookup returns a tombstone
reinstate         suspended -> active
revoke identity   active or suspended -> revoked (terminal), verification cleared, public_id reserved
```

DNS name rules:

- `endpointUrl` must be `https`, with no username or password.
- Port empty or `443`.
- Hostname is not an IP address.
- Convert IDNA2008 to the A-label, store that lowercase form, strip one trailing dot.
- Reject empty labels, underscores, and any label equal to `*` or starting with `*`.
- Reject `.local`, `.localhost`, `.internal`, `.home`, `.arpa`, and single-label names.
- The TXT query name is `_kya-challenge.` plus the stored A-label.
- Accept an answer only when the resolver reports that exact name. A wildcard at the parent that synthesizes this name is treated as DNS control of the name, which is the property being proved. Do not accept a TXT record from any other name.
- Compare the published value to the stored hash. Do not store the plaintext token.
- Use a resolver the server chooses. Do not follow HTTP redirects. This path does not fetch a URL.

Concurrent completes use:

```text
update verification_challenges
set status = 'passed', consumed_at = now()
where id = $1 and agent_id = $2 and status = 'pending'
  and expires_at > now() and consumed_at is null
  and host = agents.claimed_host
returning id
```

Zero rows means no verification write. Evidence insert, agent status update, and the event share that transaction.

A reused or expired challenge cannot pass. A second pending issue expires the previous pending row in the same transaction that inserts the new one.

Verification does not identify a human and does not mean the agent is safe or still operating as described.

## 7. API contracts

Base path `/api/v1`. JSON only. Unknown properties fail with `400`. Credential-bearing responses send `Cache-Control: no-store`.

| Method and path | Auth | Success |
|---|---|---|
| `POST /api/v1/agents/register` | None. Optional Supabase session sets owner | `201` public profile, `managementToken`, `identityUrl`, `domainVerification: "unverified"`, DNS next-step text |
| `GET /api/v1/agents/{publicId}` | None | `200` lookup shape or tombstone. `404` if never issued |
| `GET /api/v1/agents?q&category&cursor` | None | `200` verified, unexpired, active page |
| `PATCH /api/v1/agents/{publicId}` | Management bearer or owning user | `200` public profile. Host change clears verification |
| `POST /api/v1/agents/{publicId}/challenges` | Management bearer or owning user | `201` plaintext challenge token, TXT name, `expiresAt`. Method other than `dns_txt` is `501` |
| `POST /api/v1/agents/{publicId}/challenges/{id}/complete` | Management bearer or owning user | `200` with effective `domainVerification`. Challenge consumed |
| `POST /api/v1/agents/{publicId}/credentials/rotate` | Current bearer or owning user | `200` new token once. Previous row revoked |
| `POST /api/v1/agents/{publicId}/credentials/revoke` | Current bearer or owning user | `200`. Further bearer calls fail. Owner session still works if associated |
| `POST /api/v1/agents/{publicId}/association` | Current bearer and Supabase session | `200` or `409` |
| `POST /api/v1/agents/{publicId}/suspend` | Bearer or owner | `200` |
| `POST /api/v1/agents/{publicId}/reinstate` | Bearer or owner | `200` |
| `POST /api/v1/agents/{publicId}/revoke` | Bearer or owner | `200` tombstone fields |

`POST /api/v1/agents/register` body:

```json
{
  "name": "Harbor",
  "description": "At least ten characters.",
  "endpointUrl": "https://harbor.example/agent",
  "category": "Research",
  "capabilities": ["search"],
  "agentCardUrl": "https://harbor.example/.well-known/agent-card.json"
}
```

`agentCardUrl` may be omitted. Payload cap: 8 KB.

Errors: `400` validation, `401` missing or bad bearer where auth is required, `403` credential for a different agent, `404` unknown id, `409` association conflict or unique collision after retries, `429` rate limit, `503` rate-limit store unavailable.

### MCP

A future tool `kya_register_agent` calls the same `register_agent` function as the route. It does not open another database and does not add columns. KYA-06 implements the tool. This phase does not.

### OpenAI

KYA-05 may insert `inspector_reports`. Those rows are not inputs to `complete_dns_challenge`. Registration and challenge completion do not call OpenAI.

## 8. Abuse prevention

Registration is anonymous, so limits are on the network, not on a user id.

| Bucket | Key | Cap |
|---|---|---|
| Address | Hash of the platform client IP | 5 registrations per hour |
| Prefix | Hash of IPv4 /24 or IPv6 /64 | 20 registrations per hour |
| Global | `global` | 500 registrations per hour |
| Challenges | `agent:<uuid>` | 30 issues and 10 completions per hour |

These registration caps are locked. They are rows in `rate_limit_policies`, not constants copied into each route.

Client IP comes from the address Vercel sets on the function (`x-real-ip` as provided by the platform). Do not trust the left-most value of a caller-supplied `X-Forwarded-For`. If the platform IP is missing, do not guess. Return `503`.

Counters use one statement:

```text
insert into request_windows (subject, action, window_start, hits)
values ($1, 'register', date_trunc('hour', now()), 1)
on conflict (subject, action, window_start)
do update set hits = request_windows.hits + 1
where request_windows.hits < $limit
returning hits
```

Zero rows means `429`. The increment and `register_agent` share one transaction, so a failed insert rolls the counter back and a committed identity is always counted.

If the counter table cannot be reached, registration returns `503`. It does not proceed without a limit.

Rate limits are not identity proof. Automated clients that behave within the caps are accepted on the same route as browsers. Sustained abuse is handled by suspension of the issued `public_id` through the service role, which is outside the public API. Suspension does not delete the id.

Security log fields: time, route, result code, `public_id` when one exists, token prefix when one exists, hashed IP, challenge id. No secrets.

## 9. Atomic transactions

| Operation | Boundary |
|---|---|
| Register | Increment rate counters, insert `agents`, insert `agent_management_credentials`, insert `agent_events`. One function, one commit. Unique `public_id` collision retries with a new id inside the transaction, at most 3 times |
| Rotate credential | Revoke the active row and insert the new row. Partial unique index makes a second active row impossible |
| Issue challenge | Expire the current pending row, insert the new pending row |
| Complete challenge | Conditional update of the pending unexpired row, insert evidence, update agent verification columns, insert event |
| Host change | Update endpoint and host, clear verification columns, set `revoked_at` on current passing evidence, insert event |
| Revoke identity | Set lifecycle, `revoked_at`, clear verification, revoke evidence, insert event |
| Associate owner | Set `owner_user_id` only if null, insert event |

The route passes the presented bearer, or a user id taken from the verified session. The function hashes the bearer itself. It does not accept a hash argument or a boolean named `isAllowed`.

## 10. Implementation phases

| Phase | Scope |
|---|---|
| KYA-03C | `supabase/migrations/20261029120000_kya_identity_foundation.sql`. Written, not applied. No UI change |
| KYA-03D | Server Supabase clients, public lookup and search wired to the functions, registry and profile pages read live rows, demo module removed from those reads |
| KYA-04 | Permissionless registration, management credentials, DNS TXT issue and complete, human association, rate limits |
| KYA-05 | Inspector writes `inspector_reports` only |
| KYA-06 | MCP tool `kya_register_agent` calling the KYA-04 function |

KYA-02 pages stay visually as they are until a phase explicitly switches their data source.

## 11. Test plan

- Anonymous `register_agent` commits when `owner_user_id` is null.
- The same call with a user id sets `owner_user_id` and still returns one management credential.
- `public_id` matches the Crockford check, is not taken from the client, and retries on collision.
- The token from the function result is not equal to any stored column. `token_hash` equals SHA-256 of that token. A select as `anon` cannot read the hash.
- Rolling back the credential insert leaves no agent row.
- Metadata update with no bearer and no session returns `401`.
- A credential for agent A cannot update agent B.
- A revoked credential and an expired credential fail.
- Two concurrent registrations at the cap produce one success and one `429`.
- Search does not return an unverified active identity.
- Search returns a verified identity only while `verification_expires_at` is in the future, including when the stored flag still says `verified`.
- Two agents can both be `verified` for one host after two independent challenges.
- A consumed challenge and an expired challenge do not change `domain_verification`.
- A revoked `public_id` still lookup-resolves as a tombstone and cannot be inserted again.
- Completing a challenge does not read `inspector_reports`.
- Registration performs no network call except the database.
- Log fixtures assert the bearer string is absent.
- A body that includes `domainVerification` or `publicId` returns `400`.
- Host change clears a prior pass.
- Association without the bearer returns `401`. Association when `owner_user_id` is already another user returns `409`.
- Rate-limit storage failure returns `503` and inserts nothing.

## 12. Locked decisions

1. Public ids are `kya_` plus 26 Crockford characters. The generator draws 16 bytes and pads two zero bits. The stored id must end in `0`, `4`, `8`, `c`, `g`, `m`, `r`, or `w`.
2. Management credentials do not expire in the MVP. `expires_at` stays null unless a later migration sets it.
3. A lost bearer with a null owner is unrecoverable. DNS success does not mint a credential.
4. Registration caps are 5 per trusted IP hour, 20 per prefix hour, and 500 global per hour.
5. Suspended and revoked lookups return the same four-field tombstone.
6. A verified Supabase session on `register_agent` sets `owner_user_id` from that session. The JSON body cannot name an account.
7. Operator suspension and revocation stay on `operator_set_lifecycle`, which is service-role only and does not mint a credential.

Still outside this database migration: IDNA conversion, the trusted DNS resolver, HTTP `Cache-Control`, log redaction, the 8 KB body limit at the route, and refusing to call `register_agent` when the platform IP is missing. Those belong to KYA-04. The route must commit a `complete_dns_challenge` result that carries an `error` field, including mismatch, expiry, reuse, and an unknown challenge id, because that is how a failed attempt keeps its rate-limit count. Authorization and rate-limit failures still raise and roll back.
