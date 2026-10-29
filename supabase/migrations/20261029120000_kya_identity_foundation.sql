-- KYA-03C identity foundation.
-- Permissionless registration, one management credential per agent, DNS TXT
-- verification state, and public lookup/search. No REST handlers, no OpenAI.
--
-- Apply only after review, and only to a local database or a new isolated
-- development project. Do not run this against the production Supabase project.
--
-- Public ids are kya_ plus 26 lowercase Crockford Base32 characters. That is
-- 128 random bits plus two padding bits. The final character is one of
-- 048cgmrw. Callers cannot supply the id.
--
-- Privilege model:
--   anon / authenticated: execute lookup_public_agent and search_public_agents only.
--   service_role: execute the write functions. No base-table privileges.
--   kya_reader: can read public agent columns. Not a member of service_role.
--   kya_writer: can write the guarded tables. Not a member of service_role.
--   Hosted Supabase loads supautils and only allows SET ROLE to anon,
--   authenticated, and service_role. ALTER FUNCTION OWNER TO kya_reader or
--   kya_writer therefore fails. The functions stay owned by the migration
--   role. Table writes from those functions set kya.function_write for the
--   transaction. A direct insert does not, and the triggers reject it.
--   kya_auth_user_exists, kya_sha256_hex, and kya_random_bytes stay owned by
--   the migration role. They are SECURITY DEFINER with search_path = pg_catalog.
--   The existence check returns a boolean so registration can reject unknown
--   account ids without granting kya_writer access to auth.users.
--   The crypto helpers exist so kya_writer never needs privileges on the
--   extensions schema, which the hosted migration role may not be allowed to grant.
--
-- Management functions hash the presented bearer inside the database. They have
-- no token-hash argument. A client-supplied hash is not accepted.
--
-- security_barrier is not used. Public reads are SECURITY DEFINER functions
-- with a locked search_path, not views. A security_barrier view with
-- security_invoker off would run as the view owner and bypass the caller's RLS.

do $ext$
begin
  if to_regnamespace('extensions') is null then
    execute 'create schema extensions';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    execute 'create extension pgcrypto with schema extensions';
  end if;
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null
     or to_regprocedure('extensions.digest(bytea, text)') is null then
    raise exception 'kya_unavailable';
  end if;
end
$ext$;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'kya_unavailable';
  end if;
  if to_regclass('auth.users') is null then
    raise exception 'kya_unavailable';
  end if;
end
$roles$;

-- Hosted Supabase postgres can create roles but is not a superuser. Naming
-- NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, or NOCREATEROLE can be rejected.
-- The defaults are already those restrictions. NOINHERIT keeps a member from
-- receiving these roles' table privileges unless it changes into the role.
do $roles_create$
begin
  if not exists (select 1 from pg_roles where rolname = 'kya_reader') then
    create role kya_reader noinherit nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'kya_writer') then
    create role kya_writer noinherit nologin;
  end if;
end
$roles_create$;

grant usage on schema public to kya_reader, kya_writer;

revoke create on schema public from anon, authenticated;

create function public.kya_fail(p_code text)
returns void
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if p_code not in (
    'kya_invalid',
    'kya_unauthorized',
    'kya_forbidden',
    'kya_not_found',
    'kya_conflict',
    'kya_collision',
    'kya_rate_limited',
    'kya_unavailable',
    'kya_not_implemented',
    'kya_challenge_mismatch',
    'kya_challenge_expired',
    'kya_challenge_consumed',
    'kya_challenge_rejected',
    'kya_immutable',
    'kya_inspector_deferred'
  ) then
    raise exception 'kya_invalid' using errcode = 'P0001';
  end if;
  raise exception '%', p_code using errcode = 'P0001';
end
$fn$;

create function public.kya_now()
returns timestamptz
language sql
volatile
set search_path = pg_catalog
as $fn$
  select clock_timestamp();
$fn$;

create function public.kya_hour_start()
returns timestamptz
language sql
volatile
set search_path = pg_catalog
as $fn$
  select date_trunc('hour', public.kya_now() at time zone 'UTC') at time zone 'UTC';
$fn$;

-- SHA-256 hex of the exact bearer or DNS value. UTF-8, lowercase hex.
-- Owned by the migration role so the body can call extensions.digest without
-- granting that schema to kya_writer. The body is fixed and does not read tables.
create function public.kya_sha256_hex(p_value text)
returns text
language plpgsql
immutable
strict
security definer
set search_path = pg_catalog
as $fn$
begin
  return encode(extensions.digest(convert_to(p_value, 'UTF8'), 'sha256'), 'hex');
end
$fn$;

-- Bounded CSPRNG wrapper. Same ownership reason as kya_sha256_hex.
-- Callers request 16 or 32 bytes. The cap is 64 so a programming error cannot
-- ask the extension for an unbounded string.
create function public.kya_random_bytes(p_count integer)
returns bytea
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
begin
  if p_count is null or p_count < 1 or p_count > 64 then
    raise exception 'kya_invalid' using errcode = 'P0001';
  end if;
  return extensions.gen_random_bytes(p_count);
end
$fn$;

-- Crockford Base32, lowercase, no padding characters. Leftover bits are
-- padded with zeros on the right. 16 bytes -> 26 characters. 32 bytes -> 52.
create function public.kya_encode_crockford(p_bytes bytea)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog
as $fn$
declare
  alphabet constant text := '0123456789abcdefghjkmnpqrstvwxyz';
  acc bigint := 0;
  bits integer := 0;
  i integer;
  byte_value integer;
  out text := '';
begin
  if octet_length(p_bytes) < 1 or octet_length(p_bytes) > 64 then
    raise exception 'kya_invalid' using errcode = 'P0001';
  end if;
  for i in 0..octet_length(p_bytes) - 1 loop
    byte_value := get_byte(p_bytes, i);
    acc := (acc << 8) | byte_value::bigint;
    bits := bits + 8;
    while bits >= 5 loop
      bits := bits - 5;
      out := out || substr(alphabet, (((acc >> bits) & 31)::integer) + 1, 1);
      acc := acc & ((1::bigint << bits) - 1);
    end loop;
  end loop;
  if bits > 0 then
    out := out || substr(alphabet, (((acc << (5 - bits)) & 31)::integer) + 1, 1);
  end if;
  return out;
end
$fn$;

create function public.kya_new_public_id()
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  body text;
begin
  body := public.kya_encode_crockford(public.kya_random_bytes(16));
  -- 128 bits encode to 25 full characters plus a final character that carries
  -- 3 data bits and 2 zero padding bits: 0, 4, 8, c, g, m, r, or w.
  if body !~ '^[0-9a-hjkmnp-tv-z]{25}[048cgmrw]$' then
    perform public.kya_fail('kya_unavailable');
  end if;
  return 'kya_' || body;
end
$fn$;

