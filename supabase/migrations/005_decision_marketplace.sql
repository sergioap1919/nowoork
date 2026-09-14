-- NOWOORK · ZIP 02 · Marketplace completo
-- Ejecutar en nowoork-staging después de 004_profile_management.sql.
-- Crea el ciclo Empresa -> decisión -> publicación -> marketplace -> respuesta única.

create extension if not exists pgcrypto;

do $$ begin
  create type public.decision_status as enum ('draft', 'published', 'closed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.decision_difficulty as enum ('basic', 'intermediate', 'expert');
exception when duplicate_object then null;
end $$;

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  title text not null,
  context text not null default '',
  question text not null,
  difficulty public.decision_difficulty not null default 'intermediate',
  expected_minutes integer not null default 3 check (expected_minutes between 1 and 120),
  base_reward numeric(14,2) not null default 0 check (base_reward >= 0),
  performance_bonus numeric(14,2) not null default 0 check (performance_bonus >= 0),
  status public.decision_status not null default 'draft',
  deadline_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decision_answers (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions(id) on delete cascade,
  solver_id uuid not null references public.profiles(id) on delete cascade,
  recommendation text not null,
  rationale text not null,
  confidence smallint not null check (confidence between 1 and 100),
  submitted_at timestamptz not null default now(),
  unique (decision_id, solver_id)
);

create index if not exists decisions_company_status_idx
  on public.decisions(company_id, status, created_at desc);

create index if not exists decisions_marketplace_idx
  on public.decisions(status, specialty_id, published_at desc);

create index if not exists decision_answers_decision_idx
  on public.decision_answers(decision_id, submitted_at desc);

create or replace function public.touch_decision_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists decisions_touch_updated_at on public.decisions;
create trigger decisions_touch_updated_at
before update on public.decisions
for each row execute procedure public.touch_decision_updated_at();

alter table public.decisions enable row level security;
alter table public.decision_answers enable row level security;

create or replace function public.has_answered_decision(p_decision_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.decision_answers da
    where da.decision_id = p_decision_id
      and da.solver_id = auth.uid()
  );
$$;

revoke all on function public.has_answered_decision(uuid) from public;
grant execute on function public.has_answered_decision(uuid) to authenticated;

-- Empresas: pueden ver todas las decisiones de empresas donde son miembros.
drop policy if exists "decisions_select_company_members" on public.decisions;
create policy "decisions_select_company_members"
on public.decisions for select to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = decisions.company_id
      and cm.user_id = auth.uid()
  )
);

-- Solucionadores: solo decisiones publicadas y no vencidas.
drop policy if exists "decisions_select_solver_marketplace" on public.decisions;
create policy "decisions_select_solver_marketplace"
on public.decisions for select to authenticated
using (
  status = 'published'
  and (deadline_at is null or deadline_at > now())
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.primary_role = 'solver'
  )
);

-- Si el solucionador ya respondió, conserva acceso de lectura a esa decisión
-- aunque la empresa la cierre o cancele. No vuelve a aparecer en marketplace.
drop policy if exists "decisions_select_solver_answered" on public.decisions;
create policy "decisions_select_solver_answered"
on public.decisions for select to authenticated
using (public.has_answered_decision(decisions.id));

-- Cada solucionador ve su propia respuesta.
drop policy if exists "decision_answers_select_own" on public.decision_answers;
create policy "decision_answers_select_own"
on public.decision_answers for select to authenticated
using (solver_id = auth.uid());

-- La empresa puede leer respuestas de sus propias decisiones.
drop policy if exists "decision_answers_select_company" on public.decision_answers;
create policy "decision_answers_select_company"
on public.decision_answers for select to authenticated
using (
  exists (
    select 1
    from public.decisions d
    join public.company_members cm on cm.company_id = d.company_id
    where d.id = decision_answers.decision_id
      and cm.user_id = auth.uid()
  )
);

