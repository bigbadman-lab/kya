-- KYA-03C verification. The whole script is one transaction and ends in ROLLBACK.
-- Requires the migration. Run only through supabase/tests/run.sh as the migration role.
-- Utility statements stay at the top level. Plpgsql blocks contain only queries and EXECUTE.

begin;

create temp table kya_fix (
  slot text primary key,
  public_id text,
  token text,
  challenge_id uuid,
  published text
) on commit drop;

create function pg_temp.ok(p_ok boolean, p_label text)
returns void
language plpgsql
as $fn$
begin
  if not coalesce(p_ok, false) then
    raise exception 'kya_test_failed: %', p_label;
  end if;
end
$fn$;

do $main$
declare
  v_ip text := 'ip:' || repeat('ab', 32);
  v_net text := 'net:' || repeat('cd', 32);
  v_result jsonb;
  v_first jsonb;
  v_other jsonb;
  v_shared jsonb;
  v_lookup jsonb;
  v_search jsonb;
  v_issue jsonb;
  v_complete jsonb;
  v_rotated jsonb;
  v_public text;
  v_token text;
  v_old_token text;
  v_hash text;
  v_hits integer;
  v_i integer;
  v_before integer;
  v_args text;
  v_def text;
  v_raw text;
  v_bool boolean;
