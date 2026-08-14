create or replace function private.provision_user_workspace(
  target_user_id uuid,
  target_email text,
  target_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
  display_name text;
  organization_name text;
begin
  if target_user_id is null then
    raise exception 'Geçerli bir kullanıcı kimliği gerekli.';
  end if;

  display_name := coalesce(
    nullif(trim(coalesce(target_metadata, '{}'::jsonb) ->> 'full_name'), ''),
    nullif(split_part(coalesce(target_email, ''), '@', 1), ''),
    'Kullanıcı'
  );
  organization_name := display_name || ' Çalışma Alanı';

  insert into public.profiles (id, email, display_name)
  values (target_user_id, target_email, display_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(nullif(profiles.display_name, ''), excluded.display_name);

  if exists (select 1 from public.user_settings where user_id = target_user_id) then
    return;
  end if;

  insert into public.organizations (name, created_by)
  values (organization_name, target_user_id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, target_user_id, 'owner');

  insert into public.user_settings (user_id, organization_id)
  values (target_user_id, new_organization_id);
end;
$$;

revoke all on function private.provision_user_workspace(uuid, text, jsonb) from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data, '{}'::jsonb) ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Kullanıcı'
    )
  )
  on conflict (id) do update set email = excluded.email;

  if new.email_confirmed_at is not null then
    perform private.provision_user_workspace(new.id, new.email, new.raw_user_meta_data);
  end if;
  return new;
end;
$$;

create or replace function private.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform private.provision_user_workspace(new.id, new.email, new.raw_user_meta_data);
  end if;
  return new;
end;
$$;

revoke all on function private.handle_user_email_confirmed() from public;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute procedure private.handle_user_email_confirmed();

comment on function private.provision_user_workspace(uuid, text, jsonb) is
  'E-posta doğrulaması tamamlanan kullanıcı için kişisel çalışma alanını tek sefer oluşturur.';
