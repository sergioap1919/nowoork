-- NOWOORK · ZIP 03 · Resultados + reputación
-- Ejecutar en nowoork-staging después de 005_decision_marketplace.sql.
-- Cierra el ciclo: resultado verificable -> evaluación -> score -> ranking.

do $$ begin
  create type public.answer_verdict as enum ('correct', 'neutral', 'incorrect');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.score_event_kind as enum ('answer_evaluation');
exception when duplicate_object then null;
end $$;

create table if not exists public.decision_results (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.decisions(id) on delete cascade,
  actual_outcome text not null,
  impact_summary text not null,
  attribution_confidence smallint not null check (attribution_confidence between 1 and 100),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now()
);

create table if not exists public.answer_evaluations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references public.decision_answers(id) on delete cascade,
  verdict public.answer_verdict not null,
  evaluation_note text,
  score_delta integer not null,
  evaluated_by uuid not null references public.profiles(id) on delete restrict,
  evaluated_at timestamptz not null default now()
);

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  solver_id uuid not null references public.profiles(id) on delete cascade,
  decision_id uuid not null references public.decisions(id) on delete cascade,
  answer_id uuid not null unique references public.decision_answers(id) on delete cascade,
  kind public.score_event_kind not null default 'answer_evaluation',
  delta integer not null,
  score_before integer not null,
  score_after integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  check (score_before between 0 and 1000),
  check (score_after between 0 and 1000)
);

create index if not exists decision_results_recorded_at_idx
  on public.decision_results(recorded_at desc);

create index if not exists answer_evaluations_evaluated_at_idx
  on public.answer_evaluations(evaluated_at desc);

create index if not exists score_events_solver_created_idx
  on public.score_events(solver_id, created_at desc);

alter table public.decision_results enable row level security;
alter table public.answer_evaluations enable row level security;
alter table public.score_events enable row level security;

-- La empresa ve resultados de sus decisiones.
drop policy if exists "decision_results_select_company" on public.decision_results;
create policy "decision_results_select_company"
on public.decision_results for select to authenticated
using (
  exists (
    select 1
    from public.decisions d
    join public.company_members cm on cm.company_id = d.company_id
    where d.id = decision_results.decision_id
      and cm.user_id = auth.uid()
  )
);

-- El solucionador ve el resultado de una decisión que respondió.
drop policy if exists "decision_results_select_solver_answered" on public.decision_results;
create policy "decision_results_select_solver_answered"
on public.decision_results for select to authenticated
using (
  exists (
    select 1
    from public.decision_answers da
    where da.decision_id = decision_results.decision_id
      and da.solver_id = auth.uid()
  )
);

-- Cada solucionador ve su propia evaluación.
drop policy if exists "answer_evaluations_select_solver" on public.answer_evaluations;
create policy "answer_evaluations_select_solver"
on public.answer_evaluations for select to authenticated
using (
  exists (
    select 1 from public.decision_answers da
    where da.id = answer_evaluations.answer_id
      and da.solver_id = auth.uid()
  )
);

-- La empresa ve evaluaciones de sus decisiones.
drop policy if exists "answer_evaluations_select_company" on public.answer_evaluations;
create policy "answer_evaluations_select_company"
on public.answer_evaluations for select to authenticated
using (
  exists (
    select 1
    from public.decision_answers da
    join public.decisions d on d.id = da.decision_id
    join public.company_members cm on cm.company_id = d.company_id
    where da.id = answer_evaluations.answer_id
      and cm.user_id = auth.uid()
  )
);

-- Ledger privado del solucionador.
drop policy if exists "score_events_select_own" on public.score_events;
create policy "score_events_select_own"
on public.score_events for select to authenticated
using (solver_id = auth.uid());

grant select on table
  public.decision_results,
  public.answer_evaluations,
  public.score_events
to authenticated;

revoke insert, update, delete on table public.decision_results from authenticated;
revoke insert, update, delete on table public.answer_evaluations from authenticated;
revoke insert, update, delete on table public.score_events from authenticated;