begin
  if to_regclass('public.agents') is null then
    raise exception 'kya_test_failed: migration not applied';
  end if;

  perform pg_temp.ok(
    public.kya_encode_crockford(decode('00000000000000000000000000000000', 'hex'))
      = '00000000000000000000000000'
    and public.kya_encode_crockford(decode('ffffffffffffffffffffffffffffffff', 'hex'))
      = 'zzzzzzzzzzzzzzzzzzzzzzzzzw'
    and public.kya_encode_crockford(decode('00112233445566778899aabbccddeeff', 'hex'))
      = '008j4ct4ank7f24snaxwsqfezw'
    and char_length(public.kya_encode_crockford(decode(repeat('00', 32), 'hex'))) = 52
    and public.kya_sha256_hex('abc')
      = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'codec vector'
  );
  perform pg_temp.ok(public.kya_normalize_host('Example.COM.') = 'example.com', 'host normalization');

  foreach v_raw in array[
    'localhost', 'printer.local', 'db.internal', 'nas.home', '1.2.3.4',
    '2001:db8::1', '*.example.com', 'foo_bar.example', 'example.com..'
  ] loop
    begin
      perform public.kya_normalize_host(v_raw);
      raise exception 'kya_test_failed: host accepted %', v_raw;
    exception
      when raise_exception then
        if sqlerrm is distinct from 'kya_invalid' then
          raise exception 'kya_test_failed: host % got %', v_raw, sqlerrm;
        end if;
    end;
  end loop;

  begin
    perform public.kya_canonical_https('https://user:pass@harbor.example/a', 'harbor.example');
    raise exception 'kya_test_failed: userinfo accepted';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_invalid' then
        raise exception 'kya_test_failed: userinfo got %', sqlerrm;
      end if;
  end;

  perform pg_temp.ok((
    select count(*) = 8
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'agents', 'agent_management_credentials', 'verification_challenges',
        'verification_evidence', 'agent_events', 'request_windows',
        'rate_limit_policies', 'inspector_reports'
      )
      and c.relrowsecurity
      and c.relforcerowsecurity
  ), 'rls coverage');

  perform pg_temp.ok(not exists (
    select 1
    from pg_index as idx
    join pg_class as tbl on tbl.oid = idx.indrelid
    join pg_namespace as n on n.oid = tbl.relnamespace
    where n.nspname = 'public'
      and tbl.relname = 'agents'
      and idx.indisunique
      and pg_get_indexdef(idx.indexrelid) ~ 'claimed_host|verified_host'
  ), 'host uniqueness');

  perform pg_temp.ok((
    select ip_hourly_limit = 5 and net_hourly_limit = 20 and global_hourly_limit = 500
    from public.rate_limit_policies
    where action = 'register'
  ), 'registration caps');

  select pg_get_function_identity_arguments(p.oid)
  into v_args
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'register_agent';
  perform pg_temp.ok(
    v_args !~* 'public_id|token_hash|lifecycle|domain_verification|management_token'
    and v_args ~ 'p_owner_user_id uuid',
    'register signature'
  );

  perform pg_temp.ok(not exists (
    select 1
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and position('openai' in lower(pg_get_functiondef(p.oid))) > 0
      and (
        p.proname like 'kya\_%' escape '\'
        or p.proname in (
          'register_agent', 'complete_dns_challenge', 'lookup_public_agent', 'search_public_agents'
        )
      )
  ), 'openai reference');

  select pg_get_functiondef(p.oid)
  into v_def
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_dns_challenge';
  perform pg_temp.ok(
    position('inspector_reports' in v_def) = 0
    and not exists (
      select 1
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('complete_dns_challenge', 'register_agent', 'update_agent_metadata')
        and position('token_hash' in pg_get_function_identity_arguments(p.oid)) > 0
    ),
    'verification boundary'
  );

  perform pg_temp.ok(
    not has_table_privilege('anon', 'public.agents', 'select')
    and not has_table_privilege('anon', 'public.agents', 'insert')
    and not has_table_privilege('authenticated', 'public.agent_management_credentials', 'select')
    and not has_table_privilege('service_role', 'public.agents', 'select')
    and not has_table_privilege('service_role', 'public.agent_management_credentials', 'select')
    and not has_column_privilege('kya_reader', 'public.agents', 'owner_user_id', 'select')
    and not has_column_privilege('anon', 'public.agent_management_credentials', 'token_hash', 'select')
    and not pg_has_role('service_role', 'kya_writer', 'member')
    and not pg_has_role('anon', 'kya_writer', 'member')
    and not pg_has_role('authenticated', 'kya_writer', 'member')
    and not pg_has_role('service_role', 'kya_reader', 'member'),
    'privilege matrix'
  );
  perform pg_temp.ok(
    not has_table_privilege('anon', 'public.agent_events', 'select')
    and not has_table_privilege('anon', 'public.verification_challenges', 'select')
    and not has_table_privilege('anon', 'public.verification_evidence', 'select')
    and not has_table_privilege('anon', 'public.request_windows', 'select')
    and not has_table_privilege('authenticated', 'public.agent_events', 'select')
    and not has_table_privilege('authenticated', 'public.verification_challenges', 'select')
    and not has_table_privilege('authenticated', 'public.verification_evidence', 'select')
    and not has_table_privilege('authenticated', 'public.request_windows', 'select')
    and not has_table_privilege('authenticated', 'public.agent_management_credentials', 'select')
    and not has_table_privilege('service_role', 'public.agent_events', 'select')
    and not has_table_privilege('service_role', 'public.verification_challenges', 'select')
    and not has_table_privilege('service_role', 'public.verification_evidence', 'select')
    and not has_table_privilege('service_role', 'public.request_windows', 'select'),
    'sensitive table privileges'
  );

  select has_function_privilege('anon', p.oid, 'execute')
  into v_bool
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'register_agent';
  perform pg_temp.ok(not v_bool, 'anon register execute');
  select has_function_privilege('anon', p.oid, 'execute')
  into v_bool
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'lookup_public_agent';
  perform pg_temp.ok(v_bool, 'anon lookup execute');
  select has_function_privilege('service_role', p.oid, 'execute')
  into v_bool
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'kya_auth_user_exists';
  perform pg_temp.ok(not v_bool, 'auth probe execute');
  select has_function_privilege('authenticated', p.oid, 'execute')
  into v_bool
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'register_agent';
  perform pg_temp.ok(not v_bool, 'authenticated register execute');
  perform pg_temp.ok(
    (
      select p.prosecdef
        and r.rolname = current_user
        and exists (
          select 1 from unnest(p.proconfig) as cfg
          where cfg = 'search_path=pg_catalog'
        )
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      join pg_roles as r on r.oid = p.proowner
      where n.nspname = 'public' and p.proname = 'kya_auth_user_exists'
    )
    and (
      select p.prosecdef and r.rolname = current_user
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      join pg_roles as r on r.oid = p.proowner
      where n.nspname = 'public' and p.proname = 'kya_random_bytes'
    )
    and (
      select p.prosecdef and r.rolname = current_user
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      join pg_roles as r on r.oid = p.proowner
      where n.nspname = 'public' and p.proname = 'kya_sha256_hex'
    )
    and not has_function_privilege('anon', 'public.kya_random_bytes(integer)', 'execute')
    and not has_function_privilege('anon', 'public.kya_sha256_hex(text)', 'execute')
    and not has_function_privilege('service_role', 'public.kya_random_bytes(integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.kya_auth_user_exists(uuid)', 'execute'),
    'helper ownership'
  );
  perform pg_temp.ok(
    not exists (
      select 1
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and (
          p.proconfig is null
          or not exists (
            select 1 from unnest(p.proconfig) as cfg
            where cfg = 'search_path=pg_catalog'
          )
        )
    )
    and not exists (
      select 1
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      join pg_roles as r on r.oid = p.proowner
      where n.nspname = 'public'
        and r.rolname in ('kya_writer', 'kya_reader')
        and position('extensions.' in pg_get_functiondef(p.oid)) > 0
    )
    and exists (
      select 1
      from pg_constraint
      where conname = 'agents_public_id_chk'
        and pg_get_constraintdef(oid) like '%[048cgmrw]%'
    ),
    'definer search_path and canonical id'
  );

  begin
    insert into public.inspector_reports (agent_id, summary)
    values ('11111111-1111-4111-8111-111111111111', 'not a verification');
    raise exception 'kya_test_failed: inspector write succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_inspector_deferred' then
        raise exception 'kya_test_failed: inspector got %', sqlerrm;
      end if;
  end;

  begin
    insert into public.agents (
      public_id, name, description, endpoint_url, claimed_host, category, capabilities
    ) values (
      'kya_' || repeat('0', 26),
      'Direct',
      'A sufficiently long description.',
      'https://direct.example/agent',
      'direct.example',
      'Research',
      array['search']
    );
    raise exception 'kya_test_failed: direct insert succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_forbidden' then
        raise exception 'kya_test_failed: direct insert got %', sqlerrm;
      end if;
  end;

  begin
    perform public.kya_begin_write();
    insert into public.agents (
      public_id, name, description, endpoint_url, claimed_host, category, capabilities
    ) values (
      'kya_' || repeat('z', 26),
      'Noncanonical',
      'A sufficiently long description.',
      'https://badid.example/agent',
      'badid.example',
      'Research',
      array['search']
    );
    execute 'reset role';
    raise exception 'kya_test_failed: noncanonical id accepted';
  exception
    when check_violation then
      if sqlerrm not like '%agents_public_id_chk%' then
        execute 'reset role';
        raise exception 'kya_test_failed: noncanonical got %', sqlerrm;
      end if;
      execute 'reset role';
    when others then
      execute 'reset role';
      raise;
  end;

  for v_i in 1..5 loop
    v_result := public.register_agent(
      'Agent ' || v_i,
      'A sufficiently long description.',
      'https://c' || v_i || '.example/agent',
      'c' || v_i || '.example',
      'Research',
      array['search'],
      null,
      null,
      v_ip,
      v_net
    );
    if v_i = 1 then
      v_first := v_result;
    end if;
  end loop;

  begin
    perform public.register_agent(
      'Agent 6', 'A sufficiently long description.',
      'https://c6.example/agent', 'c6.example', 'Research', array['search'],
      null, null, v_ip, v_net
    );
    raise exception 'kya_test_failed: sixth registration succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_rate_limited' then
        raise exception 'kya_test_failed: rate limit got %', sqlerrm;
      end if;
  end;

  select hits into v_hits from public.request_windows
  where subject = 'global' and action = 'register';
  perform pg_temp.ok(v_hits = 5, 'global counter');
  select hits into v_hits from public.request_windows
  where subject = v_ip and action = 'register';
  perform pg_temp.ok(v_hits = 5 and (select count(*) from public.agents) = 5, 'ip counter');

  v_public := v_first ->> 'publicId';
  v_old_token := v_first ->> 'managementToken';
  perform pg_temp.ok(
    v_public ~ '^kya_[0-9a-hjkmnp-tv-z]{25}[048cgmrw]$'
    and v_first ->> 'credentialPrefix' = left(v_old_token, 17)
    and v_first ->> 'domainVerification' = 'unverified'
    and v_first ->> 'lifecycle' = 'active',
    'registration shape'
  );
  select token_hash into v_hash
  from public.agent_management_credentials as credential
  join public.agents as agent on agent.id = credential.agent_id
  where agent.public_id = v_public and credential.revoked_at is null;
  perform pg_temp.ok(
    v_hash is not null
    and v_hash <> v_old_token
    and v_hash = public.kya_sha256_hex(v_old_token)
    and (select owner_user_id from public.agents where public_id = v_public) is null,
    'credential storage'
  );
  perform pg_temp.ok(
    position(v_old_token in (select string_agg(metadata::text, '') from public.agent_events)) = 0
    and position(v_hash in (select string_agg(metadata::text, '') from public.agent_events)) = 0,
    'audit redaction'
  );

  v_lookup := public.lookup_public_agent(v_public);
  v_search := public.search_public_agents(null, null, null, null);
  perform pg_temp.ok(
    not (v_lookup ? 'managementToken')
    and position(v_old_token in v_lookup::text) = 0
    and v_lookup ->> 'domainVerification' = 'unverified'
    and jsonb_array_length(v_search -> 'agents') = 0,
    'unverified visibility'
  );

  begin
    execute 'set local role anon';
    v_lookup := public.lookup_public_agent(v_public);
    begin
      perform 1 from public.agents;
      raise exception 'kya_test_failed: anon read agents';
    exception
      when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.agent_management_credentials;
      raise exception 'kya_test_failed: anon read credentials';
    exception
      when insufficient_privilege then null;
    end;
    execute 'reset role';
  exception
    when others then
      execute 'reset role';
      raise;
  end;
  perform pg_temp.ok(
    v_lookup ->> 'publicId' = v_public and not (v_lookup ? 'managementToken'),
    'anon lookup'
  );

  begin
    execute 'set local role anon';
    begin
      perform public.register_agent(
        'Anon', 'A sufficiently long description.',
        'https://anon.example/agent', 'anon.example', 'Research', array['search'],
        null, null, v_ip, v_net
      );
      raise exception 'kya_test_failed: anon register succeeded';
    exception
      when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.agent_events;
      raise exception 'kya_test_failed: anon read events';
    exception
      when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.verification_challenges;
      raise exception 'kya_test_failed: anon read challenges';
    exception
      when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.verification_evidence;
      raise exception 'kya_test_failed: anon read evidence';
    exception
      when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.request_windows;
      raise exception 'kya_test_failed: anon read windows';
    exception
      when insufficient_privilege then null;
    end;
    execute 'set local role authenticated';
    begin
      perform public.register_agent(
        'Signed', 'A sufficiently long description.',
        'https://signed.example/agent', 'signed.example', 'Research', array['search'],
        null, null, v_ip, v_net
      );
      raise exception 'kya_test_failed: authenticated register succeeded';
    exception
      when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.agent_management_credentials;
      raise exception 'kya_test_failed: authenticated read credentials';
    exception
      when insufficient_privilege then null;
    end;
    execute 'reset role';
  exception
    when others then
      execute 'reset role';
      raise;
  end;
  perform pg_temp.ok(current_user <> 'anon' and current_user <> 'authenticated', 'role impersonation');

  update public.rate_limit_policies
  set ip_hourly_limit = 1000, net_hourly_limit = 1000, global_hourly_limit = 1000
  where action = 'register';

  v_before := (select count(*) from public.agents);
  begin
    perform public.register_agent(
      'Nope', 'A sufficiently long description.',
      'https://nope.example/agent', 'nope.example', 'Research', array['search'],
      null, '33333333-3333-4333-8333-333333333333'::uuid,
      'ip:' || repeat('34', 32), 'net:' || repeat('56', 32)
    );
    raise exception 'kya_test_failed: unknown owner accepted';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_invalid' then
        raise exception 'kya_test_failed: unknown owner got %', sqlerrm;
      end if;
  end;
  perform pg_temp.ok((select count(*) from public.agents) = v_before, 'invalid owner insert');

  begin
    perform public.update_agent_metadata(
      v_public, null, null, 'Agent 1', 'A sufficiently long description.',
      'https://c1.example/agent', 'c1.example', 'Research', array['search'], null
    );
    raise exception 'kya_test_failed: anonymous update succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unauthorized' then
        raise exception 'kya_test_failed: anonymous update got %', sqlerrm;
      end if;
  end;
  begin
    perform public.update_agent_metadata(
      v_public, v_hash, null, 'Agent 1', 'A sufficiently long description.',
      'https://c1.example/agent', 'c1.example', 'Research', array['search'], null
    );
    raise exception 'kya_test_failed: hash was accepted as a bearer';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unauthorized' then
        raise exception 'kya_test_failed: hash bearer got %', sqlerrm;
      end if;
  end;

  v_other := public.register_agent(
    'Other', 'A sufficiently long description.',
    'https://other.example/agent', 'other.example', 'Commerce', array['checkout'],
    null, null, 'ip:' || repeat('ef', 32), 'net:' || repeat('12', 32)
  );
  begin
    perform public.update_agent_metadata(
      v_other ->> 'publicId', v_old_token, null, 'Other', 'A sufficiently long description.',
      'https://other.example/agent', 'other.example', 'Commerce', array['checkout'], null
    );
    raise exception 'kya_test_failed: cross-agent credential succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_forbidden' then
        raise exception 'kya_test_failed: cross-agent got %', sqlerrm;
      end if;
  end;

  v_rotated := public.rotate_management_credential(v_public, v_old_token, null);
  v_token := v_rotated ->> 'managementToken';
  perform pg_temp.ok(
    v_token is not null
    and public.kya_sha256_hex(v_token) = (
      select token_hash
      from public.agent_management_credentials as credential
      join public.agents as agent on agent.id = credential.agent_id
      where agent.public_id = v_public and credential.revoked_at is null
    ),
    'rotation'
  );
  begin
    perform public.rotate_management_credential(v_public, v_old_token, null);
    raise exception 'kya_test_failed: revoked credential succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unauthorized' then
        raise exception 'kya_test_failed: revoked credential got %', sqlerrm;
      end if;
  end;
  begin
    perform public.rotate_management_credential(v_other ->> 'publicId', null, null);
    raise exception 'kya_test_failed: unauthenticated reissue succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unauthorized' then
        raise exception 'kya_test_failed: reissue got %', sqlerrm;
      end if;
  end;

  v_issue := public.issue_dns_challenge(v_public, v_token, null, 'dns_txt');
  perform pg_temp.ok(
    v_issue ->> 'txtName' = '_kya-challenge.c1.example'
    and v_issue ->> 'publishedToken' is not null
    and position(v_issue ->> 'publishedToken' in (
      select string_agg(metadata::text, '') from public.agent_events
    )) = 0,
    'challenge issue'
  );
  begin
    perform public.issue_dns_challenge(v_public, v_token, null, 'http_well_known');
    raise exception 'kya_test_failed: http challenge accepted';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_not_implemented' then
        raise exception 'kya_test_failed: http challenge got %', sqlerrm;
      end if;
  end;

  v_complete := public.complete_dns_challenge(
    v_public, v_token, null, (v_issue ->> 'challengeId')::uuid, array['not-the-token']
  );
  perform pg_temp.ok(
    v_complete ->> 'error' = 'kya_challenge_mismatch'
    and (select domain_verification from public.agents where public_id = v_public) = 'unverified'
    and (select status from public.verification_challenges where id = (v_issue ->> 'challengeId')::uuid) = 'pending'
    and (
      select hits from public.request_windows
      where subject = 'agent:' || (select id::text from public.agents where public_id = v_public)
        and action = 'challenge_complete'
    ) = 1,
    'mismatch'
  );
  v_complete := public.complete_dns_challenge(
    v_public, v_token, null, (v_issue ->> 'challengeId')::uuid, array[v_issue ->> 'publishedToken']
  );
  perform pg_temp.ok(
    v_complete ->> 'domainVerification' = 'verified'
    and not (v_complete ? 'managementToken')
    and (select count(*) from public.verification_evidence) = 1
    and (
      select hits from public.request_windows
      where subject = 'agent:' || (select id::text from public.agents where public_id = v_public)
        and action = 'challenge_complete'
    ) = 2,
    'verification pass'
  );
  v_complete := public.complete_dns_challenge(
    v_public, v_token, null, (v_issue ->> 'challengeId')::uuid, array[v_issue ->> 'publishedToken']
  );
  perform pg_temp.ok(
    v_complete ->> 'error' = 'kya_challenge_consumed'
    and (select count(*) from public.verification_evidence) = 1
    and (
      select hits from public.request_windows
      where subject = 'agent:' || (select id::text from public.agents where public_id = v_public)
        and action = 'challenge_complete'
    ) = 3,
    'challenge reuse'
  );
  v_before := (
    select hits from public.request_windows
    where subject = 'agent:' || (select id::text from public.agents where public_id = v_public)
      and action = 'challenge_complete'
  );
  v_complete := public.complete_dns_challenge(
    v_public, v_token, null, '22222222-2222-4222-8222-222222222222'::uuid, array['not-the-token']
  );
  perform pg_temp.ok(
    v_complete ->> 'error' = 'kya_not_found'
    and (
      select hits from public.request_windows
      where subject = 'agent:' || (select id::text from public.agents where public_id = v_public)
        and action = 'challenge_complete'
    ) = v_before + 1,
    'unknown challenge counts'
  );

  v_shared := public.register_agent(
    'Shared', 'A sufficiently long description.',
    'https://c1.example/shared', 'c1.example', 'Research', array['summarize'],
    null, null, 'ip:' || repeat('78', 32), 'net:' || repeat('90', 32)
  );
  v_issue := public.issue_dns_challenge(
    v_shared ->> 'publicId', v_shared ->> 'managementToken', null, 'dns_txt'
  );
  v_complete := public.complete_dns_challenge(
    v_shared ->> 'publicId',
    v_shared ->> 'managementToken',
    null,
    (v_issue ->> 'challengeId')::uuid,
    array[v_issue ->> 'publishedToken']
  );
  perform pg_temp.ok(v_complete ->> 'domainVerification' = 'verified', 'second host verification');
  perform pg_temp.ok((
    select count(*) = 2
    from public.agents
    where claimed_host = 'c1.example' and domain_verification = 'verified' and lifecycle = 'active'
  ), 'same host');
  v_search := public.search_public_agents(null, null, null, 50);
  perform pg_temp.ok(
    jsonb_array_length(v_search -> 'agents') = 2
    and (v_search -> 'agents') @> jsonb_build_array(jsonb_build_object('publicId', v_public))
    and not exists (
      select 1 from jsonb_array_elements(v_search -> 'agents') as item
      where item ->> 'domainVerification' is distinct from 'verified'
         or item ->> 'lifecycle' is distinct from 'active'
    ),
    'verified search'
  );

  v_issue := public.issue_dns_challenge(
    v_shared ->> 'publicId', v_shared ->> 'managementToken', null, 'dns_txt'
  );
  insert into kya_fix (slot, public_id, token, challenge_id, published)
  values
    ('primary', v_public, v_token, null, null),
    ('other', v_other ->> 'publicId', v_other ->> 'managementToken', null, null),
    ('shared', v_shared ->> 'publicId', v_shared ->> 'managementToken', (v_issue ->> 'challengeId')::uuid, v_issue ->> 'publishedToken');