create function public.kya_auth_user_exists(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $fn$
  select exists (select 1 from auth.users where id = p_user_id);
$fn$;

create function public.kya_clean_text(p_value text, p_min integer, p_max integer)
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  cleaned text;
begin
  if p_value is null
     or p_value ~ '[[:cntrl:]]' then
    perform public.kya_fail('kya_invalid');
  end if;
  cleaned := btrim(p_value);
  if char_length(cleaned) < p_min or char_length(cleaned) > p_max then
    perform public.kya_fail('kya_invalid');
  end if;
  return cleaned;
end
$fn$;

create function public.kya_normalize_host(p_host text)
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  host text;
begin
  if p_host is null
     or char_length(p_host) > 254
     or p_host ~ '[[:cntrl:][:space:]]' then
    perform public.kya_fail('kya_invalid');
  end if;
  host := btrim(p_host);
  if host ~ '\.\.$' then
    perform public.kya_fail('kya_invalid');
  end if;
  if right(host, 1) = '.' then
    host := left(host, char_length(host) - 1);
  end if;
  host := lower(host);
  if char_length(host) < 1
     or char_length(host) > 253
     or host ~ ':'
     or host ~ '[^a-z0-9.-]'
     or host ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
     or host !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
     or host ~ '(^|\.)(local|localhost|internal|home|arpa)$' then
    perform public.kya_fail('kya_invalid');
  end if;
  return host;
end
$fn$;

-- Canonical https URL. p_required_host, when set, is an already normalized host
-- that the URL must use. Unicode IDNs are rejected; the Next.js server must
-- convert IDNA2008 to an A-label before calling.
create function public.kya_canonical_https(p_url text, p_required_host text)
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  body text;
  authority text;
  rest text;
  host text;
  port text;
  cut integer;
  slash_at integer;
  query_at integer;
begin
  if p_url is null
     or char_length(p_url) > 2048
     or p_url ~ '[[:cntrl:][:space:]\\#]' then
    perform public.kya_fail('kya_invalid');
  end if;
  if lower(left(btrim(p_url), 8)) <> 'https://' then
    perform public.kya_fail('kya_invalid');
  end if;
  body := substr(btrim(p_url), 9);
  slash_at := position('/' in body);
  query_at := position('?' in body);
  cut := char_length(body) + 1;
  if slash_at > 0 then
    cut := least(cut, slash_at);
  end if;
  if query_at > 0 then
    cut := least(cut, query_at);
  end if;
  authority := left(body, cut - 1);
  rest := substr(body, cut);
  if authority = '' or position('@' in authority) > 0 or authority ~ ':.*:' then
    perform public.kya_fail('kya_invalid');
  end if;
  if position(':' in authority) > 0 then
    host := split_part(authority, ':', 1);
    port := split_part(authority, ':', 2);
    if port <> '443' then
      perform public.kya_fail('kya_invalid');
    end if;
  else
    host := authority;
  end if;
  host := public.kya_normalize_host(host);
  if p_required_host is not null and host <> p_required_host then
    perform public.kya_fail('kya_invalid');
  end if;
  if rest <> '' and left(rest, 1) <> '/' and left(rest, 1) <> '?' then
    perform public.kya_fail('kya_invalid');
  end if;
  return 'https://' || host || rest;
end
$fn$;

create function public.kya_assert_capabilities(p_capabilities text[])
returns text[]
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
begin
  if p_capabilities is null
     or cardinality(p_capabilities) < 1
     or cardinality(p_capabilities) > 12
     or exists (
       select 1
       from unnest(p_capabilities) as item(value)
       where item.value is null
          or item.value not in (
            'search', 'summarize', 'scheduling', 'checkout', 'code-review', 'monitoring'
          )
     )
     or exists (
       select 1
       from unnest(p_capabilities) as item(value)
       group by item.value
       having count(*) > 1
     ) then
    perform public.kya_fail('kya_invalid');
  end if;
  return p_capabilities;
end
$fn$;

create function public.kya_assert_metadata_node(p_node jsonb, p_depth integer)
returns void
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  entry record;
  forbidden text[] := array[
    'token', 'management_token', 'managementtoken', 'authorization',
    'token_hash', 'secret', 'bearer', 'password', 'published_token',
    'publishedtoken', 'credential', 'management_token_hash'
  ];
begin
  if p_depth > 4 or p_node is null then
    perform public.kya_fail('kya_invalid');
  end if;
  if jsonb_typeof(p_node) = 'object' then
    for entry in select key, value from jsonb_each(p_node) loop
      if lower(entry.key) = any (forbidden) then
        perform public.kya_fail('kya_invalid');
      end if;
      perform public.kya_assert_metadata_node(entry.value, p_depth + 1);
    end loop;
  elsif jsonb_typeof(p_node) = 'array' then
    for entry in select value from jsonb_array_elements(p_node) as element(value) loop
      perform public.kya_assert_metadata_node(entry.value, p_depth + 1);
    end loop;
  elsif jsonb_typeof(p_node) = 'string' then
    if (p_node #>> '{}') ilike '%kya_mgmt_%'
       or (p_node #>> '{}') ilike '%kya_chal_%'
       or (p_node #>> '{}') ilike '%bearer %' then
      perform public.kya_fail('kya_invalid');
    end if;
  end if;
end
$fn$;

create function public.kya_assert_metadata(p_metadata jsonb)
returns void
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
begin
  if p_metadata is null
     or jsonb_typeof(p_metadata) <> 'object'
     or octet_length(p_metadata::text) > 2048 then
    perform public.kya_fail('kya_invalid');
  end if;
  perform public.kya_assert_metadata_node(p_metadata, 0);
end
$fn$;

create function public.kya_public_json(
  p_public_id text,
  p_name text,
  p_description text,
  p_category text,
  p_capabilities text[],
  p_endpoint_url text,
  p_claimed_host text,
  p_lifecycle text,
  p_domain_verification text,
  p_verification_expires_at timestamptz
) returns jsonb
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  effective text;
begin
  if p_lifecycle is distinct from 'active' then
    return jsonb_build_object(
      'publicId', p_public_id,
      'identityUrl', '/agents/' || p_public_id,
      'lifecycle', p_lifecycle,
      'registered', true
    );
  end if;
  effective := case
    when p_domain_verification = 'verified'
      and p_verification_expires_at is not null
      and p_verification_expires_at <= public.kya_now() then 'expired'
    when p_domain_verification = 'verified'
      and p_verification_expires_at is not null
      and p_verification_expires_at > public.kya_now() then 'verified'
    else p_domain_verification
  end;
  return jsonb_build_object(
    'publicId', p_public_id,
    'identityUrl', '/agents/' || p_public_id,
    'name', p_name,
    'description', p_description,
    'category', p_category,
    'capabilities', to_jsonb(p_capabilities),
    'endpointUrl', p_endpoint_url,
    'claimedHost', p_claimed_host,
    'lifecycle', p_lifecycle,
    'domainVerification', effective,
    'verificationExpiresAt', p_verification_expires_at,
    'registered', true
  );
end
$fn$;

create table public.rate_limit_policies (
  action text primary key,
  ip_hourly_limit integer,
  net_hourly_limit integer,
  global_hourly_limit integer,
  agent_hourly_limit integer,
  updated_at timestamptz not null default public.kya_now(),
  constraint rate_limit_policies_action_chk check (
    action in ('register', 'challenge_issue', 'challenge_complete')
  ),
  constraint rate_limit_policies_ip_chk check (ip_hourly_limit is null or ip_hourly_limit > 0),
  constraint rate_limit_policies_net_chk check (net_hourly_limit is null or net_hourly_limit > 0),
  constraint rate_limit_policies_global_chk check (global_hourly_limit is null or global_hourly_limit > 0),
  constraint rate_limit_policies_agent_chk check (agent_hourly_limit is null or agent_hourly_limit > 0)
);

-- Immutable wrapper so the generated search vector can include capabilities.
-- array_to_string is stable; generated columns require an immutable expression.
create function public.kya_capabilities_text(p_capabilities text[])
returns text
language sql
immutable
set search_path = pg_catalog
as $fn$
  select array_to_string(p_capabilities, ' ');
$fn$;

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  owner_user_id uuid references auth.users (id) on delete set null,
  name text not null,
  description text not null,
  endpoint_url text not null,
  claimed_host text not null,
  category text not null,
  capabilities text[] not null,
  agent_card_url text,
  lifecycle text not null default 'active',
  domain_verification text not null default 'unverified',
  verified_host text,
  verification_expires_at timestamptz,
  created_at timestamptz not null default public.kya_now(),
  updated_at timestamptz not null default public.kya_now(),
  revoked_at timestamptz,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', name), 'A')
    || setweight(to_tsvector('simple', description), 'B')
    || setweight(to_tsvector('simple', public.kya_capabilities_text(capabilities)), 'C')
  ) stored,
  constraint agents_public_id_key unique (public_id),
  constraint agents_public_id_chk check (public_id ~ '^kya_[0-9a-hjkmnp-tv-z]{25}[048cgmrw]$'),
  constraint agents_name_chk check (char_length(name) between 2 and 80),
  constraint agents_description_chk check (char_length(description) between 10 and 500),
  constraint agents_category_chk check (
    category in ('Research', 'Commerce', 'Operations', 'Developer tools')
  ),
  constraint agents_capabilities_chk check (
    cardinality(capabilities) between 1 and 12
    and capabilities <@ array['search', 'summarize', 'scheduling', 'checkout', 'code-review', 'monitoring']::text[]
  ),
  constraint agents_lifecycle_chk check (lifecycle in ('active', 'suspended', 'revoked')),
  constraint agents_domain_chk check (domain_verification in ('unverified', 'verified', 'expired')),
  constraint agents_verified_shape_chk check (
    (
      domain_verification = 'verified'
      and verified_host = claimed_host
      and verification_expires_at is not null
    )
    or (
      domain_verification in ('unverified', 'expired')
      and verified_host is null
      and verification_expires_at is null
    )
  ),
  constraint agents_revoked_chk check (
    (lifecycle = 'revoked' and revoked_at is not null and domain_verification <> 'verified')
    or (lifecycle <> 'revoked' and revoked_at is null)
  ),
  constraint agents_host_chk check (
    claimed_host ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    and claimed_host !~ '(^|\.)(local|localhost|internal|home|arpa)$'
    and claimed_host !~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
  ),
  constraint agents_endpoint_chk check (
    left(endpoint_url, char_length('https://' || claimed_host)) = 'https://' || claimed_host
    and (
      char_length(endpoint_url) = char_length('https://' || claimed_host)
      or substr(endpoint_url, char_length('https://' || claimed_host) + 1, 1) in ('/', '?')
    )
    and char_length(endpoint_url) <= 2048
  ),
  constraint agents_card_chk check (
    agent_card_url is null
    or (agent_card_url ~ '^https://' and char_length(agent_card_url) <= 2048)
  )
);

create index agents_owner_idx on public.agents (owner_user_id) where owner_user_id is not null;
create index agents_claimed_host_idx on public.agents (claimed_host);
create index agents_verified_created_idx on public.agents (created_at desc)
  where lifecycle = 'active' and domain_verification = 'verified';
create index agents_search_idx on public.agents using gin (search_vector);

create table public.agent_management_credentials (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete restrict,
  token_prefix text not null,
  token_hash text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default public.kya_now(),
  constraint agent_management_credentials_prefix_chk check (
    token_prefix ~ '^kya_mgmt_[0-9a-hjkmnp-tv-z]{8}$'
  ),
  constraint agent_management_credentials_hash_chk check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint agent_management_credentials_hash_key unique (token_hash)
);

create unique index agent_management_credentials_one_active
  on public.agent_management_credentials (agent_id)
  where revoked_at is null;
create index agent_management_credentials_agent_idx
  on public.agent_management_credentials (agent_id, created_at desc);

create table public.verification_challenges (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete restrict,
  method text not null,
  token_hash text not null,
  host text not null,
  status text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default public.kya_now(),
  constraint verification_challenges_method_chk check (method in ('dns_txt', 'http_well_known')),
  constraint verification_challenges_status_chk check (
    status in ('pending', 'passed', 'failed', 'expired')
  ),
  constraint verification_challenges_hash_chk check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint verification_challenges_window_chk check (
    expires_at = created_at + interval '15 minutes'
  ),
  constraint verification_challenges_consumed_chk check (
    status <> 'passed' or consumed_at is not null
  ),
  constraint verification_challenges_host_chk check (
    host ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  )
);

create unique index verification_challenges_one_pending
  on public.verification_challenges (agent_id)
  where status = 'pending';
create index verification_challenges_agent_idx
  on public.verification_challenges (agent_id, created_at desc);

create table public.verification_evidence (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete restrict,
  challenge_id uuid not null unique references public.verification_challenges (id) on delete restrict,
  method text not null,
  host text not null,
  result text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default public.kya_now(),
  constraint verification_evidence_method_chk check (method in ('dns_txt', 'http_well_known')),
  constraint verification_evidence_result_chk check (
    (result = 'passed' and expires_at is not null)
    or (result = 'failed' and expires_at is null)
  ),
  constraint verification_evidence_revoke_chk check (
    revoked_at is null or result = 'passed'
  )
);

create index verification_evidence_agent_idx
  on public.verification_evidence (agent_id, created_at desc);

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete restrict,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default public.kya_now(),
  constraint agent_events_type_chk check (
    event_type in (
      'created', 'updated', 'challenge_issued', 'verification_passed',
      'verification_failed', 'verification_expired', 'verification_revoked',
      'suspended', 'reinstated', 'revoked', 'credential_rotated',
      'credential_revoked', 'owner_associated'
    )
  ),
  constraint agent_events_metadata_chk check (jsonb_typeof(metadata) = 'object')
);

create index agent_events_agent_idx on public.agent_events (agent_id, created_at desc);

create table public.request_windows (
  subject text not null,
  action text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (subject, action, window_start),
  constraint request_windows_hits_chk check (hits > 0),
  constraint request_windows_action_chk check (
    action in ('register', 'challenge_issue', 'challenge_complete')
  ),
  constraint request_windows_subject_chk check (
    subject = 'global'
    or subject ~ '^ip:[0-9a-f]{64}$'
    or subject ~ '^net:[0-9a-f]{64}$'
    or subject ~ '^agent:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

create index request_windows_window_idx on public.request_windows (window_start);

-- Present so a later inspector migration does not reshape identity tables.
-- Writes are rejected until that migration replaces the guard trigger.
-- Nothing in verification reads this table.
create table public.inspector_reports (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete restrict,
  summary text not null,
  created_at timestamptz not null default public.kya_now(),
  constraint inspector_reports_summary_chk check (
    char_length(summary) between 1 and 2000
  )
);

-- Transaction-local mark set by the identity functions before they write.
-- supautils prevents SET ROLE kya_writer, so current_user inside those
-- functions is the migration role. The mark is what the triggers recognize.
create function public.kya_begin_write()
returns void
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
begin
  perform set_config('kya.function_write', '1', true);
end
$fn$;

create function public.kya_allow_write()
returns boolean
language sql
stable
set search_path = pg_catalog
as $fn$
  select coalesce(
    current_user = 'kya_writer'
    or current_setting('kya.function_write', true) = '1',
    false
  );
$fn$;

create function public.kya_trg_writer_only()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if not public.kya_allow_write() then
    perform public.kya_fail('kya_forbidden');
  end if;
  return new;
end
$fn$;

create function public.kya_trg_forbid_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  perform public.kya_fail('kya_immutable');
  return old;
end
$fn$;

create function public.kya_trg_agents()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if not public.kya_allow_write() then
    if tg_op = 'INSERT' then
      perform public.kya_fail('kya_forbidden');
    end if;
    if new.owner_user_id is distinct from old.owner_user_id then
      if old.owner_user_id is null or new.owner_user_id is not null then
        perform public.kya_fail('kya_immutable');
      end if;
    end if;
    if new.name is distinct from old.name
       or new.description is distinct from old.description
       or new.endpoint_url is distinct from old.endpoint_url
       or new.claimed_host is distinct from old.claimed_host
       or new.category is distinct from old.category
       or new.capabilities is distinct from old.capabilities
       or new.agent_card_url is distinct from old.agent_card_url
       or new.lifecycle is distinct from old.lifecycle
       or new.revoked_at is distinct from old.revoked_at
       or new.domain_verification is distinct from old.domain_verification
       or new.verified_host is distinct from old.verified_host
       or new.verification_expires_at is distinct from old.verification_expires_at then
      perform public.kya_fail('kya_immutable');
    end if;
  end if;
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.public_id is distinct from old.public_id
       or new.created_at is distinct from old.created_at then
      perform public.kya_fail('kya_immutable');
    end if;
    new.updated_at := public.kya_now();
  end if;
  if exists (
    select 1
    from unnest(new.capabilities) as item(value)
    group by item.value
    having count(*) > 1
  ) then
    perform public.kya_fail('kya_invalid');
  end if;
  return new;
end
$fn$;

create function public.kya_trg_credentials()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if tg_op = 'INSERT' then
    if not public.kya_allow_write() then
      perform public.kya_fail('kya_forbidden');
    end if;
    return new;
  end if;
  if new.id is distinct from old.id
     or new.agent_id is distinct from old.agent_id
     or new.token_prefix is distinct from old.token_prefix
     or new.token_hash is distinct from old.token_hash
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    perform public.kya_fail('kya_immutable');
  end if;
  if new.revoked_at is distinct from old.revoked_at then
    if not public.kya_allow_write()
       or old.revoked_at is not null
       or new.revoked_at is null then
      perform public.kya_fail('kya_immutable');
    end if;
  end if;
  if new.last_used_at is distinct from old.last_used_at
     and not public.kya_allow_write() then
    perform public.kya_fail('kya_immutable');
  end if;
  return new;
end
$fn$;

create function public.kya_trg_challenges()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if tg_op = 'INSERT' then
    if not public.kya_allow_write() then
      perform public.kya_fail('kya_forbidden');
    end if;
    return new;
  end if;
  if new.id is distinct from old.id
     or new.agent_id is distinct from old.agent_id
     or new.method is distinct from old.method
     or new.token_hash is distinct from old.token_hash
     or new.host is distinct from old.host
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    perform public.kya_fail('kya_immutable');
  end if;
  if new.status is distinct from old.status then
    if not public.kya_allow_write()
       or old.status <> 'pending'
       or new.status not in ('passed', 'failed', 'expired') then
      perform public.kya_fail('kya_immutable');
    end if;
  end if;
  if new.consumed_at is distinct from old.consumed_at then
    if not public.kya_allow_write()
       or old.consumed_at is not null then
      perform public.kya_fail('kya_immutable');
    end if;
  end if;
  return new;
end
$fn$;

create function public.kya_trg_evidence()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if tg_op = 'INSERT' then
    if not public.kya_allow_write() then
      perform public.kya_fail('kya_forbidden');
    end if;
    return new;
  end if;
  if new.id is distinct from old.id
     or new.agent_id is distinct from old.agent_id
     or new.challenge_id is distinct from old.challenge_id
     or new.method is distinct from old.method
     or new.host is distinct from old.host
     or new.result is distinct from old.result
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    perform public.kya_fail('kya_immutable');
  end if;
  if new.revoked_at is distinct from old.revoked_at then
    if not public.kya_allow_write()
       or old.revoked_at is not null
       or new.revoked_at is null then
      perform public.kya_fail('kya_immutable');
    end if;
  end if;
  return new;
end
$fn$;

create function public.kya_trg_events()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if not public.kya_allow_write() then
    perform public.kya_fail('kya_forbidden');
  end if;
  perform public.kya_assert_metadata(new.metadata);
  return new;
end
$fn$;

create function public.kya_trg_request_windows()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if not public.kya_allow_write() then
    perform public.kya_fail('kya_forbidden');
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$fn$;

create function public.kya_trg_inspector_locked()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  perform public.kya_fail('kya_inspector_deferred');
  return null;
end
$fn$;

create trigger agents_guard
  before insert or update on public.agents
  for each row execute function public.kya_trg_agents();
create trigger agents_no_delete
  before delete on public.agents
  for each row execute function public.kya_trg_forbid_delete();

create trigger credentials_guard
  before insert or update on public.agent_management_credentials
  for each row execute function public.kya_trg_credentials();
create trigger credentials_no_delete
  before delete on public.agent_management_credentials
  for each row execute function public.kya_trg_forbid_delete();

create trigger challenges_guard
  before insert or update on public.verification_challenges
  for each row execute function public.kya_trg_challenges();
create trigger challenges_no_delete
  before delete on public.verification_challenges
  for each row execute function public.kya_trg_forbid_delete();

create trigger evidence_guard
  before insert or update on public.verification_evidence
  for each row execute function public.kya_trg_evidence();
create trigger evidence_no_delete
  before delete on public.verification_evidence
  for each row execute function public.kya_trg_forbid_delete();

create trigger events_guard
  before insert on public.agent_events
  for each row execute function public.kya_trg_events();
create trigger events_no_update
  before update on public.agent_events
  for each row execute function public.kya_trg_forbid_delete();
create trigger events_no_delete
  before delete on public.agent_events
  for each row execute function public.kya_trg_forbid_delete();

create trigger request_windows_guard
  before insert or update or delete on public.request_windows
  for each row execute function public.kya_trg_request_windows();

create trigger inspector_reports_locked
  before insert or update or delete on public.inspector_reports
  for each row execute function public.kya_trg_inspector_locked();

create function public.kya_consume_limit(
  p_subject text,
  p_action text,
  p_limit integer
) returns void
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  v_hits integer;
begin
  perform public.kya_begin_write();
  if p_limit is null or p_limit < 1 then
    perform public.kya_fail('kya_unavailable');
  end if;
  if p_action not in ('register', 'challenge_issue', 'challenge_complete') then
    perform public.kya_fail('kya_invalid');
  end if;
  if p_subject is distinct from 'global'
     and p_subject !~ '^ip:[0-9a-f]{64}$'
     and p_subject !~ '^net:[0-9a-f]{64}$'
     and p_subject !~ '^agent:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform public.kya_fail('kya_invalid');
  end if;

  insert into public.request_windows (subject, action, window_start, hits)
  values (p_subject, p_action, public.kya_hour_start(), 1)
  on conflict (subject, action, window_start)
  do update set hits = public.request_windows.hits + 1
  where public.request_windows.hits < p_limit
  returning hits into v_hits;

  if v_hits is null then
    perform public.kya_fail('kya_rate_limited');
  end if;
end
$fn$;

create function public.kya_record_event(
  p_agent_id uuid,
  p_event_type text,
  p_metadata jsonb,
  p_actor_user_id uuid
) returns void
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  actor uuid;
begin
  perform public.kya_begin_write();
  actor := p_actor_user_id;
  if actor is not null and not public.kya_auth_user_exists(actor) then
    actor := null;
  end if;
  insert into public.agent_events (agent_id, event_type, metadata, actor_user_id)
  values (p_agent_id, p_event_type, coalesce(p_metadata, '{}'::jsonb), actor);
end
$fn$;

-- Hashes p_presented_token. Does not accept a precomputed hash.
-- bearer_or_owner: a presented token must itself be valid; owner is used only
-- when the token is absent. bearer_and_user: valid token and an existing user.
create function public.kya_require_manager(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid,
  p_mode text
) returns uuid
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_owner uuid;
  v_lifecycle text;
  v_token_present boolean;
  v_cred_id uuid;
  v_cred_agent uuid;
  v_revoked timestamptz;
  v_expires timestamptz;
  v_token_ok boolean := false;
begin
  perform public.kya_begin_write();
  if p_mode not in ('bearer_or_owner', 'bearer_and_user') then
    perform public.kya_fail('kya_invalid');
  end if;
  if p_public_id is null or p_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$' then
    perform public.kya_fail('kya_not_found');
  end if;

  select id, owner_user_id, lifecycle
  into v_id, v_owner, v_lifecycle
  from public.agents
  where public_id = p_public_id
  for update;

  if not found then
    perform public.kya_fail('kya_not_found');
  end if;
  if v_lifecycle = 'revoked' then
    perform public.kya_fail('kya_forbidden');
  end if;

  v_token_present := p_presented_token is not null and btrim(p_presented_token) <> '';
  if v_token_present then
    if char_length(p_presented_token) > 200 then
      perform public.kya_fail('kya_invalid');
    end if;
    select id, agent_id, revoked_at, expires_at
    into v_cred_id, v_cred_agent, v_revoked, v_expires
    from public.agent_management_credentials
    where token_hash = public.kya_sha256_hex(p_presented_token)
    for update;

    if not found then
      perform public.kya_fail('kya_unauthorized');
    end if;
    if v_cred_agent is distinct from v_id then
      perform public.kya_fail('kya_forbidden');
    end if;
    if v_revoked is not null
       or (v_expires is not null and v_expires <= public.kya_now()) then
      perform public.kya_fail('kya_unauthorized');
    end if;
    v_token_ok := true;
    update public.agent_management_credentials
    set last_used_at = public.kya_now()
    where id = v_cred_id;
  end if;

  if p_mode = 'bearer_and_user' then
    if not v_token_ok
       or p_actor_user_id is null
       or not public.kya_auth_user_exists(p_actor_user_id) then
      perform public.kya_fail('kya_unauthorized');
    end if;
    return v_id;
  end if;

  if v_token_ok then
    return v_id;
  end if;

  if p_actor_user_id is not null
     and v_owner is not null
     and p_actor_user_id = v_owner
     and public.kya_auth_user_exists(p_actor_user_id) then
    return v_id;
  end if;

  perform public.kya_fail('kya_unauthorized');
  return v_id;
end
$fn$;

create function public.kya_transition_lifecycle(
  p_agent_id uuid,
  p_action text,
  p_actor_user_id uuid,
  p_metadata jsonb
) returns void
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
declare
  v_lifecycle text;
  v_now timestamptz;
  v_updated integer;
begin
  perform public.kya_begin_write();
  if p_action not in ('suspend', 'reinstate', 'revoke') then
    perform public.kya_fail('kya_invalid');
  end if;
  perform public.kya_assert_metadata(p_metadata);
  select lifecycle into v_lifecycle
  from public.agents
  where id = p_agent_id
  for update;
  v_now := public.kya_now();

  if p_action = 'suspend' then
    update public.agents
    set lifecycle = 'suspended'
    where id = p_agent_id and lifecycle = 'active';
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      perform public.kya_fail('kya_conflict');
    end if;
    perform public.kya_record_event(p_agent_id, 'suspended', p_metadata, p_actor_user_id);
    return;
  end if;

  if p_action = 'reinstate' then
    update public.agents
    set lifecycle = 'active'
    where id = p_agent_id and lifecycle = 'suspended';
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      perform public.kya_fail('kya_conflict');
    end if;
    perform public.kya_record_event(p_agent_id, 'reinstated', p_metadata, p_actor_user_id);
    return;
  end if;

  update public.agents
  set lifecycle = 'revoked',
      revoked_at = v_now,
      domain_verification = 'unverified',
      verified_host = null,
      verification_expires_at = null
  where id = p_agent_id and lifecycle in ('active', 'suspended');
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    perform public.kya_fail('kya_conflict');
  end if;
  update public.verification_evidence
  set revoked_at = v_now
  where agent_id = p_agent_id and result = 'passed' and revoked_at is null;
  update public.verification_challenges
  set status = 'expired'
  where agent_id = p_agent_id and status = 'pending';
  update public.agent_management_credentials
  set revoked_at = v_now
  where agent_id = p_agent_id and revoked_at is null;
  perform public.kya_record_event(p_agent_id, 'revoked', p_metadata, p_actor_user_id);
end
$fn$;

create function public.lookup_public_agent(p_public_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_name text;
  v_description text;
  v_category text;
  v_capabilities text[];
  v_endpoint text;
  v_host text;
  v_lifecycle text;
  v_domain text;
  v_expires timestamptz;
begin
  if p_public_id is null
     or char_length(p_public_id) > 40
     or p_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$' then
    return null;
  end if;
  select name, description, category, capabilities, endpoint_url, claimed_host,
         lifecycle, domain_verification, verification_expires_at
  into v_name, v_description, v_category, v_capabilities, v_endpoint, v_host,
       v_lifecycle, v_domain, v_expires
  from public.agents
  where public_id = p_public_id;
  if not found then
    return null;
  end if;
  return public.kya_public_json(
    p_public_id, v_name, v_description, v_category, v_capabilities,
    v_endpoint, v_host, v_lifecycle, v_domain, v_expires
  );
end
$fn$;

create function public.search_public_agents(
  p_query text,
  p_category text,
  p_cursor timestamptz,
  p_limit integer
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_limit integer;
  v_category text;
  v_tsquery tsquery;
  v_agents jsonb;
  v_count integer;
  v_oldest timestamptz;
begin
  if p_limit is null then
    v_limit := 20;
  elsif p_limit < 1 or p_limit > 50 then
    perform public.kya_fail('kya_invalid');
  else
    v_limit := p_limit;
  end if;

  if p_category is null or btrim(p_category) = '' then
    v_category := null;
  elsif p_category not in ('Research', 'Commerce', 'Operations', 'Developer tools') then
    perform public.kya_fail('kya_invalid');
  else
    v_category := p_category;
  end if;

  v_tsquery := null;
  if p_query is not null and btrim(p_query) <> '' then
    if char_length(p_query) > 200 then
      perform public.kya_fail('kya_invalid');
    end if;
    if numnode(plainto_tsquery('simple', p_query)) > 0 then
      v_tsquery := plainto_tsquery('simple', p_query);
    end if;
  end if;

  select coalesce(jsonb_agg(page.proj order by page.created_at desc), '[]'::jsonb),
         count(*),
         min(page.created_at)
  into v_agents, v_count, v_oldest
  from (
    select created_at,
           public.kya_public_json(
             public_id, name, description, category, capabilities,
             endpoint_url, claimed_host, lifecycle, domain_verification,
             verification_expires_at
           ) as proj
    from public.agents
    where lifecycle = 'active'
      and domain_verification = 'verified'
      and verification_expires_at > public.kya_now()
      and (p_cursor is null or created_at < p_cursor)
      and (v_category is null or category = v_category)
      and (v_tsquery is null or search_vector @@ v_tsquery)
    order by created_at desc
    limit v_limit
  ) as page;

  return jsonb_build_object(
    'agents', v_agents,
    'nextCursor', case when v_count = v_limit then v_oldest else null end
  );
end
$fn$;

-- p_owner_user_id must be null or the id of the verified Supabase session.
-- The JSON body is not a source for that value. The token is generated here.
create function public.register_agent(
  p_name text,
  p_description text,
  p_endpoint_url text,
  p_claimed_host text,
  p_category text,
  p_capabilities text[],
  p_agent_card_url text,
  p_owner_user_id uuid,
  p_ip_subject text,
  p_net_subject text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_name text;
  v_description text;
  v_host text;
  v_endpoint text;
  v_card text;
  v_capabilities text[];
  v_ip_limit integer;
  v_net_limit integer;
  v_global_limit integer;
  v_public_id text;
  v_agent_id uuid;
  v_attempt integer;
  v_token text;
  v_prefix text;
  v_hash text;
  v_constraint text;
begin
  perform public.kya_begin_write();
  if coalesce(octet_length(p_name), 0)
     + coalesce(octet_length(p_description), 0)
     + coalesce(octet_length(p_endpoint_url), 0)
     + coalesce(octet_length(p_claimed_host), 0)
     + coalesce(octet_length(p_category), 0)
     + coalesce(octet_length(p_agent_card_url), 0)
     + coalesce(octet_length(array_to_string(p_capabilities, ',')), 0) > 8000 then
    perform public.kya_fail('kya_invalid');
  end if;

  v_name := public.kya_clean_text(p_name, 2, 80);
  v_description := public.kya_clean_text(p_description, 10, 500);
  if p_category not in ('Research', 'Commerce', 'Operations', 'Developer tools') then
    perform public.kya_fail('kya_invalid');
  end if;
  v_capabilities := public.kya_assert_capabilities(p_capabilities);
  v_host := public.kya_normalize_host(p_claimed_host);
  v_endpoint := public.kya_canonical_https(p_endpoint_url, v_host);
  if p_agent_card_url is null or btrim(p_agent_card_url) = '' then
    v_card := null;
  else
    v_card := public.kya_canonical_https(p_agent_card_url, null);
  end if;
  if p_owner_user_id is not null and not public.kya_auth_user_exists(p_owner_user_id) then
    perform public.kya_fail('kya_invalid');
  end if;
  if p_ip_subject !~ '^ip:[0-9a-f]{64}$' or p_net_subject !~ '^net:[0-9a-f]{64}$' then
    perform public.kya_fail('kya_invalid');
  end if;

  select ip_hourly_limit, net_hourly_limit, global_hourly_limit
  into v_ip_limit, v_net_limit, v_global_limit
  from public.rate_limit_policies
  where action = 'register'
  for share;
  if not found or v_ip_limit is null or v_net_limit is null or v_global_limit is null then
    perform public.kya_fail('kya_unavailable');
  end if;

  -- Lock order is always global, then network, then address.
  perform public.kya_consume_limit('global', 'register', v_global_limit);
  perform public.kya_consume_limit(p_net_subject, 'register', v_net_limit);
  perform public.kya_consume_limit(p_ip_subject, 'register', v_ip_limit);

  for v_attempt in 1..3 loop
    v_public_id := public.kya_new_public_id();
    begin
      insert into public.agents (
        public_id, owner_user_id, name, description, endpoint_url, claimed_host,
        category, capabilities, agent_card_url, lifecycle, domain_verification
      ) values (
        v_public_id, p_owner_user_id, v_name, v_description, v_endpoint, v_host,
        p_category, v_capabilities, v_card, 'active', 'unverified'
      )
      returning id into v_agent_id;
      exit;
    exception
      when unique_violation then
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint is distinct from 'agents_public_id_key' or v_attempt = 3 then
          if v_constraint is distinct from 'agents_public_id_key' then
            raise;
          end if;
          perform public.kya_fail('kya_collision');
        end if;
    end;
  end loop;

  v_token := 'kya_mgmt_' || public.kya_encode_crockford(public.kya_random_bytes(32));
  v_prefix := left(v_token, 17);
  v_hash := public.kya_sha256_hex(v_token);
  insert into public.agent_management_credentials (agent_id, token_prefix, token_hash)
  values (v_agent_id, v_prefix, v_hash);
  perform public.kya_record_event(v_agent_id, 'created', '{}'::jsonb, p_owner_user_id);

  return public.lookup_public_agent(v_public_id) || jsonb_build_object(
    'managementToken', v_token,
    'credentialPrefix', v_prefix
  );
end
$fn$;

create function public.update_agent_metadata(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid,
  p_name text,
  p_description text,
  p_endpoint_url text,
  p_claimed_host text,
  p_category text,
  p_capabilities text[],
  p_agent_card_url text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_name text;
  v_description text;
  v_host text;
  v_endpoint text;
  v_card text;
  v_capabilities text[];
  v_old_host text;
  v_was_verified boolean;
  v_actor uuid;
  v_now timestamptz;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, p_actor_user_id, 'bearer_or_owner');
  v_name := public.kya_clean_text(p_name, 2, 80);
  v_description := public.kya_clean_text(p_description, 10, 500);
  if p_category not in ('Research', 'Commerce', 'Operations', 'Developer tools') then
    perform public.kya_fail('kya_invalid');
  end if;
  v_capabilities := public.kya_assert_capabilities(p_capabilities);
  v_host := public.kya_normalize_host(p_claimed_host);
  v_endpoint := public.kya_canonical_https(p_endpoint_url, v_host);
  if p_agent_card_url is null or btrim(p_agent_card_url) = '' then
    v_card := null;
  else
    v_card := public.kya_canonical_https(p_agent_card_url, null);
  end if;

  select claimed_host, domain_verification = 'verified'
  into v_old_host, v_was_verified
  from public.agents
  where id = v_id;
  select owner_user_id into v_actor from public.agents where id = v_id;
  if p_actor_user_id is distinct from v_actor then
    v_actor := null;
  end if;
  v_now := public.kya_now();

  update public.agents
  set name = v_name,
      description = v_description,
      endpoint_url = v_endpoint,
      claimed_host = v_host,
      category = p_category,
      capabilities = v_capabilities,
      agent_card_url = v_card,
      domain_verification = case
        when claimed_host is distinct from v_host then 'unverified'
        else domain_verification
      end,
      verified_host = case
        when claimed_host is distinct from v_host then null
        else verified_host
      end,
      verification_expires_at = case
        when claimed_host is distinct from v_host then null
        else verification_expires_at
      end
  where id = v_id;

  if v_old_host is distinct from v_host then
    update public.verification_evidence
    set revoked_at = v_now
    where agent_id = v_id and result = 'passed' and revoked_at is null;
    update public.verification_challenges
    set status = 'expired'
    where agent_id = v_id and status = 'pending';
    if v_was_verified then
      perform public.kya_record_event(v_id, 'verification_revoked', '{}'::jsonb, v_actor);
    end if;
  end if;
  perform public.kya_record_event(v_id, 'updated', '{}'::jsonb, v_actor);
  return public.lookup_public_agent(p_public_id);
end
$fn$;

create function public.issue_dns_challenge(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid,
  p_method text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_lifecycle text;
  v_host text;
  v_owner uuid;
  v_actor uuid;
  v_limit integer;
  v_now timestamptz;
  v_token text;
  v_challenge_id uuid;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, p_actor_user_id, 'bearer_or_owner');
  if p_method is distinct from 'dns_txt' then
    perform public.kya_fail('kya_not_implemented');
  end if;
  select lifecycle, claimed_host, owner_user_id
  into v_lifecycle, v_host, v_owner
  from public.agents
  where id = v_id;
  if v_lifecycle <> 'active' then
    perform public.kya_fail('kya_forbidden');
  end if;
  v_actor := case when p_actor_user_id = v_owner then v_owner else null end;

  select agent_hourly_limit into v_limit
  from public.rate_limit_policies
  where action = 'challenge_issue'
  for share;
  if not found or v_limit is null then
    perform public.kya_fail('kya_unavailable');
  end if;
  perform public.kya_consume_limit('agent:' || v_id::text, 'challenge_issue', v_limit);

  v_now := public.kya_now();
  update public.verification_challenges
  set status = 'expired'
  where agent_id = v_id and status = 'pending';

  v_token := 'kya_chal_' || public.kya_encode_crockford(public.kya_random_bytes(16));
  insert into public.verification_challenges (
    agent_id, method, token_hash, host, status, created_at, expires_at
  ) values (
    v_id, 'dns_txt', public.kya_sha256_hex(v_token), v_host, 'pending',
    v_now, v_now + interval '15 minutes'
  )
  returning id into v_challenge_id;

  perform public.kya_record_event(
    v_id,
    'challenge_issued',
    jsonb_build_object('challengeId', v_challenge_id, 'method', 'dns_txt'),
    v_actor
  );

  return jsonb_build_object(
    'challengeId', v_challenge_id,
    'method', 'dns_txt',
    'txtName', '_kya-challenge.' || v_host,
    'publishedToken', v_token,
    'expiresAt', v_now + interval '15 minutes',
    'instructions',
    'Publish a DNS TXT record at txtName whose value is publishedToken. '
    || 'The challenge expires in 15 minutes. '
    || 'Domain verification is not legal KYC, a safety certification, or proof of agent runtime authenticity.'
  );
end
$fn$;

-- The Next.js server must resolve _kya-challenge.<host> and pass only answers
-- for that exact name. This function compares hashes and consumes the row.
-- It does not query DNS. Mismatch, expiry, reuse, and an unknown challenge id
-- return an error object after the attempt counter is updated, so the caller
-- must commit that result instead of rolling the transaction back.
-- Authorization and rate-limit failures still raise and roll back.
create function public.complete_dns_challenge(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid,
  p_challenge_id uuid,
  p_observed_txt_values text[]
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_lifecycle text;
  v_claimed text;
  v_owner uuid;
  v_actor uuid;
  v_limit integer;
  v_hashes text[];
  v_now timestamptz;
  v_challenge uuid;
  v_host text;
  v_method text;
  v_status text;
  v_expires timestamptz;
  v_consumed timestamptz;
  v_row_host text;
  v_row_method text;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, p_actor_user_id, 'bearer_or_owner');
  select lifecycle, claimed_host, owner_user_id
  into v_lifecycle, v_claimed, v_owner
  from public.agents
  where id = v_id;
  if v_lifecycle <> 'active' then
    perform public.kya_fail('kya_forbidden');
  end if;
  if p_challenge_id is null
     or p_observed_txt_values is null
     or cardinality(p_observed_txt_values) < 1
     or cardinality(p_observed_txt_values) > 20
     or exists (
       select 1
       from unnest(p_observed_txt_values) as item(value)
       where item.value is null
          or char_length(item.value) < 1
          or char_length(item.value) > 512
     ) then
    perform public.kya_fail('kya_invalid');
  end if;

  select agent_hourly_limit into v_limit
  from public.rate_limit_policies
  where action = 'challenge_complete'
  for share;
  if not found or v_limit is null then
    perform public.kya_fail('kya_unavailable');
  end if;
  perform public.kya_consume_limit('agent:' || v_id::text, 'challenge_complete', v_limit);

  select coalesce(array_agg(public.kya_sha256_hex(item.value)), array[]::text[])
  into v_hashes
  from unnest(p_observed_txt_values) as item(value);
  v_now := public.kya_now();
  v_actor := case when p_actor_user_id = v_owner then v_owner else null end;

  update public.verification_challenges as challenge
  set status = 'passed',
      consumed_at = v_now
  where challenge.id = p_challenge_id
    and challenge.agent_id = v_id
    and challenge.status = 'pending'
    and challenge.expires_at > v_now
    and challenge.consumed_at is null
    and challenge.host = v_claimed
    and challenge.method = 'dns_txt'
    and challenge.token_hash = any (v_hashes)
  returning challenge.id, challenge.host, challenge.method
  into v_challenge, v_host, v_method;

  if v_challenge is not null then
    update public.verification_evidence
    set revoked_at = v_now
    where agent_id = v_id and result = 'passed' and revoked_at is null;
    insert into public.verification_evidence (
      agent_id, challenge_id, method, host, result, expires_at, created_at
    ) values (
      v_id, v_challenge, v_method, v_host, 'passed',
      v_now + interval '90 days', v_now
    );
    update public.agents
    set domain_verification = 'verified',
        verified_host = v_host,
        verification_expires_at = v_now + interval '90 days'
    where id = v_id;
    perform public.kya_record_event(
      v_id,
      'verification_passed',
      jsonb_build_object('challengeId', v_challenge, 'host', v_host),
      v_actor
    );
    return public.lookup_public_agent(p_public_id);
  end if;

  select status, expires_at, consumed_at, host, method
  into v_status, v_expires, v_consumed, v_row_host, v_row_method
  from public.verification_challenges
  where id = p_challenge_id and agent_id = v_id
  for update;

  if not found then
    -- Return, do not raise. A raise would roll back the attempt counted above.
    return jsonb_build_object('error', 'kya_not_found');
  end if;
  if v_status = 'passed' or v_consumed is not null then
    return jsonb_build_object('error', 'kya_challenge_consumed');
  end if;
  if v_status = 'expired' or v_expires <= v_now then
    if v_status = 'pending' then
      update public.verification_challenges
      set status = 'expired'
      where id = p_challenge_id and status = 'pending';
    end if;
    perform public.kya_record_event(
      v_id,
      'verification_expired',
      jsonb_build_object('challengeId', p_challenge_id),
      v_actor
    );
    return jsonb_build_object('error', 'kya_challenge_expired');
  end if;
  if v_row_host is distinct from v_claimed or v_row_method is distinct from 'dns_txt' then
    if v_status = 'pending' then
      update public.verification_challenges
      set status = 'expired'
      where id = p_challenge_id and status = 'pending';
    end if;
    return jsonb_build_object('error', 'kya_challenge_rejected');
  end if;
  return jsonb_build_object('error', 'kya_challenge_mismatch');
end
$fn$;

create function public.rotate_management_credential(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_owner uuid;
  v_actor uuid;
  v_now timestamptz;
  v_token text;
  v_prefix text;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, p_actor_user_id, 'bearer_or_owner');
  select owner_user_id into v_owner from public.agents where id = v_id;
  v_actor := case when p_actor_user_id = v_owner then v_owner else null end;
  v_now := public.kya_now();
  update public.agent_management_credentials
  set revoked_at = v_now
  where agent_id = v_id and revoked_at is null;
  v_token := 'kya_mgmt_' || public.kya_encode_crockford(public.kya_random_bytes(32));
  v_prefix := left(v_token, 17);
  insert into public.agent_management_credentials (agent_id, token_prefix, token_hash)
  values (v_id, v_prefix, public.kya_sha256_hex(v_token));
  perform public.kya_record_event(v_id, 'credential_rotated', '{}'::jsonb, v_actor);
  return jsonb_build_object(
    'publicId', p_public_id,
    'credentialPrefix', v_prefix,
    'managementToken', v_token
  );
end
$fn$;

create function public.revoke_management_credential(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_owner uuid;
  v_actor uuid;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, p_actor_user_id, 'bearer_or_owner');
  select owner_user_id into v_owner from public.agents where id = v_id;
  v_actor := case when p_actor_user_id = v_owner then v_owner else null end;
  update public.agent_management_credentials
  set revoked_at = public.kya_now()
  where agent_id = v_id and revoked_at is null;
  perform public.kya_record_event(v_id, 'credential_revoked', '{}'::jsonb, v_actor);
  return jsonb_build_object(
    'publicId', p_public_id,
    'credentialRevoked', true
  );
end
$fn$;

create function public.associate_agent_owner(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_owner uuid;
  v_updated integer;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, p_actor_user_id, 'bearer_and_user');
  select owner_user_id into v_owner from public.agents where id = v_id;
  if v_owner is null then
    update public.agents
    set owner_user_id = p_actor_user_id
    where id = v_id and owner_user_id is null;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      perform public.kya_fail('kya_conflict');
    end if;
    perform public.kya_record_event(v_id, 'owner_associated', '{}'::jsonb, p_actor_user_id);
  elsif v_owner is distinct from p_actor_user_id then
    perform public.kya_fail('kya_conflict');
  end if;
  return jsonb_build_object(
    'publicId', p_public_id,
    'ownerAssociated', true
  );
end
$fn$;

create function public.set_lifecycle(
  p_public_id text,
  p_presented_token text,
  p_actor_user_id uuid,
  p_action text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_owner uuid;
  v_actor uuid;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, p_actor_user_id, 'bearer_or_owner');
  select owner_user_id into v_owner from public.agents where id = v_id;
  v_actor := case when p_actor_user_id = v_owner then v_owner else null end;
  perform public.kya_transition_lifecycle(v_id, p_action, v_actor, '{}'::jsonb);
  return public.lookup_public_agent(p_public_id);
end
$fn$;

-- Service-role operator path for an abandoned identity. Not a public route.
-- There is no unauthenticated recovery: this does not mint a credential.
create function public.operator_set_lifecycle(
  p_public_id text,
  p_action text,
  p_reason text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_reason text;
begin
  if p_public_id is null or p_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$' then
    perform public.kya_fail('kya_not_found');
  end if;
  v_reason := public.kya_clean_text(p_reason, 3, 200);
  select id into v_id
  from public.agents
  where public_id = p_public_id
  for update;
  if not found then
    perform public.kya_fail('kya_not_found');
  end if;
  perform public.kya_transition_lifecycle(
    v_id,
    p_action,
    null,
    jsonb_build_object('source', 'operator', 'reason', v_reason)
  );
  return public.lookup_public_agent(p_public_id);
end
$fn$;

create function public.list_owned_agents(p_owner_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_rows jsonb;
begin
  if p_owner_user_id is null or not public.kya_auth_user_exists(p_owner_user_id) then
    perform public.kya_fail('kya_unauthorized');
  end if;
  select coalesce(jsonb_agg(owned.row_data order by owned.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select agent.created_at,
           jsonb_build_object(
      'publicId', agent.public_id,
      'identityUrl', '/agents/' || agent.public_id,
      'name', agent.name,
      'description', agent.description,
      'endpointUrl', agent.endpoint_url,
      'claimedHost', agent.claimed_host,
      'category', agent.category,
      'capabilities', to_jsonb(agent.capabilities),
      'agentCardUrl', agent.agent_card_url,
      'createdAt', agent.created_at,
      'updatedAt', agent.updated_at,
      'lifecycle', agent.lifecycle,
      'domainVerification', case
        when agent.domain_verification = 'verified'
          and agent.verification_expires_at <= public.kya_now() then 'expired'
        else agent.domain_verification
      end,
      'verificationExpiresAt', agent.verification_expires_at,
      'ownerAssociated', true,
      'credentialPrefix', credential.token_prefix,
      'credentialRevokedAt', credential.revoked_at,
      'pendingChallenge', case
        when challenge.id is null then null
        else jsonb_build_object(
          'challengeId', challenge.id,
          'txtName', '_kya-challenge.' || challenge.host,
          'expiresAt', challenge.expires_at,
          'status', case
            when challenge.expires_at <= public.kya_now() then 'expired'
            else challenge.status
          end
        )
      end
    ) as row_data
    from public.agents as agent
    left join lateral (
      select token_prefix, revoked_at
      from public.agent_management_credentials
      where agent_id = agent.id
      order by (revoked_at is null) desc, created_at desc
      limit 1
    ) as credential on true
    left join lateral (
      select id, host, expires_at, status
      from public.verification_challenges
      where agent_id = agent.id and status = 'pending'
      order by created_at desc
      limit 1
    ) as challenge on true
    where agent.owner_user_id = p_owner_user_id
  ) as owned;
  return v_rows;
end
$fn$;

create function public.purge_request_windows()
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_count integer;
begin
  perform public.kya_begin_write();
  delete from public.request_windows
  where window_start < public.kya_now() - interval '48 hours';
  get diagnostics v_count = row_count;
  return v_count;
end
$fn$;

insert into public.rate_limit_policies (
  action, ip_hourly_limit, net_hourly_limit, global_hourly_limit, agent_hourly_limit
) values
  ('register', 5, 20, 500, null),
  ('challenge_issue', null, null, null, 30),
  ('challenge_complete', null, null, null, 10);

alter table public.rate_limit_policies enable row level security;
alter table public.rate_limit_policies force row level security;
alter table public.agents enable row level security;
alter table public.agents force row level security;
alter table public.agent_management_credentials enable row level security;
alter table public.agent_management_credentials force row level security;
alter table public.verification_challenges enable row level security;
alter table public.verification_challenges force row level security;
alter table public.verification_evidence enable row level security;
alter table public.verification_evidence force row level security;
alter table public.agent_events enable row level security;
alter table public.agent_events force row level security;
alter table public.request_windows enable row level security;
alter table public.request_windows force row level security;
alter table public.inspector_reports enable row level security;
alter table public.inspector_reports force row level security;

create policy agents_reader_select on public.agents
  for select to kya_reader using (true);
create policy agents_writer_all on public.agents
  for all to kya_writer using (true) with check (true);
create policy credentials_writer_all on public.agent_management_credentials
  for all to kya_writer using (true) with check (true);
create policy challenges_writer_all on public.verification_challenges
  for all to kya_writer using (true) with check (true);
create policy evidence_writer_all on public.verification_evidence
  for all to kya_writer using (true) with check (true);
create policy events_writer_all on public.agent_events
  for all to kya_writer using (true) with check (true);
create policy windows_writer_all on public.request_windows
  for all to kya_writer using (true) with check (true);
create policy limits_writer_select on public.rate_limit_policies
  for select to kya_writer using (true);

revoke all on table public.rate_limit_policies from public, anon, authenticated, service_role;
revoke all on table public.agents from public, anon, authenticated, service_role;
revoke all on table public.agent_management_credentials from public, anon, authenticated, service_role;
revoke all on table public.verification_challenges from public, anon, authenticated, service_role;
revoke all on table public.verification_evidence from public, anon, authenticated, service_role;
revoke all on table public.agent_events from public, anon, authenticated, service_role;
revoke all on table public.request_windows from public, anon, authenticated, service_role;
revoke all on table public.inspector_reports from public, anon, authenticated, service_role;

grant select (
  public_id, name, description, category, capabilities, endpoint_url, claimed_host,
  lifecycle, domain_verification, verification_expires_at, created_at, search_vector
) on public.agents to kya_reader;

grant select, insert, update on public.agents to kya_writer;
grant select, insert, update on public.agent_management_credentials to kya_writer;
grant select, insert, update on public.verification_challenges to kya_writer;
grant select, insert, update on public.verification_evidence to kya_writer;
grant select, insert, update on public.agent_events to kya_writer;
grant select, insert, update, delete on public.request_windows to kya_writer;
grant select on public.rate_limit_policies to kya_writer;

do $grants$
declare
  proc record;
begin
  for proc in
    select p.oid::regprocedure as signature
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.proname like 'kya\_%' escape '\'
        or p.proname in (
          'lookup_public_agent', 'search_public_agents', 'register_agent',
          'update_agent_metadata', 'issue_dns_challenge', 'complete_dns_challenge',
          'rotate_management_credential', 'revoke_management_credential',
          'associate_agent_owner', 'set_lifecycle', 'operator_set_lifecycle',
          'list_owned_agents', 'purge_request_windows'
        )
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', proc.signature);
  end loop;
end
$grants$;

grant execute on function public.kya_fail(text) to kya_reader, kya_writer;
grant execute on function public.kya_begin_write() to kya_writer;
grant execute on function public.kya_allow_write() to kya_reader, kya_writer;
grant execute on function public.kya_now() to kya_reader, kya_writer;
grant execute on function public.kya_hour_start() to kya_writer;
grant execute on function public.kya_sha256_hex(text) to kya_writer;
grant execute on function public.kya_random_bytes(integer) to kya_writer;
grant execute on function public.kya_encode_crockford(bytea) to kya_writer;
grant execute on function public.kya_capabilities_text(text[]) to kya_writer;
grant execute on function public.kya_new_public_id() to kya_writer;
grant execute on function public.kya_auth_user_exists(uuid) to kya_writer;
grant execute on function public.kya_clean_text(text, integer, integer) to kya_writer;
grant execute on function public.kya_normalize_host(text) to kya_writer;
grant execute on function public.kya_canonical_https(text, text) to kya_writer;
grant execute on function public.kya_assert_capabilities(text[]) to kya_writer;
grant execute on function public.kya_assert_metadata_node(jsonb, integer) to kya_writer;
grant execute on function public.kya_assert_metadata(jsonb) to kya_writer;
grant execute on function public.kya_public_json(
  text, text, text, text, text[], text, text, text, text, timestamptz
) to kya_reader, kya_writer;
grant execute on function public.kya_consume_limit(text, text, integer) to kya_writer;
grant execute on function public.kya_record_event(uuid, text, jsonb, uuid) to kya_writer;
grant execute on function public.kya_require_manager(text, text, uuid, text) to kya_writer;
grant execute on function public.kya_transition_lifecycle(uuid, text, uuid, jsonb) to kya_writer;

grant execute on function public.lookup_public_agent(text) to anon, authenticated, service_role;
grant execute on function public.search_public_agents(text, text, timestamptz, integer)
  to anon, authenticated, service_role;
grant execute on function public.register_agent(
  text, text, text, text, text, text[], text, uuid, text, text
) to service_role;
grant execute on function public.update_agent_metadata(
  text, text, uuid, text, text, text, text, text, text[], text
) to service_role;
grant execute on function public.issue_dns_challenge(text, text, uuid, text) to service_role;
grant execute on function public.complete_dns_challenge(text, text, uuid, uuid, text[]) to service_role;
grant execute on function public.rotate_management_credential(text, text, uuid) to service_role;
grant execute on function public.revoke_management_credential(text, text, uuid) to service_role;
grant execute on function public.associate_agent_owner(text, text, uuid) to service_role;
grant execute on function public.set_lifecycle(text, text, uuid, text) to service_role;
grant execute on function public.operator_set_lifecycle(text, text, text) to service_role;
grant execute on function public.list_owned_agents(uuid) to service_role;
grant execute on function public.purge_request_windows() to service_role;

-- Function owners stay with the migration role. supautils.hint_roles allows
-- SET ROLE only for anon, authenticated, and service_role, so
-- ALTER FUNCTION OWNER TO kya_reader or kya_writer is rejected.

comment on function public.kya_auth_user_exists(uuid) is
  'Migration-role existence check. Returns boolean only. EXECUTE is granted only to kya_writer. anon, authenticated, and service_role cannot call it. service_role learns that an id exists only by calling register_agent or list_owned_agents, which is the trusted server boundary.';
comment on function public.kya_sha256_hex(text) is
  'Migration-role SHA-256 helper. Fixed body, no table access. EXECUTE is granted only to kya_writer.';
comment on function public.kya_random_bytes(integer) is
  'Migration-role CSPRNG helper for 1 to 64 bytes. EXECUTE is granted only to kya_writer.';
comment on function public.register_agent(text, text, text, text, text, text[], text, uuid, text, text) is
  'Creates an agent and one management credential. Owner id must come from a verified session, never the JSON body.';
comment on function public.operator_set_lifecycle(text, text, text) is
  'Operator lifecycle change. Does not mint a credential. Do not expose as a public route.';
comment on table public.inspector_reports is
  'Reserved for KYA-05. The guard trigger rejects writes. Verification does not read this table.';
comment on table public.rate_limit_policies is
  'Registration caps: 5 per IP hour, 20 per network hour, 500 global per hour. Change only through a reviewed migration.';
