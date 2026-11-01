-- Agent-reported check-ins and a sanitized public network projection.
-- A check-in is not domain verification, endpoint uptime, or an Inspector result.
-- The presented token is hashed. The client cannot supply the timestamp.

create table public.agent_presence (
  agent_id uuid primary key references public.agents (id) on delete cascade,
  last_check_in_at timestamptz not null,
  check_in_count integer not null,
  constraint agent_presence_count_chk check (check_in_count > 0)
);

create index agent_presence_recent_idx on public.agent_presence (last_check_in_at desc);

alter table public.agent_presence enable row level security;
alter table public.agent_presence force row level security;
revoke all on table public.agent_presence from public, anon, authenticated, service_role;

create function public.kya_presence_status(p_at timestamptz)
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $fn$
begin
  if p_at is null or p_at > public.kya_now() then
    return 'not_reported';
  end if;
  if p_at >= public.kya_now() - interval '15 minutes' then
    return 'recently_active';
  end if;
  return 'last_seen';
end
$fn$;

create function public.kya_public_presence(p_agent_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_at timestamptz;
begin
  select last_check_in_at
  into v_at
  from public.agent_presence
  where agent_id = p_agent_id;

  if not found or v_at > public.kya_now() then
    return jsonb_build_object('presenceStatus', 'not_reported', 'lastCheckInAt', null);
  end if;
  return jsonb_build_object(
    'presenceStatus', public.kya_presence_status(v_at),
    'lastCheckInAt', v_at
  );
end
$fn$;

create or replace function public.lookup_public_agent(p_public_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_name text;
  v_description text;
  v_category text;
  v_capabilities text[];
  v_endpoint text;
  v_host text;
  v_lifecycle text;
  v_domain text;
  v_expires timestamptz;
  v_json jsonb;
begin
  if p_public_id is null
     or char_length(p_public_id) > 40
     or p_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$' then
    return null;
  end if;
  select id, name, description, category, capabilities, endpoint_url, claimed_host,
         lifecycle, domain_verification, verification_expires_at
  into v_id, v_name, v_description, v_category, v_capabilities, v_endpoint, v_host,
       v_lifecycle, v_domain, v_expires
  from public.agents
  where public_id = p_public_id;
  if not found then
    return null;
  end if;
  v_json := public.kya_public_json(
    p_public_id, v_name, v_description, v_category, v_capabilities,
    v_endpoint, v_host, v_lifecycle, v_domain, v_expires
  );
  if v_lifecycle = 'active' then
    v_json := v_json || public.kya_public_presence(v_id);
  end if;
  return v_json;
end
$fn$;

create or replace function public.search_public_agents(
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
           ) || public.kya_public_presence(id) as proj
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

create function public.record_agent_check_in(
  p_public_id text,
  p_presented_token text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_lifecycle text;
  v_prefix text;
  v_agent uuid;
  v_revoked timestamptz;
  v_expires timestamptz;
  v_now timestamptz;
  v_seen timestamptz;
  v_recent integer;
begin
  perform public.kya_begin_write();

  if p_public_id is null or p_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$' then
    perform public.kya_fail('kya_not_found');
  end if;

  select id, lifecycle
  into v_id, v_lifecycle
  from public.agents
  where public_id = p_public_id
  for update;

  if not found then
    perform public.kya_fail('kya_not_found');
  end if;
  if v_lifecycle <> 'active' then
    perform public.kya_fail('kya_forbidden');
  end if;
  if p_presented_token is null or btrim(p_presented_token) = '' then
    perform public.kya_fail('kya_unauthorized');
  end if;
  if char_length(p_presented_token) > 200 then
    perform public.kya_fail('kya_invalid');
  end if;

  select token_prefix, agent_id, revoked_at, expires_at
  into v_prefix, v_agent, v_revoked, v_expires
  from public.agent_management_credentials
  where token_hash = public.kya_sha256_hex(p_presented_token);

  if not found then
    perform public.kya_fail('kya_unauthorized');
  end if;
  if v_agent is distinct from v_id then
    perform public.kya_fail('kya_forbidden');
  end if;
  if v_revoked is not null
     or (v_expires is not null and v_expires <= public.kya_now()) then
    perform public.kya_fail('kya_unauthorized');
  end if;
  if v_prefix is null or v_prefix !~ '^kya_mgmt_[0-9a-hjkmnp-tv-z]{8}$' then
    perform public.kya_fail('kya_unavailable');
  end if;

  -- The agent row lock is held until this function's transaction commits.
  -- A second check-in for the same agent waits, then reads the committed row.
  v_now := public.kya_now();
  select last_check_in_at
  into v_seen
  from public.agent_presence
  where agent_id = v_id
  for update;

  if found and v_seen > v_now - interval '60 seconds' then
    return jsonb_build_object(
      'publicId', p_public_id,
      'accepted', false,
      'lastCheckInAt', v_seen,
      'presenceStatus', public.kya_presence_status(v_seen),
      'nextRecommendedCheckInAt', v_seen + interval '5 minutes'
    );
  end if;

  -- One lock for every accepted check-in, so two agents cannot both pass the cap.
  perform pg_advisory_xact_lock(481009, 60);
  select count(*)
  into v_recent
  from public.agent_presence
  where last_check_in_at > v_now - interval '60 seconds';
  if v_recent >= 200 then
    perform public.kya_fail('kya_rate_limited');
  end if;

  insert into public.agent_presence (agent_id, last_check_in_at, check_in_count)
  values (v_id, v_now, 1)
  on conflict (agent_id) do update
  set last_check_in_at = excluded.last_check_in_at,
      check_in_count = public.agent_presence.check_in_count + 1
  where public.agent_presence.last_check_in_at <= excluded.last_check_in_at - interval '60 seconds'
  returning last_check_in_at
  into v_seen;

  if not found then
    select last_check_in_at
    into v_seen
    from public.agent_presence
    where agent_id = v_id;
    if v_seen is null then
      perform public.kya_fail('kya_unavailable');
    end if;
    return jsonb_build_object(
      'publicId', p_public_id,
      'accepted', false,
      'lastCheckInAt', v_seen,
      'presenceStatus', public.kya_presence_status(v_seen),
      'nextRecommendedCheckInAt', v_seen + interval '5 minutes'
    );
  end if;

  return jsonb_build_object(
    'publicId', p_public_id,
    'accepted', true,
    'lastCheckInAt', v_seen,
    'presenceStatus', 'recently_active',
    'nextRecommendedCheckInAt', v_seen + interval '5 minutes'
  );
end
$fn$;

create function public.search_public_network(
  p_cursor text,
  p_limit integer
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_limit integer;
  v_at timestamptz;
  v_public_id text;
  v_type text;
  v_events jsonb;
  v_count integer;
  v_cursor text;
begin
  if p_limit is null then
    v_limit := 20;
  elsif p_limit < 1 or p_limit > 50 then
    perform public.kya_fail('kya_invalid');
  else
    v_limit := p_limit;
  end if;

  if p_cursor is null or btrim(p_cursor) = '' then
    v_at := null;
  else
    if char_length(p_cursor) > 120 or split_part(p_cursor, '|', 4) <> '' then
      perform public.kya_fail('kya_invalid');
    end if;
    begin
      v_at := split_part(p_cursor, '|', 1)::timestamptz;
    exception when invalid_text_representation then
      perform public.kya_fail('kya_invalid');
    end;
    v_public_id := split_part(p_cursor, '|', 2);
    v_type := split_part(p_cursor, '|', 3);
    if v_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$'
       or v_type not in ('domain_verified', 'profile_updated', 'last_check_in') then
      perform public.kya_fail('kya_invalid');
    end if;
  end if;

  select coalesce(jsonb_agg(page.proj order by page.occurred_at desc, page.public_id desc, page.event_type desc), '[]'::jsonb),
         count(*)
  into v_events, v_count
  from (
    select occurred_at, public_id, event_type,
           jsonb_build_object(
             'occurredAt', occurred_at,
             'publicId', public_id,
             'identityUrl', '/agents/' || public_id,
             'name', name,
             'eventType', event_type
           ) as proj
    from (
      select e.created_at as occurred_at, a.public_id, a.name, 'domain_verified'::text as event_type
      from public.agent_events e
      join public.agents a on a.id = e.agent_id
      where e.event_type = 'verification_passed'
        and a.lifecycle = 'active'
        and a.domain_verification = 'verified'
        and a.verification_expires_at > public.kya_now()
      union all
      select e.created_at, a.public_id, a.name, 'profile_updated'
      from public.agent_events e
      join public.agents a on a.id = e.agent_id
      where e.event_type = 'updated'
        and a.lifecycle = 'active'
        and a.domain_verification = 'verified'
        and a.verification_expires_at > public.kya_now()
      union all
      select p.last_check_in_at, a.public_id, a.name, 'last_check_in'
      from public.agent_presence p
      join public.agents a on a.id = p.agent_id
      where a.lifecycle = 'active'
        and a.domain_verification = 'verified'
        and a.verification_expires_at > public.kya_now()
        and p.last_check_in_at <= public.kya_now()
    ) as activity
    where v_at is null
       or occurred_at < v_at
       or (occurred_at = v_at and public_id < v_public_id)
       or (occurred_at = v_at and public_id = v_public_id and event_type < v_type)
    order by occurred_at desc, public_id desc, event_type desc
    limit v_limit
  ) as page;

  if v_count = v_limit and jsonb_array_length(v_events) > 0 then
    v_cursor := to_char(
      ((v_events -> (jsonb_array_length(v_events) - 1) ->> 'occurredAt')::timestamptz) at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    )
      || '|' || (v_events -> (jsonb_array_length(v_events) - 1) ->> 'publicId')
      || '|' || (v_events -> (jsonb_array_length(v_events) - 1) ->> 'eventType');
  end if;

  return jsonb_build_object(
    'events', v_events,
    'nextCursor', case when v_count = v_limit then v_cursor else null end
  );
end
$fn$;

revoke all on function public.kya_presence_status(timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.kya_public_presence(uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_agent_check_in(text, text) from public, anon, authenticated, service_role;
revoke all on function public.search_public_network(text, integer) from public, anon, authenticated, service_role;

grant execute on function public.kya_presence_status(timestamptz) to kya_reader, kya_writer;
grant execute on function public.record_agent_check_in(text, text) to service_role;
grant execute on function public.search_public_network(text, integer) to anon, authenticated, service_role;

comment on table public.agent_presence is
  'One row per agent. last_check_in_at is the server time of an authenticated check-in. It is not domain verification or measured uptime.';
comment on function public.record_agent_check_in(text, text) is
  'Records a check-in for the active agent that owns the presented management token. The agent row lock serializes concurrent check-ins, and the presence primary key rejects a second acceptance inside 60 seconds. The timestamp is clock_timestamp(), never a client value. No audit event is written.';
comment on function public.search_public_network(text, integer) is
  'Public activity for identities that are active and currently domain verified. Omits audit metadata, credentials, and unverified identities.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values (
  '20261101220000',
  'agent_presence',
  array['agent_presence, record_agent_check_in, search_public_network']
);