end
$main$;

savepoint clock_check;
create or replace function public.kya_now()
returns timestamptz
language sql
volatile
set search_path = pg_catalog
as $clock$
  select timestamptz '2099-01-01 00:00:00+00';
$clock$;

do $clock$
declare
  v_public text;
  v_token text;
  v_lookup jsonb;
  v_search jsonb;
begin
  select public_id, token into v_public, v_token from kya_fix where slot = 'shared';
  v_lookup := public.lookup_public_agent(v_public);
  v_search := public.search_public_agents(null, null, null, 20);
  perform pg_temp.ok(
    v_lookup ->> 'domainVerification' = 'expired'
    and (select domain_verification from public.agents where public_id = v_public) = 'verified'
    and jsonb_array_length(v_search -> 'agents') = 0,
    'clock expiry'
  );
  perform public.update_agent_metadata(
    v_public, v_token, null, 'Shared', 'A sufficiently long description.',
    'https://c1.example/shared', 'c1.example', 'Research', array['summarize'], null
  );
end
$clock$;

rollback to savepoint clock_check;

savepoint expire_challenge;
create or replace function public.kya_now()
returns timestamptz
language sql
volatile
set search_path = pg_catalog
as $clock$
  select timestamptz '2099-01-01 00:00:00+00';
$clock$;

