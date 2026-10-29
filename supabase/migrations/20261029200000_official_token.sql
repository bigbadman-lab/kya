-- Official Solana token mint shown on the homepage.
-- Public callers can read it. Only the service role can replace it.

create table public.official_token (
  singleton boolean primary key default true check (singleton),
  mint text not null,
  updated_at timestamptz not null,
  constraint official_token_mint_chk check (
    char_length(mint) between 32 and 44
    and mint ~ '^[1-9A-HJ-NP-Za-km-z]+$'
  )
);

alter table public.official_token enable row level security;
alter table public.official_token force row level security;

revoke all on table public.official_token from public, anon, authenticated, service_role;

create function public.lookup_official_token()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select mint from public.official_token where singleton
$$;

create function public.set_official_token(p_mint text)
returns text
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $fn$
begin
  if p_mint is null
     or char_length(p_mint) < 32
     or char_length(p_mint) > 44
     or p_mint !~ '^[1-9A-HJ-NP-Za-km-z]+$' then
    raise exception 'kya_invalid';
  end if;

  insert into public.official_token (singleton, mint, updated_at)
  values (true, p_mint, public.kya_now())
  on conflict (singleton) do update
    set mint = excluded.mint,
        updated_at = excluded.updated_at;
  return p_mint;
end
$fn$;

revoke all on function public.lookup_official_token() from public, anon, authenticated, service_role;
revoke all on function public.set_official_token(text) from public, anon, authenticated, service_role;

grant execute on function public.lookup_official_token() to anon, authenticated, service_role;
grant execute on function public.set_official_token(text) to service_role;

comment on table public.official_token is
  'The one official Solana mint shown on the homepage. Replace it with set_official_token. There is no public write.';
comment on function public.lookup_official_token() is
  'Public read of the official token mint. Null until one is saved.';
comment on function public.set_official_token(text) is
  'Replaces the official token mint. Service role only. The homepage reads the new value without a deploy.';

insert into supabase_migrations.schema_migrations (version, name, statements)
values (
  '20261029200000',
  'official_token',
  array['official_token, lookup_official_token, set_official_token']
);
