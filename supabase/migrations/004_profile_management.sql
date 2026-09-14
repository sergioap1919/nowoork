-- NOWOORK · ZIP 01 · Profile management foundation
-- Ejecutar en nowoork-staging después de 003_data_api_permissions.sql.
-- Objetivo: permitir editar únicamente campos de perfil seguros sin exponer rol, score ni métricas sensibles.

create or replace function public.update_my_solver_profile(
  p_full_name text,
  p_headline text,
  p_years_experience smallint,
  p_specialty_slug text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  specialty_uuid uuid;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = uid and primary_role = 'solver'
  ) then
    raise exception 'SOLVER_ROLE_REQUIRED';
  end if;

  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'INVALID_FULL_NAME';
  end if;

  if p_years_experience is not null and (p_years_experience < 0 or p_years_experience > 70) then
    raise exception 'INVALID_YEARS_EXPERIENCE';
  end if;

  select id into specialty_uuid
  from public.specialties
  where slug = trim(coalesce(p_specialty_slug, ''))
    and is_active = true
  limit 1;

  if specialty_uuid is null then
    raise exception 'INVALID_SPECIALTY';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      updated_at = now()
  where id = uid;

  update public.solver_profiles
  set headline = nullif(trim(coalesce(p_headline, '')), ''),
      years_experience = p_years_experience,
      updated_at = now()
  where user_id = uid;

  update public.profile_specialties
  set is_primary = false
  where user_id = uid and is_primary = true;

  insert into public.profile_specialties (user_id, specialty_id, is_primary)
  values (uid, specialty_uuid, true)
  on conflict (user_id, specialty_id)
  do update set is_primary = true;
end;
$$;

create or replace function public.update_my_company_profile(
  p_full_name text,
  p_company_name text,
  p_sector text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  target_company uuid;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = uid and primary_role = 'company'
  ) then
    raise exception 'COMPANY_ROLE_REQUIRED';
  end if;

  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'INVALID_FULL_NAME';
  end if;

  if length(trim(coalesce(p_company_name, ''))) < 2 then
    raise exception 'INVALID_COMPANY_NAME';
  end if;

  select cm.company_id into target_company
  from public.company_members cm
  where cm.user_id = uid
    and cm.role in ('owner', 'admin')
  order by case when cm.role = 'owner' then 0 else 1 end
  limit 1;

  if target_company is null then
    raise exception 'COMPANY_MEMBERSHIP_REQUIRED';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      updated_at = now()
  where id = uid;

  update public.companies
  set name = trim(p_company_name),
      sector = nullif(trim(coalesce(p_sector, '')), ''),
      updated_at = now()
  where id = target_company;
end;
$$;

revoke all on function public.update_my_solver_profile(text, text, smallint, text) from public;
revoke all on function public.update_my_company_profile(text, text, text) from public;

grant execute on function public.update_my_solver_profile(text, text, smallint, text) to authenticated;
grant execute on function public.update_my_company_profile(text, text, text) to authenticated;