do $expired$
declare
  v_row kya_fix%rowtype;
  v_complete jsonb;
begin
  select * into v_row from kya_fix where slot = 'shared';
  v_complete := public.complete_dns_challenge(
    v_row.public_id, v_row.token, null, v_row.challenge_id, array[v_row.published]
  );
  perform pg_temp.ok(
    v_complete ->> 'error' = 'kya_challenge_expired'
    and (select status from public.verification_challenges where id = v_row.challenge_id) = 'expired',
    'expired challenge'
  );
end
$expired$;

rollback to savepoint expire_challenge;

alter table public.agent_management_credentials disable trigger credentials_guard;
update public.agent_management_credentials as credential
set expires_at = current_timestamp - interval '1 minute'
from public.agents as agent
join kya_fix as fix on fix.public_id = agent.public_id and fix.slot = 'other'
where agent.id = credential.agent_id and credential.revoked_at is null;
alter table public.agent_management_credentials enable trigger credentials_guard;

do $lifecycle$
declare
  v_primary kya_fix%rowtype;
  v_other kya_fix%rowtype;
  v_shared kya_fix%rowtype;
  v_lookup jsonb;
  v_keys text[];
  v_before integer;
begin
  select * into v_primary from kya_fix where slot = 'primary';
  select * into v_other from kya_fix where slot = 'other';
  select * into v_shared from kya_fix where slot = 'shared';

  begin
    perform public.update_agent_metadata(
      v_other.public_id, v_other.token, null, 'Other', 'A sufficiently long description.',
      'https://other.example/agent', 'other.example', 'Commerce', array['checkout'], null
    );
    raise exception 'kya_test_failed: expired credential succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unauthorized' then
        raise exception 'kya_test_failed: expired credential got %', sqlerrm;
      end if;
  end;

  perform public.set_lifecycle(v_shared.public_id, v_shared.token, null, 'suspend');
  v_lookup := public.lookup_public_agent(v_shared.public_id);
  select array_agg(key order by key) into v_keys from jsonb_object_keys(v_lookup) as key;
  perform pg_temp.ok(
    v_keys = array['identityUrl', 'lifecycle', 'publicId', 'registered']::text[]
    and v_lookup ->> 'lifecycle' = 'suspended'
    and jsonb_array_length(public.search_public_agents(null, null, null, 20) -> 'agents') = 1,
    'suspended tombstone'
  );
  perform public.set_lifecycle(v_shared.public_id, v_shared.token, null, 'reinstate');
  perform pg_temp.ok(
    public.lookup_public_agent(v_shared.public_id) ->> 'domainVerification' = 'verified',
    'reinstate'
  );

  perform public.update_agent_metadata(
    v_primary.public_id, v_primary.token, null, 'Agent 1', 'A sufficiently long description.',
    'https://moved.example/agent', 'moved.example', 'Research', array['search'], null
  );
  perform pg_temp.ok(
    (select domain_verification from public.agents where public_id = v_primary.public_id) = 'unverified'
    and (select verified_host from public.agents where public_id = v_primary.public_id) is null
    and not exists (
      select 1
      from public.verification_evidence as evidence
      join public.agents as agent on agent.id = evidence.agent_id
      where agent.public_id = v_primary.public_id and evidence.revoked_at is null
    ),
    'host change'
  );

  v_lookup := public.set_lifecycle(v_primary.public_id, v_primary.token, null, 'revoke');
  select array_agg(key order by key) into v_keys from jsonb_object_keys(v_lookup) as key;
  perform pg_temp.ok(
    v_keys = array['identityUrl', 'lifecycle', 'publicId', 'registered']::text[]
    and v_lookup ->> 'lifecycle' = 'revoked'
    and not (
      public.search_public_agents(null, null, null, 20) -> 'agents'
      @> jsonb_build_array(jsonb_build_object('publicId', v_primary.public_id))
    ),
    'revoked tombstone'
  );

  begin
    perform public.kya_begin_write();
    insert into public.agents (
      public_id, name, description, endpoint_url, claimed_host, category, capabilities
    ) values (
      v_primary.public_id, 'Copy', 'A sufficiently long description.',
      'https://copy.example/agent', 'copy.example', 'Research', array['search']
    );
    execute 'reset role';
    raise exception 'kya_test_failed: revoked public id was reused';
  exception
    when unique_violation then
      execute 'reset role';
  end;

  v_before := (select count(*) from public.agents);
  begin
    delete from public.rate_limit_policies where action = 'register';
    perform public.register_agent(
      'Unavailable', 'A sufficiently long description.',
      'https://unavailable.example/agent', 'unavailable.example', 'Operations', array['monitoring'],
      null, null, 'ip:' || repeat('cc', 32), 'net:' || repeat('dd', 32)
    );
    raise exception 'kya_test_failed: missing policy was ignored';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unavailable' then
        raise exception 'kya_test_failed: missing policy got %', sqlerrm;
      end if;
  end;
  perform pg_temp.ok(
    (select count(*) from public.agents) = v_before
    and exists (select 1 from public.rate_limit_policies where action = 'register'),
    'unavailable registration'
  );