-- Endurece el envío de respuestas contra la carrera "respuesta vs. cierre".
-- Al tomar un lock de la decisión, una evaluación y una respuesta no pueden
-- cerrarse simultáneamente dejando una respuesta sin evaluar.
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
  available_decision uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  if not exists (
    select 1 from public.profiles
    where id = uid and primary_role = 'solver'
  ) then
    raise exception 'SOLVER_ROLE_REQUIRED';
  end if;

  if length(trim(coalesce(p_recommendation,''))) < 5 then
    raise exception 'INVALID_RECOMMENDATION';
  end if;

  if length(trim(coalesce(p_rationale,''))) < 10 then
    raise exception 'INVALID_RATIONALE';
  end if;

  if p_confidence is null or p_confidence < 1 or p_confidence > 100 then
    raise exception 'INVALID_CONFIDENCE';
  end if;

  select d.id into available_decision
  from public.decisions d
  where d.id = p_decision_id
    and d.status = 'published'
    and (d.deadline_at is null or d.deadline_at > now())
  for update;

  if available_decision is null then
    raise exception 'DECISION_NOT_AVAILABLE';
  end if;

  if exists (
    select 1 from public.decision_answers
    where decision_id = p_decision_id and solver_id = uid
  ) then
    raise exception 'ANSWER_ALREADY_EXISTS';
  end if;

  insert into public.decision_answers (
    decision_id,
    solver_id,
    recommendation,
    rationale,
    confidence
  ) values (
    p_decision_id,
    uid,
    trim(p_recommendation),
    trim(p_rationale),
    p_confidence
  )
  returning id into new_id;

  update public.solver_profiles
  set decisions_answered = decisions_answered + 1,
      updated_at = now()
  where user_id = uid;

  return new_id;
end;
$$;

revoke all on function public.submit_decision_answer(uuid,text,text,smallint) from public;
grant execute on function public.submit_decision_answer(uuid,text,text,smallint) to authenticated;

