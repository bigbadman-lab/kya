select global_hourly_limit
from public.rate_limit_policies
where action = 'register';
