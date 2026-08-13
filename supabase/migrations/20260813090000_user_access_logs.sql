create table public.user_access_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  signed_in_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  signed_out_at timestamptz,
  ip_address inet,
  user_agent text,
  entry_path text,
  exit_reason text check (exit_reason is null or char_length(exit_reason) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_access_logs_email_length check (char_length(email) between 3 and 320),
  constraint user_access_logs_time_order check (
    last_seen_at >= signed_in_at
    and (signed_out_at is null or signed_out_at >= signed_in_at)
  )
);

create index user_access_logs_user_idx on public.user_access_logs(user_id, signed_in_at desc);
create index user_access_logs_email_idx on public.user_access_logs(lower(email), signed_in_at desc);
create index user_access_logs_signed_in_idx on public.user_access_logs(signed_in_at desc);
create index user_access_logs_active_idx on public.user_access_logs(last_seen_at desc) where signed_out_at is null;

create trigger user_access_logs_set_updated_at
  before update on public.user_access_logs
  for each row execute procedure private.set_updated_at();

alter table public.user_access_logs enable row level security;

create policy user_access_logs_admin_select
on public.user_access_logs
for select
to authenticated
using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'selcuk.dere@fit-global.com');

revoke all on table public.user_access_logs from anon, authenticated;
grant select on table public.user_access_logs to authenticated;

comment on table public.user_access_logs is
  'Uygulama oturumlarının giriş, son görülme, çıkış, IP ve tarayıcı denetim kayıtları.';
comment on column public.user_access_logs.last_seen_at is
  'Ani kapanışlarda yaklaşık oturum süresinin hesaplanması için son heartbeat zamanı.';