-- Evaluación atómica: el resultado de la decisión y TODAS sus respuestas se
-- registran una sola vez. El cliente no puede editar score ni ledger.
create or replace function public.evaluate_company_decision(
  p_decision_id uuid,
  p_actual_outcome text,
  p_impact_summary text,
  p_attribution_confidence smallint,
  p_evaluations jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  decision_row public.decisions%rowtype;
  answer_count integer;
  payload_count integer;
  payload_distinct_count integer;
  item jsonb;
  answer_uuid uuid;
  verdict_value public.answer_verdict;
  note_value text;
  solver_uuid uuid;
  old_score integer;
  old_scored integer;
  old_correct integer;
  old_streak integer;
  old_best_streak integer;
  new_score integer;
  new_scored integer;
  new_correct integer;
  new_streak integer;
  new_best_streak integer;
  new_precision numeric(5,2);
  base_delta integer;
  weighted_delta integer;
  confidence_multiplier numeric;
  score_reason text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select d.* into decision_row
  from public.decisions d
  where d.id = p_decision_id
    and d.status in ('published','closed')
    and exists (
      select 1
      from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    )
  for update;

  if not found then raise exception 'DECISION_NOT_EVALUABLE'; end if;

  if exists (select 1 from public.decision_results where decision_id = p_decision_id) then
    raise exception 'DECISION_ALREADY_EVALUATED';
  end if;

  if length(trim(coalesce(p_actual_outcome,''))) < 8 then
    raise exception 'INVALID_ACTUAL_OUTCOME';
  end if;

  if length(trim(coalesce(p_impact_summary,''))) < 8 then
    raise exception 'INVALID_IMPACT_SUMMARY';
  end if;

  if p_attribution_confidence is null or p_attribution_confidence < 1 or p_attribution_confidence > 100 then
    raise exception 'INVALID_ATTRIBUTION_CONFIDENCE';
  end if;

  if p_evaluations is null or jsonb_typeof(p_evaluations) <> 'array' then
    raise exception 'INVALID_EVALUATIONS';
  end if;

  select count(*) into answer_count
  from public.decision_answers
  where decision_id = p_decision_id;

  if answer_count = 0 then raise exception 'NO_ANSWERS_TO_EVALUATE'; end if;

  payload_count := jsonb_array_length(p_evaluations);

  select count(distinct value->>'answer_id') into payload_distinct_count
  from jsonb_array_elements(p_evaluations);

  if payload_count <> answer_count or payload_distinct_count <> answer_count then
    raise exception 'ALL_ANSWERS_MUST_BE_EVALUATED';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_evaluations) payload(value)
    left join public.decision_answers da
      on da.id = nullif(payload.value->>'answer_id','')::uuid
      and da.decision_id = p_decision_id
    where da.id is null
  ) then
    raise exception 'INVALID_ANSWER_IN_EVALUATIONS';
  end if;

  insert into public.decision_results (
    decision_id,
    actual_outcome,
    impact_summary,
    attribution_confidence,
    recorded_by
  ) values (
    p_decision_id,
    trim(p_actual_outcome),
    trim(p_impact_summary),
    p_attribution_confidence,
    uid
  );

  confidence_multiplier :=
    case
      when p_attribution_confidence >= 80 then 1.00
      when p_attribution_confidence >= 60 then 0.75
      when p_attribution_confidence >= 40 then 0.50
      else 0.25
    end;

  for item in select value from jsonb_array_elements(p_evaluations)
  loop
    answer_uuid := (item->>'answer_id')::uuid;

    begin
      verdict_value := (item->>'verdict')::public.answer_verdict;
    exception when others then
      raise exception 'INVALID_VERDICT';
    end;

    note_value := nullif(trim(coalesce(item->>'note','')), '');

    select da.solver_id into solver_uuid
    from public.decision_answers da
    where da.id = answer_uuid
      and da.decision_id = p_decision_id;

    if solver_uuid is null then raise exception 'ANSWER_NOT_FOUND'; end if;

    if exists (select 1 from public.answer_evaluations where answer_id = answer_uuid) then
      raise exception 'ANSWER_ALREADY_EVALUATED';
    end if;

    base_delta :=
      case verdict_value
        when 'neutral' then 0
        when 'correct' then
          case decision_row.difficulty
            when 'basic' then 10
            when 'expert' then 28
            else 18
          end
        when 'incorrect' then
          case decision_row.difficulty
            when 'basic' then -5
            when 'expert' then -14
            else -9
          end
      end;

    weighted_delta := round(base_delta * confidence_multiplier)::integer;

    select
      sp.score,
      sp.decisions_scored,
      sp.correct_decisions,
      sp.current_streak,
      sp.best_streak
    into
      old_score,
      old_scored,
      old_correct,
      old_streak,
      old_best_streak
    from public.solver_profiles sp
    where sp.user_id = solver_uuid
    for update;

    if not found then raise exception 'SOLVER_PROFILE_NOT_FOUND'; end if;

    new_score := greatest(0, least(1000, old_score + weighted_delta));

    if verdict_value = 'neutral' then
      new_scored := old_scored;
      new_correct := old_correct;
      new_streak := old_streak;
    else
      new_scored := old_scored + 1;
      new_correct := old_correct + case when verdict_value = 'correct' then 1 else 0 end;
      new_streak := case when verdict_value = 'correct' then old_streak + 1 else 0 end;
    end if;

    new_best_streak := greatest(old_best_streak, new_streak);
    new_precision :=
      case
        when new_scored = 0 then 0
        else round((new_correct::numeric * 100) / new_scored, 2)
      end;

    score_reason :=
      case verdict_value
        when 'correct' then 'Acierto verificado'
        when 'incorrect' then 'Desacierto verificado'
        else 'Resultado neutral'
      end
      || ' · confianza de atribución ' || p_attribution_confidence::text || '%';

    insert into public.answer_evaluations (
      answer_id,
      verdict,
      evaluation_note,
      score_delta,
      evaluated_by
    ) values (
      answer_uuid,
      verdict_value,
      note_value,
      new_score - old_score,
      uid
    );

    insert into public.score_events (
      solver_id,
      decision_id,
      answer_id,
      delta,
      score_before,
      score_after,
      reason
    ) values (
      solver_uuid,
      p_decision_id,
      answer_uuid,
      new_score - old_score,
      old_score,
      new_score,
      score_reason
    );

    update public.solver_profiles
    set score = new_score,
        decisions_scored = new_scored,
        correct_decisions = new_correct,
        precision = new_precision,
        current_streak = new_streak,
        best_streak = new_best_streak,
        updated_at = now()
    where user_id = solver_uuid;
  end loop;

  update public.decisions
  set status = 'closed',
      closed_at = coalesce(closed_at, now())
  where id = p_decision_id;
