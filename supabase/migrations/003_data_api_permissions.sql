-- NOWOORK · Data API permissions
-- Ejecutar en nowoork-staging después de 001_core.sql y 002_role_integrity.sql.
-- RLS sigue siendo la capa que limita qué filas puede ver cada usuario.

grant usage on schema public to authenticated;

grant select on table
  public.profiles,
  public.profile_roles,
  public.specialties,
  public.solver_profiles,
  public.profile_specialties,
  public.companies,
  public.company_members
to authenticated;

-- El registro todavía usa listas locales, así que no damos acceso anon a tablas.
-- Las futuras escrituras se habilitarán tabla por tabla con permisos mínimos
-- y sus respectivas políticas RLS.