-- Permite mostrar el nombre de la empresa únicamente cuando tiene una decisión
-- publicada visible en el marketplace del solucionador. La policy existente de
-- miembros sigue cubriendo el panel empresarial.
drop policy if exists "companies_select_marketplace" on public.companies;
create policy "companies_select_marketplace"
on public.companies for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.primary_role = 'solver'
  )
  and exists (
    select 1 from public.decisions d
    where d.company_id = companies.id
      and d.status = 'published'
      and (d.deadline_at is null or d.deadline_at > now())
  )
);

grant select on table public.decisions, public.decision_answers to authenticated;
revoke insert, update, delete on table public.decisions from authenticated;
revoke insert, update, delete on table public.decision_answers from authenticated;

-- Crear decisión en borrador.
create or replace function public.create_company_decision(
  p_title text,
  p_context text,
  p_question text,
  p_specialty_id uuid,
  p_difficulty public.decision_difficulty,
  p_expected_minutes integer,
  p_base_reward numeric,
  p_performance_bonus numeric,
  p_deadline_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  target_company uuid;
  new_id uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  if not exists (select 1 from public.profiles where id = uid and primary_role = 'company') then
    raise exception 'COMPANY_ROLE_REQUIRED';
  end if;

  select cm.company_id into target_company
  from public.company_members cm
  where cm.user_id = uid and cm.role in ('owner','admin')
  order by case when cm.role = 'owner' then 0 else 1 end
  limit 1;

  if target_company is null then raise exception 'COMPANY_MEMBERSHIP_REQUIRED'; end if;
  if length(trim(coalesce(p_title,''))) < 6 then raise exception 'INVALID_TITLE'; end if;
  if length(trim(coalesce(p_context,''))) < 12 then raise exception 'INVALID_CONTEXT'; end if;
  if length(trim(coalesce(p_question,''))) < 8 then raise exception 'INVALID_QUESTION'; end if;
  if not exists (select 1 from public.specialties where id = p_specialty_id and is_active = true) then raise exception 'INVALID_SPECIALTY'; end if;
  if p_expected_minutes is null or p_expected_minutes < 1 or p_expected_minutes > 120 then raise exception 'INVALID_EXPECTED_MINUTES'; end if;
  if coalesce(p_base_reward,0) < 0 or coalesce(p_performance_bonus,0) < 0 then raise exception 'INVALID_REWARD'; end if;
  if p_deadline_at is not null and p_deadline_at <= now() then raise exception 'INVALID_DEADLINE'; end if;

  insert into public.decisions (
    company_id, created_by, specialty_id, title, context, question,
    difficulty, expected_minutes, base_reward, performance_bonus, deadline_at
  ) values (
    target_company, uid, p_specialty_id, trim(p_title), trim(p_context), trim(p_question),
    coalesce(p_difficulty,'intermediate'::public.decision_difficulty),
    p_expected_minutes, coalesce(p_base_reward,0), coalesce(p_performance_bonus,0), p_deadline_at
  ) returning id into new_id;

  return new_id;
end;
$$;

-- Editar solo mientras siga en borrador.
create or replace function public.update_company_decision(
  p_decision_id uuid,
  p_title text,
  p_context text,
  p_question text,
  p_specialty_id uuid,
  p_difficulty public.decision_difficulty,
  p_expected_minutes integer,
  p_base_reward numeric,
  p_performance_bonus numeric,
  p_deadline_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_title,''))) < 6 then raise exception 'INVALID_TITLE'; end if;
  if length(trim(coalesce(p_context,''))) < 12 then raise exception 'INVALID_CONTEXT'; end if;
  if length(trim(coalesce(p_question,''))) < 8 then raise exception 'INVALID_QUESTION'; end if;
  if not exists (select 1 from public.specialties where id = p_specialty_id and is_active = true) then raise exception 'INVALID_SPECIALTY'; end if;
  if p_expected_minutes is null or p_expected_minutes < 1 or p_expected_minutes > 120 then raise exception 'INVALID_EXPECTED_MINUTES'; end if;
  if coalesce(p_base_reward,0) < 0 or coalesce(p_performance_bonus,0) < 0 then raise exception 'INVALID_REWARD'; end if;
  if p_deadline_at is not null and p_deadline_at <= now() then raise exception 'INVALID_DEADLINE'; end if;

  update public.decisions d
  set specialty_id = p_specialty_id,
      title = trim(p_title),
      context = trim(p_context),
      question = trim(p_question),
      difficulty = coalesce(p_difficulty,'intermediate'::public.decision_difficulty),
      expected_minutes = p_expected_minutes,
      base_reward = coalesce(p_base_reward,0),
      performance_bonus = coalesce(p_performance_bonus,0),
      deadline_at = p_deadline_at
  where d.id = p_decision_id
    and d.status = 'draft'
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    );

  if not found then raise exception 'DECISION_NOT_EDITABLE'; end if;