end;
$$;

revoke all on function public.evaluate_company_decision(uuid,text,text,smallint,jsonb) from public;
grant execute on function public.evaluate_company_decision(uuid,text,text,smallint,jsonb) to authenticated;

-- Historial seguro del solucionador. No expone datos de otros usuarios.
create or replace function public.get_my_result_history(p_limit integer default 100)
returns table (
  evaluation_id uuid,
  decision_id uuid,
  decision_title text,
  specialty_name text,
  recommendation text,
  verdict public.answer_verdict,
  actual_outcome text,
  impact_summary text,
  attribution_confidence smallint,
  score_delta integer,
  evaluated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    ae.id,
    d.id,
    d.title,
    s.name,
    da.recommendation,
    ae.verdict,
    dr.actual_outcome,
    dr.impact_summary,
    dr.attribution_confidence,
    ae.score_delta,
    ae.evaluated_at
  from public.answer_evaluations ae
  join public.decision_answers da on da.id = ae.answer_id
  join public.decisions d on d.id = da.decision_id
  join public.specialties s on s.id = d.specialty_id
  join public.decision_results dr on dr.decision_id = d.id
  where da.solver_id = auth.uid()
  order by ae.evaluated_at desc
  limit greatest(1, least(coalesce(p_limit,100), 200));
$$;

revoke all on function public.get_my_result_history(integer) from public;
grant execute on function public.get_my_result_history(integer) to authenticated;

-- Ranking seguro: solo campos públicos de reputación, sin email ni datos privados.
create or replace function public.get_solver_ranking(
  p_specialty_id uuid default null,
  p_limit integer default 100
)
returns table (
  rank_position bigint,
  user_id uuid,
  display_name text,
  specialty_id uuid,
  specialty_name text,
  score integer,
  "precision" numeric,
  decisions_scored integer,
  correct_decisions integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with solver_rows as (
    select
      p.id as user_id,
      coalesce(nullif(trim(p.full_name),''), 'Solucionador') as display_name,
      ps.specialty_id,
      s.name as specialty_name,
      sp.score,
      sp.precision as precision_value,
      sp.decisions_scored,
      sp.correct_decisions
    from public.profiles p
    join public.solver_profiles sp on sp.user_id = p.id
    left join public.profile_specialties ps
      on ps.user_id = p.id and ps.is_primary = true
    left join public.specialties s on s.id = ps.specialty_id
    where p.primary_role = 'solver'
      and sp.decisions_scored > 0
      and (p_specialty_id is null or ps.specialty_id = p_specialty_id)
  ),
  ranked as (
    select
      row_number() over (
        order by score desc, precision_value desc, decisions_scored desc, display_name asc
      ) as rank_position,
      *
    from solver_rows
  )
  select
    rank_position,
    user_id,
    display_name,
    specialty_id,
    coalesce(specialty_name,'General') as specialty_name,
    score,
    precision_value as "precision",
    decisions_scored,
    correct_decisions
  from ranked
  order by rank_position
  limit greatest(1, least(coalesce(p_limit,100), 200));
$$;

revoke all on function public.get_solver_ranking(uuid,integer) from public;
grant execute on function public.get_solver_ranking(uuid,integer) to authenticated;