end
$lifecycle$;

savepoint credential_failure;
revoke insert on public.agent_management_credentials from kya_writer;

do $atomic$
declare
  v_before integer;
begin
  v_before := (select count(*) from public.agents);
  begin
    perform public.register_agent(
      'Atomic', 'A sufficiently long description.',
      'https://atomic.example/agent', 'atomic.example', 'Operations', array['monitoring'],
      null, null, 'ip:' || repeat('aa', 32), 'net:' || repeat('bb', 32)
    );
    raise exception 'kya_test_failed: credential failure was ignored';
  exception
    when insufficient_privilege then
      null;
  end;
  perform pg_temp.ok((select count(*) from public.agents) = v_before, 'atomic credential');
end
$atomic$;

rollback to savepoint credential_failure;

savepoint collision_check;
create or replace function public.kya_new_public_id()
returns text
language plpgsql
volatile
set search_path = pg_catalog
as $id$
declare
  n integer;
begin
  n := coalesce(nullif(current_setting('kya.test_id_n', true), ''), '0')::integer + 1;
  perform set_config('kya.test_id_n', n::text, true);
  if n < 3 then
    return 'kya_' || repeat('0', 26);
  end if;
  return 'kya_' || public.kya_encode_crockford(extensions.gen_random_bytes(16));
