-- Committed registration. Invoked only by supabase/tests/run_concurrent.sh.
-- One session notices kya_concurrent_ok. The other notices kya_concurrent_limited.
-- The management token is checked and then discarded. It is not printed.

do $concurrent$
declare
  v_result jsonb;
begin
  v_result := public.register_agent(
    'KYA concurrent test',
    'A sufficiently long description.',
    'https://concurrent.example/agent',
    'concurrent.example',
    'Research',
    array['search'],
    null,
    null,
    'ip:' || repeat('ab', 32),
    'net:' || repeat('cd', 32)
  );
  if v_result ->> 'publicId' !~ '^kya_[0-9a-hjkmnp-tv-z]{25}[048cgmrw]$' then
    raise exception 'kya_test_failed: concurrent id shape';
  end if;
  if v_result ->> 'managementToken' is null
     or left(v_result ->> 'managementToken', 9) <> 'kya_mgmt_' then
    raise exception 'kya_test_failed: concurrent missing token';
  end if;
  raise notice 'kya_concurrent_ok';
exception
  when raise_exception then
    if sqlerrm = 'kya_rate_limited' then
      raise notice 'kya_concurrent_limited';
    else
      raise exception 'kya_test_failed: %', sqlerrm;
    end if;
end
$concurrent$;
