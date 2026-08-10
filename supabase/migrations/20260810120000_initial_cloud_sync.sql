create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  email_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'leader', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.efforts (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 160),
  created_by uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.tasks (like public.efforts including defaults including constraints);
alter table public.tasks add primary key (organization_id, id);
alter table public.tasks add constraint tasks_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.tasks add constraint tasks_created_by_fkey foreign key (created_by) references auth.users(id) on delete cascade;

create table public.people (like public.efforts including defaults including constraints);
alter table public.people add primary key (organization_id, id);
alter table public.people add constraint people_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.people add constraint people_created_by_fkey foreign key (created_by) references auth.users(id) on delete cascade;

create table public.jira_items (like public.efforts including defaults including constraints);
alter table public.jira_items add primary key (organization_id, id);
alter table public.jira_items add constraint jira_items_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.jira_items add constraint jira_items_created_by_fkey foreign key (created_by) references auth.users(id) on delete cascade;

create table public.reminders (like public.efforts including defaults including constraints);
alter table public.reminders add primary key (organization_id, id);
alter table public.reminders add constraint reminders_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.reminders add constraint reminders_created_by_fkey foreign key (created_by) references auth.users(id) on delete cascade;

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id);
create index organizations_created_by_idx on public.organizations(created_by);
create index user_settings_organization_id_idx on public.user_settings(organization_id);
create index efforts_created_by_idx on public.efforts(created_by);
create index tasks_created_by_idx on public.tasks(created_by);
create index people_created_by_idx on public.people(created_by);
create index jira_items_created_by_idx on public.jira_items(created_by);
create index reminders_created_by_idx on public.reminders(created_by);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_org_leader(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role in ('owner', 'leader')
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.is_org_leader(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_leader(uuid) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
  organization_name text;
begin
  organization_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Kişisel Çalışma Alanı'
  );

  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1))
  );

  insert into public.organizations (name, created_by)
  values (organization_name || ' Çalışma Alanı', new.id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, new.id, 'owner');

  insert into public.user_settings (user_id, organization_id)
  values (new.id, new_organization_id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute procedure private.set_updated_at();
create trigger organization_members_set_updated_at before update on public.organization_members for each row execute procedure private.set_updated_at();
create trigger efforts_set_updated_at before update on public.efforts for each row execute procedure private.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute procedure private.set_updated_at();
create trigger people_set_updated_at before update on public.people for each row execute procedure private.set_updated_at();
create trigger jira_items_set_updated_at before update on public.jira_items for each row execute procedure private.set_updated_at();
create trigger reminders_set_updated_at before update on public.reminders for each row execute procedure private.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute procedure private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.efforts enable row level security;
alter table public.tasks enable row level security;
alter table public.people enable row level security;
alter table public.jira_items enable row level security;
alter table public.reminders enable row level security;
alter table public.user_settings enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy organizations_select_member on public.organizations for select to authenticated using ((select private.is_org_member(id)));
create policy organizations_update_leader on public.organizations for update to authenticated using ((select private.is_org_leader(id))) with check ((select private.is_org_leader(id)));
create policy organizations_delete_owner on public.organizations for delete to authenticated using (
  exists (
    select 1 from public.organization_members membership
    where membership.organization_id = organizations.id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
  )
);

create policy organization_members_select_member on public.organization_members for select to authenticated using ((select private.is_org_member(organization_id)));
create policy organization_members_insert_leader on public.organization_members for insert to authenticated with check ((select private.is_org_leader(organization_id)));
create policy organization_members_update_leader on public.organization_members for update to authenticated using ((select private.is_org_leader(organization_id))) with check ((select private.is_org_leader(organization_id)));
create policy organization_members_delete_leader on public.organization_members for delete to authenticated using ((select private.is_org_leader(organization_id)));

do $$
declare
  table_name text;
begin
  foreach table_name in array array['efforts', 'tasks', 'people', 'jira_items', 'reminders']
  loop
    execute format('create policy %1$s_select_member on public.%1$I for select to authenticated using ((select private.is_org_member(organization_id)))', table_name);
    execute format('create policy %1$s_insert_member on public.%1$I for insert to authenticated with check (created_by = (select auth.uid()) and (select private.is_org_member(organization_id)))', table_name);
    execute format('create policy %1$s_update_owner_or_leader on public.%1$I for update to authenticated using (created_by = (select auth.uid()) or (select private.is_org_leader(organization_id))) with check (created_by = (select auth.uid()) or (select private.is_org_leader(organization_id)))', table_name);
    execute format('create policy %1$s_delete_owner_or_leader on public.%1$I for delete to authenticated using (created_by = (select auth.uid()) or (select private.is_org_leader(organization_id)))', table_name);
  end loop;
end;
$$;

create policy user_settings_select_own on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy user_settings_insert_own on public.user_settings for insert to authenticated with check (user_id = (select auth.uid()) and (select private.is_org_member(organization_id)));
create policy user_settings_update_own on public.user_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select private.is_org_member(organization_id)));

revoke all on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.efforts,
  public.tasks,
  public.people,
  public.jira_items,
  public.reminders,
  public.user_settings
from anon, authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.efforts,
  public.tasks,
  public.people,
  public.jira_items,
  public.reminders,
  public.user_settings
to authenticated;
