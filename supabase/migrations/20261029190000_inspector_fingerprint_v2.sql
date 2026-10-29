-- Fingerprint version 2.
-- The stored hash now covers every profile field sent to the model.
-- Reports hashed with the version 1 contract no longer match, so lookup
-- marks them stale. Rate limits, RLS, and verification columns are unchanged.

create function public.kya_profile_fingerprint(
  p_name text,
  p_description text,
  p_category text,
  p_capabilities text[],
  p_claimed_host text,
  p_endpoint_url text,
  p_agent_card_url text
) returns text
language sql
immutable
set search_path = pg_catalog
as $fn$
  select public.kya_sha256_hex(
    '{"v":2'
    || ',"agentCardUrl":' || to_json(coalesce(p_agent_card_url, ''))::text
    || ',"capabilities":[' || coalesce((
         select string_agg(to_json(capability)::text, ',' order by capability)
         from unnest(coalesce(p_capabilities, array[]::text[])) as capability
       ), '') || ']'
    || ',"category":' || to_json(coalesce(p_category, ''))::text
    || ',"claimedHost":' || to_json(coalesce(p_claimed_host, ''))::text
    || ',"description":' || to_json(coalesce(p_description, ''))::text
    || ',"endpointUrl":' || to_json(coalesce(p_endpoint_url, ''))::text
    || ',"name":' || to_json(coalesce(p_name, ''))::text
    || '}'
  );
$fn$;

create or replace function public.prepare_inspection(
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
  v_name text;
  v_description text;
  v_category text;
  v_capabilities text[];
  v_endpoint text;
  v_host text;
  v_card text;
  v_fingerprint text;
  v_summary text;
  v_interpretation text;
  v_use_cases jsonb;
  v_limitations text;
  v_evidence text;
  v_model text;
  v_created timestamptz;
  v_agent_limit integer;
  v_global_limit integer;
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, null, 'bearer_or_owner');

  select lifecycle, name, description, category, capabilities, endpoint_url, claimed_host, agent_card_url
  into v_lifecycle, v_name, v_description, v_category, v_capabilities, v_endpoint, v_host, v_card
  from public.agents
  where id = v_id;

  if v_lifecycle is distinct from 'active' then
    perform public.kya_fail('kya_forbidden');
  end if;

  v_fingerprint := public.kya_profile_fingerprint(
    v_name, v_description, v_category, v_capabilities, v_host, v_endpoint, v_card
  );

  select summary, interpretation, use_cases, limitations, evidence, model, created_at
  into v_summary, v_interpretation, v_use_cases, v_limitations, v_evidence, v_model, v_created
  from public.inspector_reports
  where agent_id = v_id
    and source_fingerprint = v_fingerprint
  order by created_at desc
  limit 1;

  if found then
    return public.kya_inspector_json(
      'current', v_summary, v_interpretation, v_use_cases, v_limitations, v_evidence, v_model, v_created
    ) || jsonb_build_object('reused', true);
  end if;

  select agent_hourly_limit, global_hourly_limit
  into v_agent_limit, v_global_limit
  from public.rate_limit_policies
  where action = 'inspect';

  if v_agent_limit is null or v_global_limit is null then
    perform public.kya_fail('kya_unavailable');
  end if;

  perform public.kya_consume_limit('global', 'inspect', v_global_limit);
  perform public.kya_consume_limit('agent:' || v_id::text, 'inspect', v_agent_limit);

  return jsonb_build_object(
    'reserved', true,
    'sourceFingerprint', v_fingerprint,
    'profile', jsonb_build_object(
      'name', v_name,
      'description', v_description,
      'category', v_category,
      'capabilities', to_jsonb(v_capabilities),
      'claimedHost', v_host,
      'endpointUrl', v_endpoint,
      'agentCardUrl', v_card
    )
  );
end
$fn$;

