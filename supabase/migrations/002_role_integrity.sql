-- NOWOORK · Role integrity repair
-- Ejecutar una sola vez en nowoork-staging después de 001_core.sql.
-- Corrige cuentas creadas con rol empresa que hayan quedado como solucionador
-- y endurece el trigger para futuras altas.

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
  requested_role := case
    when lower(coalesce(new.raw_user_meta_data->>'primary_role', '')) = 'company'
      then 'company'::public.nowoork_role
    else 'solver'::public.nowoork_role
  end;

  insert into public.profiles (id, email, full_name, primary_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    requested_role
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    primary_role = excluded.primary_role,
    updated_at = now();

  delete from public.profile_roles where user_id = new.id and role <> requested_role;

  insert into public.profile_roles (user_id, role)
  values (new.id, requested_role)
  on conflict do nothing;

  if requested_role = 'solver' then
    insert into public.solver_profiles (user_id, headline)
    values (new.id, nullif(new.raw_user_meta_data->>'sub_specialty', ''))
    on conflict (user_id) do nothing;

    select id into specialty_uuid
    from public.specialties
    where slug = coalesce(nullif(new.raw_user_meta_data->>'specialty_slug', ''), 'marketing')
    limit 1;

    if specialty_uuid is not null then
      insert into public.profile_specialties (user_id, specialty_id, is_primary)
      values (new.id, specialty_uuid, true)
      on conflict (user_id, specialty_id) do update set is_primary = true;
    end if;
  else
    delete from public.profile_specialties where user_id = new.id;
    delete from public.solver_profiles where user_id = new.id;

    select cm.company_id into company_uuid
    from public.company_members cm
    where cm.user_id = new.id
    limit 1;

    if company_uuid is null then
      safe_company_slug := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'company_name', ''), 'empresa'), '[^a-zA-Z0-9]+', '-', 'g'));
      safe_company_slug := trim(both '-' from safe_company_slug) || '-' || left(replace(new.id::text, '-', ''), 8);

      insert into public.companies (name, slug, sector, created_by)
      values (
        coalesce(nullif(new.raw_user_meta_data->>'company_name', ''), 'Mi empresa'),
        safe_company_slug,
        nullif(new.raw_user_meta_data->>'sector', ''),
        new.id
      )
      returning id into company_uuid;

      insert into public.company_members (company_id, user_id, role)
      values (company_uuid, new.id, 'owner')
      on conflict (company_id, user_id) do update set role = 'owner';
    end if;
  end if;

  return new;
end;
$$;

-- Repara perfiles faltantes o con rol incorrecto usando los metadatos originales
-- capturados durante el registro.
insert into public.profiles (id, email, full_name, primary_role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  case
    when lower(coalesce(u.raw_user_meta_data->>'primary_role', '')) = 'company'
      then 'company'::public.nowoork_role
    else 'solver'::public.nowoork_role
  end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  primary_role = excluded.primary_role,
  updated_at = now();

-- Mantiene exactamente un rol principal por cuenta en esta etapa del producto.
delete from public.profile_roles pr
using auth.users u
where pr.user_id = u.id
  and pr.role <> case
    when lower(coalesce(u.raw_user_meta_data->>'primary_role', '')) = 'company'
      then 'company'::public.nowoork_role
    else 'solver'::public.nowoork_role
  end;

insert into public.profile_roles (user_id, role)
select
  u.id,
  case
    when lower(coalesce(u.raw_user_meta_data->>'primary_role', '')) = 'company'
      then 'company'::public.nowoork_role
    else 'solver'::public.nowoork_role
  end
from auth.users u
on conflict do nothing;

-- Las cuentas empresa no deben conservar artefactos de solucionador.
delete from public.profile_specialties ps
using public.profiles p
where ps.user_id = p.id
  and p.primary_role = 'company';

delete from public.solver_profiles sp
using public.profiles p
where sp.user_id = p.id
  and p.primary_role = 'company';

-- Crea empresa para cualquier cuenta company que todavía no tenga membresía.
insert into public.companies (name, slug, sector, created_by)
select
  coalesce(nullif(u.raw_user_meta_data->>'company_name', ''), 'Mi empresa'),
  trim(both '-' from lower(regexp_replace(coalesce(nullif(u.raw_user_meta_data->>'company_name', ''), 'empresa'), '[^a-zA-Z0-9]+', '-', 'g')))
    || '-' || left(replace(u.id::text, '-', ''), 8),
  nullif(u.raw_user_meta_data->>'sector', ''),
  u.id
from auth.users u
join public.profiles p on p.id = u.id
where p.primary_role = 'company'
  and not exists (
    select 1 from public.company_members cm where cm.user_id = u.id
  )
on conflict (slug) do nothing;

insert into public.company_members (company_id, user_id, role)
select c.id, c.created_by, 'owner'::public.company_member_role
from public.companies c
join public.profiles p on p.id = c.created_by
where p.primary_role = 'company'
  and not exists (
    select 1 from public.company_members cm where cm.user_id = c.created_by
  )
on conflict (company_id, user_id) do update set role = 'owner';

-- Asegura perfil solver para cuentas solver que no lo tengan.
insert into public.solver_profiles (user_id, headline)
select
  p.id,
  nullif(u.raw_user_meta_data->>'sub_specialty', '')
from public.profiles p
join auth.users u on u.id = p.id
where p.primary_role = 'solver'
on conflict (user_id) do nothing;
