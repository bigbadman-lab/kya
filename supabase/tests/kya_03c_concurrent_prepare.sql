set role kya_writer;
delete from public.request_windows
where action = 'register'
  and window_start = public.kya_hour_start()
  and subject in (
    'global',
    'ip:' || repeat('ab', 32),
    'net:' || repeat('cd', 32)
  );
reset role;
