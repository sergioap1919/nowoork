-- NOWOORK · ZIP 05 · Plataforma completa
-- Ejecutar en nowoork-staging después de 007_economy.sql.
-- Añade notificaciones internas, actividad empresarial, reputación agregada
-- y lectura segura del equipo. No envía correos ni cambia roles.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read_at)
  where read_at is null;

create table if not exists public.company_activity_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  decision_id uuid references public.decisions(id) on delete set null,
  kind text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists company_activity_company_created_idx
  on public.company_activity_events(company_id, created_at desc);

alter table public.notifications enable row level security;
alter table public.company_activity_events enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "company_activity_select_members" on public.company_activity_events;
create policy "company_activity_select_members"
on public.company_activity_events for select to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = company_activity_events.company_id
      and cm.user_id = auth.uid()
  )
);

grant select on table public.notifications to authenticated;
revoke insert, delete on table public.notifications from authenticated;
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;

grant select on table public.company_activity_events to authenticated;
revoke insert, update, delete on table public.company_activity_events from authenticated;

-- Devuelve el equipo de la empresa actual sin abrir los perfiles de otros usuarios.
create or replace function public.get_my_company_team()
returns table (
  user_id uuid,
  full_name text,
  email text,
  member_role public.company_member_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with my_company as (
    select cm.company_id
    from public.company_members cm
    where cm.user_id = auth.uid()
    order by cm.created_at asc
    limit 1
  )
  select
    cm.user_id,
    p.full_name,
    p.email,
    cm.role,
    cm.created_at
  from public.company_members cm
  join my_company mc on mc.company_id = cm.company_id
  join public.profiles p on p.id = cm.user_id
  order by
    case cm.role when 'owner' then 0 when 'admin' then 1 else 2 end,
    cm.created_at asc;
$$;

revoke all on function public.get_my_company_team() from public;
grant execute on function public.get_my_company_team() to authenticated;

-- Reputación agregada visible a usuarios autenticados.
create or replace function public.get_company_reputation(p_company_id uuid)
returns table (
  total_decisions bigint,
  evaluated_decisions bigint,
  total_answers bigint,
  completion_rate numeric,
  average_attribution_confidence numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    count(distinct d.id)::bigint as total_decisions,
    count(distinct dr.decision_id)::bigint as evaluated_decisions,
    count(distinct da.id)::bigint as total_answers,
    case
      when count(distinct d.id) = 0 then 0::numeric
      else round(
        (count(distinct dr.decision_id)::numeric / count(distinct d.id)::numeric) * 100,
        1
      )
    end as completion_rate,
    coalesce(round(avg(dr.attribution_confidence)::numeric, 1), 0::numeric)
      as average_attribution_confidence
  from public.decisions d
  left join public.decision_answers da on da.decision_id = d.id
  left join public.decision_results dr on dr.decision_id = d.id
  where d.company_id = p_company_id
    and d.status <> 'draft';
$$;

revoke all on function public.get_company_reputation(uuid) from public;
grant execute on function public.get_company_reputation(uuid) to authenticated;

-- Decisión publicada -> notifica solucionadores cuya especialidad principal coincide.
create or replace function public.notify_decision_published()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'published'
     and old.status is distinct from new.status then
    insert into public.notifications (user_id, kind, title, body, href, metadata)
    select
      ps.user_id,
      'decision_published',
      'Nueva decisión compatible',
      new.title,
      '/app/decisiones/' || new.id::text,
      jsonb_build_object('decision_id', new.id, 'company_id', new.company_id)
    from public.profile_specialties ps
    join public.profiles p on p.id = ps.user_id
    where ps.specialty_id = new.specialty_id
      and ps.is_primary = true
      and p.primary_role = 'solver';
  end if;
  return new;
end;
$$;

drop trigger if exists decisions_notify_published on public.decisions;
create trigger decisions_notify_published
after update of status on public.decisions
for each row execute procedure public.notify_decision_published();

-- Respuesta recibida -> notifica a todos los miembros de la empresa.
create or replace function public.notify_company_answer_received()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_company uuid;
  decision_title text;
begin
  select d.company_id, d.title
    into target_company, decision_title
  from public.decisions d
  where d.id = new.decision_id;

  insert into public.notifications (user_id, kind, title, body, href, metadata)
  select
    cm.user_id,
    'answer_received',
    'Nueva respuesta recibida',
    coalesce(decision_title, 'Una decisión recibió criterio nuevo.'),
    '/empresa/decisiones/' || new.decision_id::text,
    jsonb_build_object('decision_id', new.decision_id, 'answer_id', new.id)
  from public.company_members cm
  where cm.company_id = target_company;

  return new;
end;
$$;

drop trigger if exists decision_answers_notify_company on public.decision_answers;
create trigger decision_answers_notify_company
after insert on public.decision_answers
for each row execute procedure public.notify_company_answer_received();

-- Resultado registrado -> notifica a los solucionadores que participaron.
create or replace function public.notify_solvers_result_recorded()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  decision_title text;
begin
  select d.title into decision_title
  from public.decisions d
  where d.id = new.decision_id;

  insert into public.notifications (user_id, kind, title, body, href, metadata)
  select
    da.solver_id,
    'decision_result',
    'Ya hay resultado para tu decisión',
    coalesce(decision_title, 'Tu criterio ya fue evaluado.'),
    '/app/decisiones/' || new.decision_id::text,
    jsonb_build_object('decision_id', new.decision_id, 'result_id', new.id)
  from public.decision_answers da
  where da.decision_id = new.decision_id;

  return new;
end;
$$;

drop trigger if exists decision_results_notify_solvers on public.decision_results;
create trigger decision_results_notify_solvers
after insert on public.decision_results
for each row execute procedure public.notify_solvers_result_recorded();

-- Cambio de score -> notificación individual.
create or replace function public.notify_solver_score_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, kind, title, body, href, metadata)
  values (
    new.solver_id,
    'score_changed',
    case when new.delta > 0 then 'Tu score subió' when new.delta < 0 then 'Tu score cambió' else 'Resultado evaluado' end,
    case
      when new.delta > 0 then '+' || new.delta::text || ' puntos · ahora tienes ' || new.score_after::text
      when new.delta < 0 then new.delta::text || ' puntos · ahora tienes ' || new.score_after::text
      else 'Tu score se mantiene en ' || new.score_after::text
    end,
    '/app/resultados',
    jsonb_build_object(
      'decision_id', new.decision_id,
      'answer_id', new.answer_id,
      'delta', new.delta,
      'score_after', new.score_after
    )
  );
  return new;
end;
$$;

drop trigger if exists score_events_notify_solver on public.score_events;
create trigger score_events_notify_solver
after insert on public.score_events
for each row execute procedure public.notify_solver_score_event();

-- Recompensa disponible -> notificación económica.
create or replace function public.notify_solver_earning_available()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'available'
     and old.status is distinct from new.status then
    insert into public.notifications (user_id, kind, title, body, href, metadata)
    values (
      new.solver_id,
      'earning_available',
      'Recompensa disponible',
      'Tu recompensa de $' || trim(to_char(new.total_amount, 'FM999G999G999G990')) || ' ya está disponible.',
      '/app/ingresos',
      jsonb_build_object(
        'decision_id', new.decision_id,
        'answer_id', new.answer_id,
        'earning_id', new.id,
        'amount', new.total_amount
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists solver_earnings_notify_available on public.solver_earnings;
create trigger solver_earnings_notify_available
after update of status on public.solver_earnings
for each row execute procedure public.notify_solver_earning_available();

-- Actividad de empresa: decisiones creadas y cambios de estado.
create or replace function public.record_decision_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  activity_kind text;
  activity_description text;
begin
  if tg_op = 'INSERT' then
    activity_kind := 'decision_created';
    activity_description := 'Se creó la decisión "' || new.title || '".';
  elsif old.status is distinct from new.status then
    activity_kind := 'decision_status_changed';
    activity_description := 'La decisión "' || new.title || '" cambió de ' || old.status::text || ' a ' || new.status::text || '.';
  else
    return new;
  end if;

  insert into public.company_activity_events (
    company_id, actor_id, decision_id, kind, description, metadata
  )
  values (
    new.company_id,
    coalesce(auth.uid(), new.created_by),
    new.id,
    activity_kind,
    activity_description,
    jsonb_build_object('status', new.status)
  );

  return new;
end;
$$;

drop trigger if exists decisions_record_activity on public.decisions;
create trigger decisions_record_activity
after insert or update of status on public.decisions
for each row execute procedure public.record_decision_activity();

create or replace function public.record_answer_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_company uuid;
begin
  select d.company_id into target_company
  from public.decisions d
  where d.id = new.decision_id;

  insert into public.company_activity_events (
    company_id, actor_id, decision_id, kind, description, metadata
  )
  values (
    target_company,
    new.solver_id,
    new.decision_id,
    'answer_received',
    'La decisión recibió una nueva respuesta.',
    jsonb_build_object('answer_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists decision_answers_record_activity on public.decision_answers;
create trigger decision_answers_record_activity
after insert on public.decision_answers
for each row execute procedure public.record_answer_activity();

create or replace function public.record_result_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_company uuid;
begin
  select d.company_id into target_company
  from public.decisions d
  where d.id = new.decision_id;

  insert into public.company_activity_events (
    company_id, actor_id, decision_id, kind, description, metadata
  )
  values (
    target_company,
    new.recorded_by,
    new.decision_id,
    'result_recorded',
    'Se registró y evaluó el resultado de una decisión.',
    jsonb_build_object(
      'result_id', new.id,
      'attribution_confidence', new.attribution_confidence
    )
  );

  return new;
end;
$$;

drop trigger if exists decision_results_record_activity on public.decision_results;
create trigger decision_results_record_activity
after insert on public.decision_results
for each row execute procedure public.record_result_activity();
