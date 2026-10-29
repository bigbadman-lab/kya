-- KYA-05 inspector reports.
-- Adds the columns and functions the reserved table needs.
-- Does not update agents.domain_verification, lifecycle, or credentials
-- except the last_used_at touch already performed by kya_require_manager.
-- Direct writes stay rejected. service_role can execute the functions only.

alter table public.rate_limit_policies
  drop constraint rate_limit_policies_action_chk;
alter table public.rate_limit_policies
  add constraint rate_limit_policies_action_chk check (
    action in ('register', 'challenge_issue', 'challenge_complete', 'inspect')
  );

alter table public.request_windows
  drop constraint request_windows_action_chk;
alter table public.request_windows
  add constraint request_windows_action_chk check (
    action in ('register', 'challenge_issue', 'challenge_complete', 'inspect')
  );

create or replace function public.kya_consume_limit(
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
  if p_action not in ('register', 'challenge_issue', 'challenge_complete', 'inspect') then
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

alter table public.inspector_reports
  add column interpretation text not null,
  add column use_cases jsonb not null,
  add column limitations text not null,
  add column evidence text not null,
  add column model text not null,
  add column source_fingerprint text not null,
  add constraint inspector_reports_interpretation_chk check (char_length(interpretation) between 20 and 1000),
  add constraint inspector_reports_limitations_chk check (char_length(limitations) between 20 and 1000),
  add constraint inspector_reports_evidence_chk check (char_length(evidence) between 20 and 500),
  add constraint inspector_reports_model_chk check (model = 'gpt-5.4-nano'),
  add constraint inspector_reports_fingerprint_chk check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  add constraint inspector_reports_use_cases_chk check (
    jsonb_typeof(use_cases) = 'array'
    and jsonb_array_length(use_cases) between 2 and 5
  );

alter table public.inspector_reports
  drop constraint inspector_reports_summary_chk;
alter table public.inspector_reports
  add constraint inspector_reports_summary_chk check (char_length(summary) between 20 and 1000);

create index inspector_reports_agent_created_idx
  on public.inspector_reports (agent_id, created_at desc);

create or replace function public.kya_trg_inspector_locked()
returns trigger
language plpgsql
set search_path = pg_catalog
as $fn$
begin
  if not public.kya_allow_write() then
    perform public.kya_fail('kya_forbidden');
  end if;
  if tg_op <> 'INSERT' then
    perform public.kya_fail('kya_forbidden');
  end if;
  return new;
end
$fn$;

create function public.kya_profile_fingerprint(
  p_name text,
  p_description text,
  p_category text,
  p_capabilities text[]
) returns text
language sql
immutable
set search_path = pg_catalog
as $fn$
  select public.kya_sha256_hex(
    coalesce(p_name, '') || E'\n' ||
    coalesce(p_description, '') || E'\n' ||
    coalesce(p_category, '') || E'\n' ||
    coalesce((
      select string_agg(capability, ',' order by capability)
      from unnest(coalesce(p_capabilities, array[]::text[])) as capability
    ), '')
  );
$fn$;

create function public.kya_inspector_json(
  p_status text,
  p_summary text,
  p_interpretation text,
  p_use_cases jsonb,
  p_limitations text,
  p_evidence text,
  p_model text,
  p_created_at timestamptz
) returns jsonb
language sql
immutable
set search_path = pg_catalog
as $fn$
  select jsonb_build_object(
    'status', p_status,
    'summary', p_summary,
    'capabilitiesInterpretation', p_interpretation,
    'useCases', p_use_cases,
    'limitations', p_limitations,
    'evidence', p_evidence,
    'model', p_model,
    'createdAt', p_created_at
  );
$fn$;

create function public.prepare_inspection(
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

  select lifecycle, name, description, category, capabilities, endpoint_url, claimed_host
  into v_lifecycle, v_name, v_description, v_category, v_capabilities, v_endpoint, v_host
  from public.agents
  where id = v_id;

  if v_lifecycle is distinct from 'active' then
    perform public.kya_fail('kya_forbidden');
  end if;

  v_fingerprint := public.kya_profile_fingerprint(v_name, v_description, v_category, v_capabilities);

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
      'endpointUrl', v_endpoint
    )
  );
end
$fn$;

create function public.save_inspector_report(
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
  v_fingerprint text;
  v_item jsonb;
  v_text text;
  v_created timestamptz;
  v_evidence constant text := 'This analysis used only the self-reported KYA profile fields for name, description, category, declared capabilities, claimed hostname, and endpoint URL. It did not inspect code, runtime behaviour, legal identity, or security.';
begin
  v_id := public.kya_require_manager(p_public_id, p_presented_token, null, 'bearer_or_owner');

  select lifecycle, name, description, category, capabilities
  into v_lifecycle, v_name, v_description, v_category, v_capabilities
  from public.agents
  where id = v_id;

  if v_lifecycle is distinct from 'active' then
    perform public.kya_fail('kya_forbidden');
  end if;

  v_fingerprint := public.kya_profile_fingerprint(v_name, v_description, v_category, v_capabilities);
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

create function public.lookup_inspector_report(p_public_id text)
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

  select id, lifecycle, name, description, category, capabilities
  into v_id, v_lifecycle, v_name, v_description, v_category, v_capabilities
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

  v_fingerprint := public.kya_profile_fingerprint(v_name, v_description, v_category, v_capabilities);
  return public.kya_inspector_json(
    case when v_stored = v_fingerprint then 'current' else 'stale' end,
    v_summary, v_interpretation, v_use_cases, v_limitations, v_evidence, v_model, v_created
  );
end
$fn$;

revoke all on function public.kya_profile_fingerprint(text, text, text, text[])
  from public, anon, authenticated, service_role;
revoke all on function public.kya_inspector_json(text, text, text, jsonb, text, text, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function public.prepare_inspection(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.save_inspector_report(text, text, text, text, text, jsonb, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.lookup_inspector_report(text)
  from public, anon, authenticated, service_role;

grant execute on function public.kya_profile_fingerprint(text, text, text, text[]) to kya_writer;
grant execute on function public.prepare_inspection(text, text) to service_role;
grant execute on function public.save_inspector_report(text, text, text, text, text, jsonb, text, text, text)
  to service_role;
grant execute on function public.lookup_inspector_report(text) to anon, authenticated, service_role;

insert into public.rate_limit_policies (
  action, ip_hourly_limit, net_hourly_limit, global_hourly_limit, agent_hourly_limit
) values ('inspect', null, null, 24, 2);

comment on table public.inspector_reports is
  'AI interpretations of self-reported profiles. Inserts go through save_inspector_report. Verification does not read this table.';
comment on function public.prepare_inspection(text, text) is
  'Authorizes an active identity, returns a current report without a new model call, or reserves one agent and one global inspection slot.';
comment on function public.save_inspector_report(text, text, text, text, text, jsonb, text, text, text) is
  'Stores one inspection for the current profile fingerprint. Does not change verification or lifecycle.';
comment on function public.lookup_inspector_report(text) is
  'Public read of the latest inspection for an active identity. Stale when the profile fingerprint differs. Null for suspended, revoked, and unknown ids.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values (
  '20261029180000',
  'inspector_reports',
  array['inspector_reports columns, prepare_inspection, save_inspector_report, lookup_inspector_report']
);
