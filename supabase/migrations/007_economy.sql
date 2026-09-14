-- NOWOORK · ZIP 04 · Economía interna
-- Ejecutar en nowoork-staging después de 006_results_reputation.sql.
-- Añade créditos de empresa, reserva de presupuesto, earnings del solucionador
-- y liquidación económica al evaluar una decisión. NO mueve dinero real.

create extension if not exists pgcrypto;

do $$ begin
  create type public.company_credit_event_kind as enum (
    'launch_credit',
    'decision_reserve',
    'decision_release',
    'decision_settlement'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.solver_earning_status as enum (
    'pending',
    'available',
    'paid',
    'void'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.solver_wallet_event_kind as enum (
    'base_pending',
    'decision_settlement',
    'withdrawal'
  );
exception when duplicate_object then null;
end $$;

alter table public.decisions
  add column if not exists solver_slots smallint not null default 3,
  add column if not exists platform_fee_rate numeric(6,4) not null default 0.1500,
  add column if not exists reserved_credits numeric(14,2) not null default 0,
  add column if not exists final_cost numeric(14,2) not null default 0,
  add column if not exists economy_locked_at timestamptz;

do $$ begin
  alter table public.decisions
    add constraint decisions_solver_slots_check check (solver_slots between 1 and 20);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.decisions
    add constraint decisions_platform_fee_rate_check check (platform_fee_rate between 0 and 1);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.decisions
    add constraint decisions_reserved_credits_check check (reserved_credits >= 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.decisions
    add constraint decisions_final_cost_check check (final_cost >= 0);
exception when duplicate_object then null;
end $$;

create table if not exists public.company_credit_accounts (
  company_id uuid primary key references public.companies(id) on delete cascade,
  currency text not null default 'COP' check (currency = 'COP'),
  available_credits numeric(14,2) not null default 0 check (available_credits >= 0),
  reserved_credits numeric(14,2) not null default 0 check (reserved_credits >= 0),
  spent_credits numeric(14,2) not null default 0 check (spent_credits >= 0),
  launch_credit_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_credit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  decision_id uuid references public.decisions(id) on delete set null,
  kind public.company_credit_event_kind not null,
  available_delta numeric(14,2) not null default 0,
  reserved_delta numeric(14,2) not null default 0,
  spent_delta numeric(14,2) not null default 0,
  available_after numeric(14,2) not null,
  reserved_after numeric(14,2) not null,
  spent_after numeric(14,2) not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.solver_wallet_accounts (
  solver_id uuid primary key references public.profiles(id) on delete cascade,
  currency text not null default 'COP' check (currency = 'COP'),
  pending_balance numeric(14,2) not null default 0 check (pending_balance >= 0),
  available_balance numeric(14,2) not null default 0 check (available_balance >= 0),
  paid_balance numeric(14,2) not null default 0 check (paid_balance >= 0),
  lifetime_earned numeric(14,2) not null default 0 check (lifetime_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solver_earnings (
  id uuid primary key default gen_random_uuid(),
  solver_id uuid not null references public.profiles(id) on delete cascade,
  decision_id uuid not null references public.decisions(id) on delete cascade,
  answer_id uuid not null unique references public.decision_answers(id) on delete cascade,
  base_amount numeric(14,2) not null default 0 check (base_amount >= 0),
  bonus_amount numeric(14,2) not null default 0 check (bonus_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  status public.solver_earning_status not null default 'pending',
  created_at timestamptz not null default now(),
  available_at timestamptz,
  paid_at timestamptz
);

create table if not exists public.solver_wallet_events (
  id uuid primary key default gen_random_uuid(),
  solver_id uuid not null references public.profiles(id) on delete cascade,
  decision_id uuid references public.decisions(id) on delete set null,
  answer_id uuid references public.decision_answers(id) on delete set null,
  kind public.solver_wallet_event_kind not null,
  pending_delta numeric(14,2) not null default 0,
  available_delta numeric(14,2) not null default 0,
  paid_delta numeric(14,2) not null default 0,
  lifetime_delta numeric(14,2) not null default 0,
  pending_after numeric(14,2) not null,
  available_after numeric(14,2) not null,
  paid_after numeric(14,2) not null,
  lifetime_after numeric(14,2) not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists company_credit_events_company_created_idx
  on public.company_credit_events(company_id, created_at desc);
create index if not exists solver_earnings_solver_created_idx
  on public.solver_earnings(solver_id, created_at desc);
create index if not exists solver_wallet_events_solver_created_idx
  on public.solver_wallet_events(solver_id, created_at desc);

insert into public.company_credit_accounts (company_id)
select c.id
from public.companies c
on conflict (company_id) do nothing;

insert into public.solver_wallet_accounts (solver_id)
select sp.user_id
from public.solver_profiles sp
on conflict (solver_id) do nothing;

create or replace function public.ensure_company_credit_account()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.company_credit_accounts (company_id)
  values (new.id)
  on conflict (company_id) do nothing;
  return new;
end;
$$;

drop trigger if exists companies_create_credit_account on public.companies;
create trigger companies_create_credit_account
after insert on public.companies
for each row execute procedure public.ensure_company_credit_account();

create or replace function public.ensure_solver_wallet_account()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.solver_wallet_accounts (solver_id)
  values (new.user_id)
  on conflict (solver_id) do nothing;
  return new;
end;
$$;

drop trigger if exists solver_profiles_create_wallet_account on public.solver_profiles;
create trigger solver_profiles_create_wallet_account
after insert on public.solver_profiles
for each row execute procedure public.ensure_solver_wallet_account();

alter table public.company_credit_accounts enable row level security;
alter table public.company_credit_events enable row level security;
alter table public.solver_wallet_accounts enable row level security;
alter table public.solver_earnings enable row level security;
alter table public.solver_wallet_events enable row level security;

drop policy if exists "company_credit_accounts_select_member" on public.company_credit_accounts;
create policy "company_credit_accounts_select_member"
on public.company_credit_accounts for select to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_credit_accounts.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "company_credit_events_select_member" on public.company_credit_events;
create policy "company_credit_events_select_member"
on public.company_credit_events for select to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = company_credit_events.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "solver_wallet_accounts_select_own" on public.solver_wallet_accounts;
create policy "solver_wallet_accounts_select_own"
on public.solver_wallet_accounts for select to authenticated
using (solver_id = auth.uid());

drop policy if exists "solver_earnings_select_own" on public.solver_earnings;
create policy "solver_earnings_select_own"
on public.solver_earnings for select to authenticated
using (solver_id = auth.uid());

drop policy if exists "solver_wallet_events_select_own" on public.solver_wallet_events;
create policy "solver_wallet_events_select_own"
on public.solver_wallet_events for select to authenticated
using (solver_id = auth.uid());

grant select on table
  public.company_credit_accounts,
  public.company_credit_events,
  public.solver_wallet_accounts,
  public.solver_earnings,
  public.solver_wallet_events
to authenticated;

revoke insert, update, delete on table public.company_credit_accounts from authenticated;
revoke insert, update, delete on table public.company_credit_events from authenticated;
revoke insert, update, delete on table public.solver_wallet_accounts from authenticated;
revoke insert, update, delete on table public.solver_earnings from authenticated;
revoke insert, update, delete on table public.solver_wallet_events from authenticated;

-- Créditos de lanzamiento. Son créditos internos para probar la economía de Nowoork;
-- no representan un pago ni dinero retirable.
create or replace function public.claim_company_launch_credits()
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  target_company uuid;
  account_row public.company_credit_accounts%rowtype;
  launch_amount numeric(14,2) := 300000;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select cm.company_id into target_company
  from public.company_members cm
  where cm.user_id = uid and cm.role in ('owner','admin')
  order by case when cm.role = 'owner' then 0 else 1 end
  limit 1;

  if target_company is null then raise exception 'COMPANY_MEMBERSHIP_REQUIRED'; end if;

  insert into public.company_credit_accounts (company_id)
  values (target_company)
  on conflict (company_id) do nothing;

  select * into account_row
  from public.company_credit_accounts
  where company_id = target_company
  for update;

  if account_row.launch_credit_claimed_at is not null then
    raise exception 'LAUNCH_CREDITS_ALREADY_CLAIMED';
  end if;

  update public.company_credit_accounts
  set available_credits = available_credits + launch_amount,
      launch_credit_claimed_at = now(),
      updated_at = now()
  where company_id = target_company
  returning * into account_row;

  insert into public.company_credit_events (
    company_id, kind, available_delta, reserved_delta, spent_delta,
    available_after, reserved_after, spent_after, description
  ) values (
    target_company, 'launch_credit', launch_amount, 0, 0,
    account_row.available_credits, account_row.reserved_credits, account_row.spent_credits,
    'Créditos de lanzamiento de Nowoork'
  );

  return account_row.available_credits;
end;
$$;

revoke all on function public.claim_company_launch_credits() from public;
grant execute on function public.claim_company_launch_credits() to authenticated;

-- Reemplaza creación/edición para incluir cupos de solucionadores.
drop function if exists public.create_company_decision(text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,timestamptz);
create or replace function public.create_company_decision(
  p_title text,
  p_context text,
  p_question text,
  p_specialty_id uuid,
  p_difficulty public.decision_difficulty,
  p_expected_minutes integer,
  p_base_reward numeric,
  p_performance_bonus numeric,
  p_solver_slots smallint,
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
  if not exists (select 1 from public.profiles where id = uid and primary_role = 'company') then raise exception 'COMPANY_ROLE_REQUIRED'; end if;

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
  if coalesce(p_base_reward,0) > 5000000 or coalesce(p_performance_bonus,0) > 20000000 then raise exception 'REWARD_TOO_HIGH'; end if;
  if p_solver_slots is null or p_solver_slots < 1 or p_solver_slots > 20 then raise exception 'INVALID_SOLVER_SLOTS'; end if;
  if p_deadline_at is not null and p_deadline_at <= now() then raise exception 'INVALID_DEADLINE'; end if;

  insert into public.decisions (
    company_id, created_by, specialty_id, title, context, question,
    difficulty, expected_minutes, base_reward, performance_bonus, solver_slots, deadline_at
  ) values (
    target_company, uid, p_specialty_id, trim(p_title), trim(p_context), trim(p_question),
    coalesce(p_difficulty,'intermediate'::public.decision_difficulty),
    p_expected_minutes, coalesce(p_base_reward,0), coalesce(p_performance_bonus,0), p_solver_slots, p_deadline_at
  ) returning id into new_id;

  return new_id;
end;
$$;

drop function if exists public.update_company_decision(uuid,text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,timestamptz);
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
  p_solver_slots smallint,
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
  if coalesce(p_base_reward,0) > 5000000 or coalesce(p_performance_bonus,0) > 20000000 then raise exception 'REWARD_TOO_HIGH'; end if;
  if p_solver_slots is null or p_solver_slots < 1 or p_solver_slots > 20 then raise exception 'INVALID_SOLVER_SLOTS'; end if;
  if p_deadline_at is not null and p_deadline_at <= now() then raise exception 'INVALID_DEADLINE'; end if;

  update public.decisions d
  set specialty_id = p_specialty_id,
      title = trim(p_title),
      context = trim(p_context),
      question = trim(p_question),
      difficulty = p_difficulty,
      expected_minutes = p_expected_minutes,
      base_reward = coalesce(p_base_reward,0),
      performance_bonus = coalesce(p_performance_bonus,0),
      solver_slots = p_solver_slots,
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

-- Publicar reserva la exposición máxima: (base + bono) x cupos + 15% de fee.
create or replace function public.publish_company_decision(p_decision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  decision_row public.decisions%rowtype;
  account_row public.company_credit_accounts%rowtype;
  max_solver_payout numeric(14,2);
  max_fee numeric(14,2);
  max_cost numeric(14,2);
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select d.* into decision_row
  from public.decisions d
  where d.id = p_decision_id
    and d.status = 'draft'
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    )
  for update;

  if not found then raise exception 'DECISION_NOT_PUBLISHABLE'; end if;
  if length(trim(decision_row.title)) < 6 or length(trim(decision_row.context)) < 12 or length(trim(decision_row.question)) < 8 then raise exception 'DECISION_NOT_PUBLISHABLE'; end if;
  if decision_row.deadline_at is not null and decision_row.deadline_at <= now() then raise exception 'DECISION_NOT_PUBLISHABLE'; end if;
  if decision_row.base_reward < 1000 then raise exception 'BASE_REWARD_MINIMUM_1000'; end if;

  insert into public.company_credit_accounts (company_id)
  values (decision_row.company_id)
  on conflict (company_id) do nothing;

  select * into account_row
  from public.company_credit_accounts
  where company_id = decision_row.company_id
  for update;

  max_solver_payout := round((decision_row.base_reward + decision_row.performance_bonus) * decision_row.solver_slots, 2);
  max_fee := round(max_solver_payout * decision_row.platform_fee_rate, 2);
  max_cost := max_solver_payout + max_fee;

  if account_row.available_credits < max_cost then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.company_credit_accounts
  set available_credits = available_credits - max_cost,
      reserved_credits = reserved_credits + max_cost,
      updated_at = now()
  where company_id = decision_row.company_id
  returning * into account_row;

  update public.decisions
  set status = 'published',
      published_at = now(),
      cancelled_at = null,
      closed_at = null,
      reserved_credits = max_cost,
      final_cost = 0,
      economy_locked_at = now()
  where id = p_decision_id;

  insert into public.company_credit_events (
    company_id, decision_id, kind,
    available_delta, reserved_delta, spent_delta,
    available_after, reserved_after, spent_after, description
  ) values (
    decision_row.company_id, p_decision_id, 'decision_reserve',
    -max_cost, max_cost, 0,
    account_row.available_credits, account_row.reserved_credits, account_row.spent_credits,
    'Reserva máxima de presupuesto para decisión'
  );
end;
$$;

-- Cancelar una publicada solo es posible si todavía no tiene respuestas.
create or replace function public.cancel_company_decision(p_decision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  decision_row public.decisions%rowtype;
  account_row public.company_credit_accounts%rowtype;
  answer_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select d.* into decision_row
  from public.decisions d
  where d.id = p_decision_id
    and d.status in ('draft','published')
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    )
  for update;

  if not found then raise exception 'DECISION_NOT_CANCELLABLE'; end if;

  select count(*) into answer_count
  from public.decision_answers
  where decision_id = p_decision_id;

  if decision_row.status = 'published' and answer_count > 0 then
    raise exception 'DECISION_HAS_ANSWERS_CLOSE_AND_EVALUATE';
  end if;

  if decision_row.status = 'published' and decision_row.reserved_credits > 0 then
    select * into account_row
    from public.company_credit_accounts
    where company_id = decision_row.company_id
    for update;

    update public.company_credit_accounts
    set available_credits = available_credits + decision_row.reserved_credits,
        reserved_credits = greatest(0, reserved_credits - decision_row.reserved_credits),
        updated_at = now()
    where company_id = decision_row.company_id
    returning * into account_row;

    insert into public.company_credit_events (
      company_id, decision_id, kind,
      available_delta, reserved_delta, spent_delta,
      available_after, reserved_after, spent_after, description
    ) values (
      decision_row.company_id, p_decision_id, 'decision_release',
      decision_row.reserved_credits, -decision_row.reserved_credits, 0,
      account_row.available_credits, account_row.reserved_credits, account_row.spent_credits,
      'Liberación de reserva por cancelación sin respuestas'
    );
  end if;

  update public.decisions
  set status = 'cancelled',
      cancelled_at = now(),
      reserved_credits = 0
  where id = p_decision_id;
end;
$$;

-- Cerrar impide nuevas respuestas. Si no hubo respuestas libera la reserva;
-- si hubo respuestas conserva la reserva hasta la evaluación.
create or replace function public.close_company_decision(p_decision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  decision_row public.decisions%rowtype;
  account_row public.company_credit_accounts%rowtype;
  answer_count integer;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select d.* into decision_row
  from public.decisions d
  where d.id = p_decision_id
    and d.status = 'published'
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    )
  for update;

  if not found then raise exception 'DECISION_NOT_CLOSABLE'; end if;

  select count(*) into answer_count
  from public.decision_answers
  where decision_id = p_decision_id;

  if answer_count = 0 and decision_row.reserved_credits > 0 then
    select * into account_row
    from public.company_credit_accounts
    where company_id = decision_row.company_id
    for update;

    update public.company_credit_accounts
    set available_credits = available_credits + decision_row.reserved_credits,
        reserved_credits = greatest(0, reserved_credits - decision_row.reserved_credits),
        updated_at = now()
    where company_id = decision_row.company_id
    returning * into account_row;

    insert into public.company_credit_events (
      company_id, decision_id, kind,
      available_delta, reserved_delta, spent_delta,
      available_after, reserved_after, spent_after, description
    ) values (
      decision_row.company_id, p_decision_id, 'decision_release',
      decision_row.reserved_credits, -decision_row.reserved_credits, 0,
      account_row.available_credits, account_row.reserved_credits, account_row.spent_credits,
      'Liberación de reserva al cerrar sin respuestas'
    );

    update public.decisions
    set reserved_credits = 0
    where id = p_decision_id;
  end if;

  update public.decisions
  set status = 'closed',
      closed_at = now()
  where id = p_decision_id;
end;
$$;

-- Responder ocupa uno de los cupos y crea la recompensa base como saldo pendiente.
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
  decision_row public.decisions%rowtype;
  current_answers integer;
  wallet_row public.solver_wallet_accounts%rowtype;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id = uid and primary_role = 'solver') then raise exception 'SOLVER_ROLE_REQUIRED'; end if;
  if length(trim(coalesce(p_recommendation,''))) < 5 then raise exception 'INVALID_RECOMMENDATION'; end if;
  if length(trim(coalesce(p_rationale,''))) < 10 then raise exception 'INVALID_RATIONALE'; end if;
  if p_confidence is null or p_confidence < 1 or p_confidence > 100 then raise exception 'INVALID_CONFIDENCE'; end if;

  select d.* into decision_row
  from public.decisions d
  where d.id = p_decision_id
    and d.status = 'published'
    and (d.deadline_at is null or d.deadline_at > now())
  for update;

  if not found then raise exception 'DECISION_NOT_AVAILABLE'; end if;
  if decision_row.economy_locked_at is null or decision_row.reserved_credits <= 0 then raise exception 'DECISION_NOT_FUNDED'; end if;

  if exists (
    select 1 from public.decision_answers
    where decision_id = p_decision_id and solver_id = uid
  ) then raise exception 'ANSWER_ALREADY_EXISTS'; end if;

  select count(*) into current_answers
  from public.decision_answers
  where decision_id = p_decision_id;

  if current_answers >= decision_row.solver_slots then raise exception 'DECISION_SLOTS_FULL'; end if;

  insert into public.decision_answers (decision_id, solver_id, recommendation, rationale, confidence)
  values (p_decision_id, uid, trim(p_recommendation), trim(p_rationale), p_confidence)
  returning id into new_id;

  insert into public.solver_wallet_accounts (solver_id)
  values (uid)
  on conflict (solver_id) do nothing;

  insert into public.solver_earnings (
    solver_id, decision_id, answer_id, base_amount, bonus_amount, total_amount, status
  ) values (
    uid, p_decision_id, new_id, decision_row.base_reward, 0, decision_row.base_reward, 'pending'
  );

  update public.solver_wallet_accounts
  set pending_balance = pending_balance + decision_row.base_reward,
      updated_at = now()
  where solver_id = uid
  returning * into wallet_row;

  insert into public.solver_wallet_events (
    solver_id, decision_id, answer_id, kind,
    pending_delta, available_delta, paid_delta, lifetime_delta,
    pending_after, available_after, paid_after, lifetime_after, description
  ) values (
    uid, p_decision_id, new_id, 'base_pending',
    decision_row.base_reward, 0, 0, 0,
    wallet_row.pending_balance, wallet_row.available_balance, wallet_row.paid_balance, wallet_row.lifetime_earned,
    'Recompensa base pendiente de evaluación'
  );

  update public.solver_profiles
  set decisions_answered = decisions_answered + 1,
      updated_at = now()
  where user_id = uid;

  current_answers := current_answers + 1;
  if current_answers >= decision_row.solver_slots then
    update public.decisions
    set status = 'closed', closed_at = now()
    where id = p_decision_id;
  end if;

  return new_id;
end;
$$;

-- Evaluación atómica: resultado + score + wallet + liquidación de créditos.
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
  account_row public.company_credit_accounts%rowtype;
  wallet_row public.solver_wallet_accounts%rowtype;
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
  payout_base numeric(14,2);
  payout_bonus numeric(14,2);
  payout_total numeric(14,2);
  pending_release numeric(14,2);
  total_solver_payout numeric(14,2) := 0;
  platform_fee numeric(14,2);
  actual_cost numeric(14,2);
  unused_reserve numeric(14,2);
  economy_enabled boolean := false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select d.* into decision_row
  from public.decisions d
  where d.id = p_decision_id
    and d.status in ('published','closed')
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = d.company_id
        and cm.user_id = uid
        and cm.role in ('owner','admin')
    )
  for update;

  if not found then raise exception 'DECISION_NOT_EVALUABLE'; end if;
  economy_enabled := decision_row.economy_locked_at is not null and decision_row.reserved_credits > 0;
  if exists (select 1 from public.decision_results where decision_id = p_decision_id) then raise exception 'DECISION_ALREADY_EVALUATED'; end if;
  if length(trim(coalesce(p_actual_outcome,''))) < 8 then raise exception 'INVALID_ACTUAL_OUTCOME'; end if;
  if length(trim(coalesce(p_impact_summary,''))) < 8 then raise exception 'INVALID_IMPACT_SUMMARY'; end if;
  if p_attribution_confidence is null or p_attribution_confidence < 1 or p_attribution_confidence > 100 then raise exception 'INVALID_ATTRIBUTION_CONFIDENCE'; end if;
  if p_evaluations is null or jsonb_typeof(p_evaluations) <> 'array' then raise exception 'INVALID_EVALUATIONS'; end if;

  select count(*) into answer_count from public.decision_answers where decision_id = p_decision_id;
  if answer_count = 0 then raise exception 'NO_ANSWERS_TO_EVALUATE'; end if;

  payload_count := jsonb_array_length(p_evaluations);
  select count(distinct value->>'answer_id') into payload_distinct_count
  from jsonb_array_elements(p_evaluations);

  if payload_count <> answer_count or payload_distinct_count <> answer_count then raise exception 'ALL_ANSWERS_MUST_BE_EVALUATED'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_evaluations) payload(value)
    left join public.decision_answers da
      on da.id = nullif(payload.value->>'answer_id','')::uuid
      and da.decision_id = p_decision_id
    where da.id is null
  ) then raise exception 'INVALID_ANSWER_IN_EVALUATIONS'; end if;

  insert into public.decision_results (decision_id, actual_outcome, impact_summary, attribution_confidence, recorded_by)
  values (p_decision_id, trim(p_actual_outcome), trim(p_impact_summary), p_attribution_confidence, uid);

  confidence_multiplier := case
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
    where da.id = answer_uuid and da.decision_id = p_decision_id;

    if solver_uuid is null then raise exception 'ANSWER_NOT_FOUND'; end if;
    if exists (select 1 from public.answer_evaluations where answer_id = answer_uuid) then raise exception 'ANSWER_ALREADY_EVALUATED'; end if;

    base_delta := case verdict_value
      when 'neutral' then 0
      when 'correct' then case decision_row.difficulty when 'basic' then 10 when 'expert' then 28 else 18 end
      when 'incorrect' then case decision_row.difficulty when 'basic' then -5 when 'expert' then -14 else -9 end
    end;
    weighted_delta := round(base_delta * confidence_multiplier)::integer;

    select sp.score, sp.decisions_scored, sp.correct_decisions, sp.current_streak, sp.best_streak
    into old_score, old_scored, old_correct, old_streak, old_best_streak
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
    new_precision := case when new_scored = 0 then 0 else round((new_correct::numeric * 100) / new_scored, 2) end;

    score_reason := case verdict_value
      when 'correct' then 'Acierto verificado'
      when 'incorrect' then 'Desacierto verificado'
      else 'Resultado neutral'
    end || ' · confianza de atribución ' || p_attribution_confidence::text || '%';

    insert into public.answer_evaluations (answer_id, verdict, evaluation_note, score_delta, evaluated_by)
    values (answer_uuid, verdict_value, note_value, new_score - old_score, uid);

    insert into public.score_events (solver_id, decision_id, answer_id, delta, score_before, score_after, reason)
    values (solver_uuid, p_decision_id, answer_uuid, new_score - old_score, old_score, new_score, score_reason);

    update public.solver_profiles
    set score = new_score,
        decisions_scored = new_scored,
        correct_decisions = new_correct,
        precision = new_precision,
        current_streak = new_streak,
        best_streak = new_best_streak,
        updated_at = now()
    where user_id = solver_uuid;

    if economy_enabled then
      payout_base := decision_row.base_reward;
      payout_bonus := case when verdict_value = 'correct' then decision_row.performance_bonus else 0 end;
      payout_total := payout_base + payout_bonus;
      total_solver_payout := total_solver_payout + payout_total;

      insert into public.solver_wallet_accounts (solver_id)
      values (solver_uuid)
      on conflict (solver_id) do nothing;

      select * into wallet_row
      from public.solver_wallet_accounts
      where solver_id = solver_uuid
      for update;

      update public.solver_earnings
      set bonus_amount = payout_bonus,
          total_amount = payout_total,
          status = 'available',
          available_at = now()
      where answer_id = answer_uuid;

      pending_release := payout_base;
      if not found then
        insert into public.solver_earnings (
          solver_id, decision_id, answer_id, base_amount, bonus_amount, total_amount, status, available_at
        ) values (
          solver_uuid, p_decision_id, answer_uuid, payout_base, payout_bonus, payout_total, 'available', now()
        );
        pending_release := 0;
      end if;

      update public.solver_wallet_accounts
      set pending_balance = greatest(0, pending_balance - pending_release),
          available_balance = available_balance + payout_total,
          lifetime_earned = lifetime_earned + payout_total,
          updated_at = now()
      where solver_id = solver_uuid
      returning * into wallet_row;

      update public.solver_profiles
      set earnings_total = earnings_total + payout_total,
          updated_at = now()
      where user_id = solver_uuid;

      insert into public.solver_wallet_events (
        solver_id, decision_id, answer_id, kind,
        pending_delta, available_delta, paid_delta, lifetime_delta,
        pending_after, available_after, paid_after, lifetime_after, description
      ) values (
        solver_uuid, p_decision_id, answer_uuid, 'decision_settlement',
        -pending_release, payout_total, 0, payout_total,
        wallet_row.pending_balance, wallet_row.available_balance, wallet_row.paid_balance, wallet_row.lifetime_earned,
        case when payout_bonus > 0 then 'Recompensa base + bono por acierto' else 'Recompensa base disponible' end
      );
    end if;
  end loop;

  if economy_enabled then
    platform_fee := round(total_solver_payout * decision_row.platform_fee_rate, 2);
    actual_cost := total_solver_payout + platform_fee;

    if actual_cost > decision_row.reserved_credits then
      raise exception 'ECONOMY_RESERVE_INCONSISTENT';
    end if;

    unused_reserve := decision_row.reserved_credits - actual_cost;

    select * into account_row
    from public.company_credit_accounts
    where company_id = decision_row.company_id
    for update;

    update public.company_credit_accounts
    set available_credits = available_credits + unused_reserve,
        reserved_credits = greatest(0, reserved_credits - decision_row.reserved_credits),
        spent_credits = spent_credits + actual_cost,
        updated_at = now()
    where company_id = decision_row.company_id
    returning * into account_row;

    insert into public.company_credit_events (
      company_id, decision_id, kind,
      available_delta, reserved_delta, spent_delta,
      available_after, reserved_after, spent_after, description
    ) values (
      decision_row.company_id, p_decision_id, 'decision_settlement',
      unused_reserve, -decision_row.reserved_credits, actual_cost,
      account_row.available_credits, account_row.reserved_credits, account_row.spent_credits,
      'Liquidación final: recompensas + fee de plataforma'
    );
  else
    actual_cost := 0;
  end if;

  update public.decisions
  set status = 'closed',
      closed_at = coalesce(closed_at, now()),
      final_cost = actual_cost,
      reserved_credits = 0
  where id = p_decision_id;
end;
$$;

-- Historial de ingresos seguro para el solucionador.
create or replace function public.get_my_earnings_history(p_limit integer default 100)
returns table (
  earning_id uuid,
  decision_id uuid,
  decision_title text,
  base_amount numeric,
  bonus_amount numeric,
  total_amount numeric,
  earning_status public.solver_earning_status,
  created_at timestamptz,
  available_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    se.id,
    se.decision_id,
    d.title,
    se.base_amount,
    se.bonus_amount,
    se.total_amount,
    se.status,
    se.created_at,
    se.available_at
  from public.solver_earnings se
  join public.decisions d on d.id = se.decision_id
  where se.solver_id = auth.uid()
  order by se.created_at desc
  limit greatest(1, least(coalesce(p_limit,100), 200));
$$;

revoke all on function public.get_my_earnings_history(integer) from public;
grant execute on function public.get_my_earnings_history(integer) to authenticated;

revoke all on function public.create_company_decision(text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,smallint,timestamptz) from public;
revoke all on function public.update_company_decision(uuid,text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,smallint,timestamptz) from public;
revoke all on function public.publish_company_decision(uuid) from public;
revoke all on function public.cancel_company_decision(uuid) from public;
revoke all on function public.close_company_decision(uuid) from public;
revoke all on function public.submit_decision_answer(uuid,text,text,smallint) from public;
revoke all on function public.evaluate_company_decision(uuid,text,text,smallint,jsonb) from public;

grant execute on function public.create_company_decision(text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,smallint,timestamptz) to authenticated;
grant execute on function public.update_company_decision(uuid,text,text,text,uuid,public.decision_difficulty,integer,numeric,numeric,smallint,timestamptz) to authenticated;
grant execute on function public.publish_company_decision(uuid) to authenticated;
grant execute on function public.cancel_company_decision(uuid) to authenticated;
grant execute on function public.close_company_decision(uuid) to authenticated;
grant execute on function public.submit_decision_answer(uuid,text,text,smallint) to authenticated;
grant execute on function public.evaluate_company_decision(uuid,text,text,smallint,jsonb) to authenticated;