create or replace function public.save_inspector_report(
  p_public_id text,
  p_presented_token text,
  p_source_fingerprint text,
  p_summary text,
  p_interpretation text,
  p_use_cases jsonb,
  p_limitations text,
  p_evidence text,
  p_model text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_lifecycle text;
  v_name text;
  v_description text;
  v_category text;
  v_capabilities text[];
  v_endpoint text;
  v_host text;
  v_card text;
  v_fingerprint text;
  v_item jsonb;
  v_text text;
  v_created timestamptz;
  v_evidence constant text := 'This analysis used only the self-reported KYA profile fields for name, description, category, declared capabilities, claimed hostname, endpoint URL, and agent card URL when one is stored. It did not inspect code, runtime behaviour, legal identity, or security.';
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, null, 'bearer_or_owner');

  select lifecycle, name, description, category, capabilities, endpoint_url, claimed_host, agent_card_url
  into v_lifecycle, v_name, v_description, v_category, v_capabilities, v_endpoint, v_host, v_card
  from public.agents
  where id = v_id;

  if v_lifecycle is distinct from 'active' then
    perform public.kya_fail('kya_forbidden');
  end if;

  v_fingerprint := public.kya_profile_fingerprint(
    v_name, v_description, v_category, v_capabilities, v_host, v_endpoint, v_card
  );
  if p_source_fingerprint is distinct from v_fingerprint then
    perform public.kya_fail('kya_conflict');
  end if;
  if p_model is distinct from 'gpt-5.4-nano' or p_evidence is distinct from v_evidence then
    perform public.kya_fail('kya_invalid');
  end if;
  if p_summary is null or char_length(p_summary) < 20 or char_length(p_summary) > 1000
     or p_interpretation is null or char_length(p_interpretation) < 20 or char_length(p_interpretation) > 1000
     or p_limitations is null or char_length(p_limitations) < 20 or char_length(p_limitations) > 1000
     or p_summary ~ '[[:cntrl:]]' or p_interpretation ~ '[[:cntrl:]]' or p_limitations ~ '[[:cntrl:]]'
     or p_summary ~ 'kya_mgmt_' or p_interpretation ~ 'kya_mgmt_' or p_limitations ~ 'kya_mgmt_' then
    perform public.kya_fail('kya_invalid');
  end if;
  if p_use_cases is null
     or jsonb_typeof(p_use_cases) is distinct from 'array'
     or jsonb_array_length(p_use_cases) < 2
     or jsonb_array_length(p_use_cases) > 5 then
    perform public.kya_fail('kya_invalid');
  end if;

  for v_item in select value from jsonb_array_elements(p_use_cases)
  loop
    if jsonb_typeof(v_item) is distinct from 'string' then
      perform public.kya_fail('kya_invalid');
    end if;
    v_text := v_item #>> '{}';
    if v_text is null or char_length(v_text) < 8 or char_length(v_text) > 240
       or v_text ~ '[[:cntrl:]]' or v_text ~ 'kya_mgmt_' then
      perform public.kya_fail('kya_invalid');
    end if;
  end loop;

  v_created := public.kya_now();
  insert into public.inspector_reports (
    agent_id, summary, interpretation, use_cases, limitations, evidence, model, source_fingerprint, created_at
  ) values (
    v_id, p_summary, p_interpretation, p_use_cases, p_limitations, p_evidence, p_model, v_fingerprint, v_created
  );

  return public.kya_inspector_json(
    'current', p_summary, p_interpretation, p_use_cases, p_limitations, p_evidence, p_model, v_created
  ) || jsonb_build_object('reused', false);
end
$fn$;

create or replace function public.lookup_inspector_report(p_public_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
declare
  v_id uuid;
  v_lifecycle text;
  v_name text;
  v_description text;
  v_category text;
  v_capabilities text[];
  v_endpoint text;
  v_host text;
  v_card text;
  v_fingerprint text;
  v_stored text;
  v_summary text;
  v_interpretation text;
  v_use_cases jsonb;
  v_limitations text;
  v_evidence text;
  v_model text;
  v_created timestamptz;
begin
  if p_public_id is null
     or char_length(p_public_id) > 40
     or p_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$' then
    return null;
  end if;

  select id, lifecycle, name, description, category, capabilities, endpoint_url, claimed_host, agent_card_url
  into v_id, v_lifecycle, v_name, v_description, v_category, v_capabilities, v_endpoint, v_host, v_card
  from public.agents
  where public_id = p_public_id;

  if not found or v_lifecycle is distinct from 'active' then
    return null;
  end if;

  select source_fingerprint, summary, interpretation, use_cases, limitations, evidence, model, created_at
  into v_stored, v_summary, v_interpretation, v_use_cases, v_limitations, v_evidence, v_model, v_created
  from public.inspector_reports
  where agent_id = v_id
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('status', 'none');
  end if;

  v_fingerprint := public.kya_profile_fingerprint(
    v_name, v_description, v_category, v_capabilities, v_host, v_endpoint, v_card
  );
  return public.kya_inspector_json(
    case when v_stored = v_fingerprint then 'current' else 'stale' end,
    v_summary, v_interpretation, v_use_cases, v_limitations, v_evidence, v_model, v_created
  );
end
$fn$;

drop function public.kya_profile_fingerprint(text, text, text, text[]);

revoke all on function public.kya_profile_fingerprint(text, text, text, text[], text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.kya_profile_fingerprint(text, text, text, text[], text, text, text) to kya_writer;

comment on function public.kya_profile_fingerprint(text, text, text, text[], text, text, text) is
  'Version 2 profile hash. Covers name, description, category, capabilities, claimed host, endpoint URL, and agent card URL. EXECUTE is granted only to kya_writer.';
comment on function public.lookup_inspector_report(text) is
  'Public read of the latest inspection for an active identity. Stale when the version 2 profile fingerprint differs, including a hostname, endpoint, or agent card change. Null for suspended, revoked, and unknown ids.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values (
  '20261029190000',
  'inspector_fingerprint_v2',
  array['kya_profile_fingerprint(text, text, text, text[], text, text, text)']
);
