create table if not exists private.jira_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  base_url text not null check (base_url ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/?$'),
  account_email text not null check (position('@' in account_email) > 1),
  token_secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.jira_credentials enable row level security;
revoke all on table private.jira_credentials from public, anon, authenticated;

create or replace function public.save_jira_credentials(
  target_user_id uuid,
  jira_base_url text,
  jira_email text,
  jira_api_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_url text := rtrim(trim(jira_base_url), '/');
  normalized_email text := lower(trim(jira_email));
  normalized_token text := trim(jira_api_token);
  existing_secret_id uuid;
  saved_secret_id uuid;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception 'Bu işlem yalnızca güvenli JIRA servisi tarafından çağrılabilir.';
  end if;
  if target_user_id is null or not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Geçerli bir Supabase kullanıcısı bulunamadı.';
  end if;
  if normalized_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' then
    raise exception 'JIRA adresi geçerli bir HTTPS origin olmalıdır.';
  end if;
  if position('@' in normalized_email) <= 1 or char_length(normalized_email) > 254 then
    raise exception 'JIRA e-posta adresi geçersiz.';
  end if;
  if char_length(normalized_token) < 20 or char_length(normalized_token) > 4096 then
    raise exception 'JIRA API tokenı geçersiz.';
  end if;

  select token_secret_id into existing_secret_id
  from private.jira_credentials
  where user_id = target_user_id;

  if existing_secret_id is null then
    saved_secret_id := vault.create_secret(
      normalized_token,
      'jira_api_token_' || target_user_id::text,
      'Günlük Efor Takibi kullanıcısına ait JIRA API tokenı'
    );
  else
    perform vault.update_secret(
      existing_secret_id,
      normalized_token,
      'jira_api_token_' || target_user_id::text,
      'Günlük Efor Takibi kullanıcısına ait JIRA API tokenı'
    );
    saved_secret_id := existing_secret_id;
  end if;

  insert into private.jira_credentials (user_id, base_url, account_email, token_secret_id)
  values (target_user_id, normalized_url, normalized_email, saved_secret_id)
  on conflict (user_id) do update
    set base_url = excluded.base_url,
        account_email = excluded.account_email,
        token_secret_id = excluded.token_secret_id,
        updated_at = now();

  return jsonb_build_object('configured', true, 'baseUrl', normalized_url, 'email', normalized_email);
end;
$$;

create or replace function public.get_jira_credentials(target_user_id uuid)
returns table(base_url text, account_email text, api_token text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select credentials.base_url,
         credentials.account_email,
         secrets.decrypted_secret,
         credentials.updated_at
  from private.jira_credentials credentials
  join vault.decrypted_secrets secrets on secrets.id = credentials.token_secret_id
  where credentials.user_id = target_user_id
    and current_user in ('postgres', 'service_role');
$$;

create or replace function public.delete_jira_credentials(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_secret_id uuid;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception 'Bu işlem yalnızca güvenli JIRA servisi tarafından çağrılabilir.';
  end if;
  delete from private.jira_credentials
  where user_id = target_user_id
  returning token_secret_id into existing_secret_id;
  if existing_secret_id is not null then
    delete from vault.secrets where id = existing_secret_id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.save_jira_credentials(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.get_jira_credentials(uuid) from public, anon, authenticated;
revoke all on function public.delete_jira_credentials(uuid) from public, anon, authenticated;
grant execute on function public.save_jira_credentials(uuid, text, text, text) to service_role;
grant execute on function public.get_jira_credentials(uuid) to service_role;
grant execute on function public.delete_jira_credentials(uuid) to service_role;