end;
$$;

create or replace function public.publish_company_decision(p_decision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.decisions d
  set status = 'published', published_at = now(), cancelled_at = null, closed_at = null
  where d.id = p_decision_id
    and d.status = 'draft'
    and length(trim(d.title)) >= 6
    and length(trim(d.context)) >= 12
    and length(trim(d.question)) >= 8
    and (d.deadline_at is null or d.deadline_at > now())
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    );

  if not found then raise exception 'DECISION_NOT_PUBLISHABLE'; end if;
end;
$$;

create or replace function public.cancel_company_decision(p_decision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.decisions d
  set status = 'cancelled', cancelled_at = now()
  where d.id = p_decision_id
    and d.status in ('draft','published')
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    );

  if not found then raise exception 'DECISION_NOT_CANCELLABLE'; end if;
end;
$$;

create or replace function public.close_company_decision(p_decision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.decisions d
  set status = 'closed', closed_at = now()
  where d.id = p_decision_id
    and d.status = 'published'
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    );

  if not found then raise exception 'DECISION_NOT_CLOSABLE'; end if;
end;
$$;

create or replace function public.submit_decision_answer(
  p_decision_id uuid,
  p_recommendation text,
  p_rationale text,
  p_confidence smallint
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  if not exists (select 1 from public.profiles where id = uid and primary_role = 'solver') then
    raise exception 'SOLVER_ROLE_REQUIRED';
  end if;

  if length(trim(coalesce(p_recommendation,''))) < 5 then raise exception 'INVALID_RECOMMENDATION'; end if;
  if length(trim(coalesce(p_rationale,''))) < 10 then raise exception 'INVALID_RATIONALE'; end if;
  if p_confidence is null or p_confidence < 1 or p_confidence > 100 then raise exception 'INVALID_CONFIDENCE'; end if;

  if not exists (
    select 1 from public.decisions
    where id = p_decision_id
      and status = 'published'
      and (deadline_at is null or deadline_at > now())
  ) then
    raise exception 'DECISION_NOT_AVAILABLE';
  end if;

  if exists (
    select 1 from public.decision_answers
    where decision_id = p_decision_id and solver_id = uid
  ) then
    raise exception 'ANSWER_ALREADY_EXISTS';
  end if;

  insert into public.decision_answers (decision_id, solver_id, recommendation, rationale, confidence)
  values (p_decision_id, uid, trim(p_recommendation), trim(p_rationale), p_confidence)
  returning id into new_id;

  update public.solver_profiles
  set decisions_answered = decisions_answered + 1,
      updated_at = now()
  where user_id = uid;

  return new_id;
end;
$$;

revoke all on function public.create_company_decision(text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,timestamptz) from public;
revoke all on function public.update_company_decision(uuid,text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,timestamptz) from public;
revoke all on function public.publish_company_decision(uuid) from public;
revoke all on function public.cancel_company_decision(uuid) from public;
revoke all on function public.close_company_decision(uuid) from public;
revoke all on function public.submit_decision_answer(uuid,text,text,smallint) from public;

grant execute on function public.create_company_decision(text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,timestamptz) to authenticated;
grant execute on function public.update_company_decision(uuid,text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,timestamptz) to authenticated;
grant execute on function public.publish_company_decision(uuid) to authenticated;
grant execute on function public.cancel_company_decision(uuid) to authenticated;
grant execute on function public.close_company_decision(uuid) to authenticated;
grant execute on function public.submit_decision_answer(uuid,text,text,smallint) to authenticated;
