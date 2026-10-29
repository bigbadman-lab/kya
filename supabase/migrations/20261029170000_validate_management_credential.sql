-- Read-only management credential check.
-- Hashes the presented token, compares it with the stored hash, and returns
-- only the public id, lifecycle, and credential prefix. It does not call
-- kya_begin_write and does not update last_used_at, events, challenges, or
-- lifecycle. transaction_read_only makes a later write fail closed.

create function public.validate_management_credential(
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
begin
  perform set_config('transaction_read_only', 'on', true);

  if p_public_id is null or p_public_id !~ '^kya_[0-9a-hjkmnp-tv-z]{26}$' then
    perform public.kya_fail('kya_not_found');
  end if;

  select id, lifecycle
  into v_id, v_lifecycle
  from public.agents
  where public_id = p_public_id;

  if not found then
    perform public.kya_fail('kya_not_found');
  end if;
  if v_lifecycle = 'revoked' then
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
  if v_lifecycle not in ('active', 'suspended')
     or v_prefix is null
     or v_prefix !~ '^kya_mgmt_[0-9a-hjkmnp-tv-z]{8}$' then
    perform public.kya_fail('kya_unavailable');
  end if;

  return jsonb_build_object(
    'publicId', p_public_id,
    'lifecycle', v_lifecycle,
    'credentialPrefix', v_prefix,
    'credentialValid', true
  );
end
$fn$;

revoke all on function public.validate_management_credential(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.validate_management_credential(text, text) to service_role;

comment on function public.validate_management_credential(text, text) is
  'Read-only management credential check. Hashes the presented token. Returns the public id, lifecycle, and prefix. EXECUTE is granted only to service_role.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values (
  '20261029170000',
  'validate_management_credential',
  array['validate_management_credential(text, text)']
);