end
$id$;

do $collision$
declare
  v_result jsonb;
begin
  perform set_config('kya.test_id_n', '0', true);
  perform public.kya_begin_write();
  insert into public.agents (
    public_id, name, description, endpoint_url, claimed_host, category, capabilities
  ) values (
    'kya_' || repeat('0', 26),
    'Reserved',
    'A sufficiently long description.',
    'https://reserved.example/agent',
    'reserved.example',
    'Research',
    array['search']
  );
  execute 'reset role';
  v_result := public.register_agent(
    'Retry', 'A sufficiently long description.',
    'https://retry.example/agent', 'retry.example', 'Developer tools', array['code-review'],
    null, null, 'ip:' || repeat('ee', 32), 'net:' || repeat('ff', 32)
  );
  perform pg_temp.ok(
    v_result ->> 'publicId' <> ('kya_' || repeat('0', 26))
    and v_result ->> 'publicId' ~ '^kya_[0-9a-hjkmnp-tv-z]{26}$',
    'collision retry'
  );
exception
  when others then
    execute 'reset role';
    raise;
end
$collision$;

rollback to savepoint collision_check;

do $owners$
declare
  v_owner uuid := '11111111-1111-4111-8111-111111111111';
  v_other_user uuid := '22222222-2222-4222-8222-222222222222';
  v_shared kya_fix%rowtype;
  v_col record;
  v_cols text := '';
  v_vals text := '';
  v_expr text;
  v_result jsonb;
  v_rotated jsonb;
  v_owned jsonb;
  v_hash text;
