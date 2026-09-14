-- NOWOORK · Core identity schema
-- Ejecutar primero en nowoork-staging.

create extension if not exists pgcrypto;

do $$ begin
  create type public.nowoork_role as enum ('solver', 'company');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.company_member_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  primary_role public.nowoork_role not null default 'solver',
  avatar_url text,
  country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.nowoork_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.specialties(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.solver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  years_experience smallint check (years_experience is null or years_experience between 0 and 70),
  score integer not null default 500 check (score between 0 and 1000),
  decisions_answered integer not null default 0,
  decisions_scored integer not null default 0,
  correct_decisions integer not null default 0,
  precision numeric(5,2) not null default 0 check (precision between 0 and 100),
  earnings_total numeric(14,2) not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_specialties (
  user_id uuid not null references public.profiles(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  is_primary boolean not null default false,
  self_level smallint check (self_level is null or self_level between 1 and 5),
  verified_level numeric(5,2),
  created_at timestamptz not null default now(),
  primary key (user_id, specialty_id)
);

create unique index if not exists profile_specialties_one_primary
  on public.profile_specialties(user_id)
  where is_primary = true;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sector text,
  country_code text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.company_member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

insert into public.specialties (name, slug) values
  ('Marketing', 'marketing'),
  ('E-commerce', 'ecommerce'),
  ('Finanzas', 'finanzas'),
  ('Economía', 'economia'),
  ('Operaciones', 'operaciones'),
  ('Tecnología', 'tecnologia')
on conflict (slug) do update set name = excluded.name, is_active = true;

insert into public.specialties (name, slug, parent_id)
select child.name, child.slug, parent.id
from (values
  ('Meta Ads', 'meta-ads', 'marketing'),
  ('Google Ads', 'google-ads', 'marketing'),
  ('Creativos', 'creativos', 'marketing'),
  ('Conversión', 'conversion', 'ecommerce'),
  ('CRO', 'cro', 'ecommerce'),
  ('Logística', 'logistica', 'operaciones'),
  ('Datos e IA', 'datos-ia', 'tecnologia')
) as child(name, slug, parent_slug)
join public.specialties parent on parent.slug = child.parent_slug
on conflict (slug) do update set name = excluded.name, parent_id = excluded.parent_id, is_active = true;

alter table public.profiles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.specialties enable row level security;
alter table public.solver_profiles enable row level security;
alter table public.profile_specialties enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);

-- Sin UPDATE directo sobre profiles por ahora: los roles del usuario no deben poder alterarse desde el cliente.

drop policy if exists "profile_roles_select_own" on public.profile_roles;
create policy "profile_roles_select_own" on public.profile_roles for select to authenticated using (auth.uid() = user_id);

drop policy if exists "specialties_read" on public.specialties;
create policy "specialties_read" on public.specialties for select to authenticated using (is_active = true);

drop policy if exists "solver_profiles_select_own" on public.solver_profiles;
create policy "solver_profiles_select_own" on public.solver_profiles for select to authenticated using (auth.uid() = user_id);

-- Sin política UPDATE directa en solver_profiles: el score no puede editarse desde el cliente.

drop policy if exists "profile_specialties_select_own" on public.profile_specialties;
create policy "profile_specialties_select_own" on public.profile_specialties for select to authenticated using (auth.uid() = user_id);

drop policy if exists "companies_select_member" on public.companies;
create policy "companies_select_member" on public.companies for select to authenticated using (
  exists (select 1 from public.company_members cm where cm.company_id = id and cm.user_id = auth.uid())
);

drop policy if exists "companies_update_owner_admin" on public.companies;
create policy "companies_update_owner_admin" on public.companies for update to authenticated using (
  exists (select 1 from public.company_members cm where cm.company_id = id and cm.user_id = auth.uid() and cm.role in ('owner','admin'))
) with check (
  exists (select 1 from public.company_members cm where cm.company_id = id and cm.user_id = auth.uid() and cm.role in ('owner','admin'))
);

drop policy if exists "company_members_select_own" on public.company_members;
create policy "company_members_select_own" on public.company_members for select to authenticated using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role public.nowoork_role;
  specialty_uuid uuid;
  company_uuid uuid;
  safe_company_slug text;
begin
  requested_role := case when new.raw_user_meta_data->>'primary_role' = 'company' then 'company'::public.nowoork_role else 'solver'::public.nowoork_role end;

  insert into public.profiles (id, email, full_name, primary_role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), requested_role)
  on conflict (id) do nothing;

  insert into public.profile_roles (user_id, role)
  values (new.id, requested_role)
  on conflict do nothing;

  if requested_role = 'solver' then
    insert into public.solver_profiles (user_id, headline)
    values (new.id, nullif(new.raw_user_meta_data->>'sub_specialty', ''))
    on conflict do nothing;

    select id into specialty_uuid
    from public.specialties
    where slug = coalesce(new.raw_user_meta_data->>'specialty_slug', 'marketing')
    limit 1;

    if specialty_uuid is not null then
      insert into public.profile_specialties (user_id, specialty_id, is_primary)
      values (new.id, specialty_uuid, true)
      on conflict (user_id, specialty_id) do update set is_primary = true;
    end if;
  else
    safe_company_slug := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'company_name', 'empresa'), '[^a-zA-Z0-9]+', '-', 'g'));
    safe_company_slug := trim(both '-' from safe_company_slug) || '-' || left(replace(new.id::text, '-', ''), 8);

    insert into public.companies (name, slug, sector, created_by)
    values (
      coalesce(nullif(new.raw_user_meta_data->>'company_name', ''), 'Mi empresa'),
      safe_company_slug,
      nullif(new.raw_user_meta_data->>'sector', ''),
      new.id
    ) returning id into company_uuid;

    insert into public.company_members (company_id, user_id, role)
    values (company_uuid, new.id, 'owner');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