begin
  for v_col in
    select column_name, udt_name
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and is_nullable = 'NO'
      and column_default is null
    order by ordinal_position
  loop
    v_expr := case
      when v_col.column_name = 'id' then quote_literal(v_owner::text) || '::uuid'
      when v_col.column_name = 'email' then quote_literal('kya-owner@example.com')
      when v_col.udt_name = 'uuid' then quote_literal('00000000-0000-0000-0000-000000000000') || '::uuid'
      when v_col.udt_name in ('text', 'varchar', 'citext') then quote_literal('kya-test')
      when v_col.udt_name = 'bool' then 'false'
      when v_col.udt_name in ('int2', 'int4', 'int8') then '0'
      when v_col.udt_name in ('json', 'jsonb') then '''{}''::jsonb'
      when v_col.udt_name in ('timestamptz', 'timestamp') then 'now()'
      else null
    end;
    if v_expr is null then
      raise exception 'kya_test_failed: unsupported auth.users column %', v_col.column_name;
    end if;
    v_cols := v_cols || quote_ident(v_col.column_name) || ',';
    v_vals := v_vals || v_expr || ',';
  end loop;

  if v_cols = '' then
    execute 'insert into auth.users (id, email) values ($1, $2)'
      using v_owner, 'kya-owner@example.com';
    execute 'insert into auth.users (id, email) values ($1, $2)'
      using v_other_user, 'kya-other@example.com';
  else
    execute 'insert into auth.users (' || rtrim(v_cols, ',') || ') values (' || rtrim(v_vals, ',') || ')';
    execute 'insert into auth.users (' || rtrim(v_cols, ',') || ') values (' || rtrim(
      replace(
        replace(v_vals, quote_literal(v_owner::text), quote_literal(v_other_user::text)),
        quote_literal('kya-owner@example.com'),
        quote_literal('kya-other@example.com')
      ),
      ','
    ) || ')';
  end if;

  v_result := public.register_agent(
    'Owned', 'A sufficiently long description.',
    'https://owned.example/agent', 'owned.example', 'Research', array['search'],
    null, v_owner, 'ip:' || repeat('a1', 32), 'net:' || repeat('b2', 32)
  );
  perform pg_temp.ok(
    (select owner_user_id from public.agents where public_id = v_result ->> 'publicId') = v_owner,
    'signed-in registration'
  );
  v_rotated := public.rotate_management_credential(v_result ->> 'publicId', null, v_owner);
  perform pg_temp.ok(v_rotated ->> 'managementToken' is not null, 'owner recovery');
  begin
    perform public.rotate_management_credential(v_result ->> 'publicId', null, null);
    raise exception 'kya_test_failed: unauthenticated reissue after association succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unauthorized' then
        raise exception 'kya_test_failed: associated reissue got %', sqlerrm;
      end if;
  end;

  select * into v_shared from kya_fix where slot = 'shared';
  perform pg_temp.ok(
    public.associate_agent_owner(v_shared.public_id, v_shared.token, v_owner) ->> 'ownerAssociated' = 'true'
    and (select owner_user_id from public.agents where public_id = v_shared.public_id) = v_owner,
    'association'
  );
  perform pg_temp.ok(
    public.associate_agent_owner(v_shared.public_id, v_shared.token, v_owner) ->> 'ownerAssociated' = 'true',
    'repeat association'
  );
  begin
    perform public.associate_agent_owner(v_shared.public_id, v_shared.token, v_other_user);
    raise exception 'kya_test_failed: takeover succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_conflict' then
        raise exception 'kya_test_failed: takeover got %', sqlerrm;
      end if;
  end;
  begin
    perform public.associate_agent_owner(
      (select public_id from kya_fix where slot = 'other'), null, v_owner
    );
    raise exception 'kya_test_failed: association without bearer succeeded';
  exception
    when raise_exception then
      if sqlerrm is distinct from 'kya_unauthorized' then
        raise exception 'kya_test_failed: bearerless association got %', sqlerrm;
      end if;
  end;

  execute 'set local role service_role';
  v_owned := public.list_owned_agents(v_owner);
  execute 'reset role';
  select token_hash into v_hash
  from public.agent_management_credentials
  where revoked_at is null
  limit 1;
  perform pg_temp.ok(
    jsonb_array_length(v_owned) >= 1
    and position(v_hash in v_owned::text) = 0
    and v_owned::text !~ '"token_hash"',
    'owned list'
  );
exception
  when others then
    execute 'reset role';
    raise;
end
$owners$;

rollback;
