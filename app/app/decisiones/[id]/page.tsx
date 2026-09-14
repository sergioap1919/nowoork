import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionAnswerForm } from "@/components/DecisionAnswerForm";
import { createClient } from "@/lib/supabase/server";
import {
  categoryForSpecialty,
  difficultyLabel,
  formatCop,
  verdictLabel,
  type AnswerVerdict,
  type DecisionDifficulty,
  earningStatusLabel,
  type SolverEarningStatus,
  type SpecialtyOption,
} from "@/lib/decisions";

export default async function SolverDecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: decision },
    { data: specialties = [] },
    { data: answer },
    { data: result },
  ] = await Promise.all([
    supabase
      .from("decisions")
      .select(
        "id, company_id, title, context, question, specialty_id, difficulty, expected_minutes, base_reward, performance_bonus, deadline_at, companies(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("specialties")
      .select("id, name, slug, parent_id")
      .eq("is_active", true),
    supabase
      .from("decision_answers")
      .select("id, recommendation, rationale, confidence, submitted_at")
      .eq("decision_id", id)
      .eq("solver_id", user!.id)
      .maybeSingle(),
    supabase
      .from("decision_results")
      .select(
        "actual_outcome, impact_summary, attribution_confidence, recorded_at",
      )
      .eq("decision_id", id)
      .maybeSingle(),
  ]);

  if (!decision) notFound();

  const { data: evaluation } = answer
    ? await supabase
        .from("answer_evaluations")
        .select("verdict, evaluation_note, score_delta, evaluated_at")
        .eq("answer_id", answer.id)
        .maybeSingle()
    : { data: null };

  const { data: earning } = answer
    ? await supabase
        .from("solver_earnings")
        .select("base_amount, bonus_amount, total_amount, status, available_at")
        .eq("answer_id", answer.id)
        .maybeSingle()
    : { data: null };

  const specialtyList = (specialties ?? []) as SpecialtyOption[];
  const specialty = specialtyList.find(
    (item) => item.id === decision.specialty_id,
  );
  const companyRelation = decision.companies as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  const company = Array.isArray(companyRelation)
    ? companyRelation[0]
    : companyRelation;

  const { data: reputationRows } = await supabase.rpc("get_company_reputation", {
    p_company_id: decision.company_id,
  });
  const reputation = Array.isArray(reputationRows) ? reputationRows[0] : null;

  return (
    <div className="pageStack decisionDetailPage">
      <section className="decisionPageHeader solverDecisionHeader">
        <div>
          <Link href="/app/decisiones">← Marketplace</Link>
          <span className="kicker">
            {categoryForSpecialty(
              decision.specialty_id,
              specialtyList,
            ).toUpperCase()}{" "}
            · {specialty?.name?.toUpperCase() ?? "GENERAL"}
          </span>
          <h1>{decision.title}</h1>
          <p>
            {company?.name ?? "Empresa Nowoork"} ·{" "}
            {difficultyLabel(decision.difficulty as DecisionDifficulty)} ·{" "}
            {decision.expected_minutes} min
          </p>
        </div>
        <div className="decisionRewardHero">
          <span>Recompensa</span>
          <strong>{formatCop(decision.base_reward)}</strong>
          {Number(decision.performance_bonus) > 0 ? (
            <small>
              + {formatCop(decision.performance_bonus)} por resultado
            </small>
          ) : null}
        </div>
      </section>

      <section className="companyReputationStrip">
        <div>
          <span>Empresa</span>
          <strong>{company?.name ?? "Empresa Nowoork"}</strong>
        </div>
        <div>
          <span>Decisiones evaluadas</span>
          <strong>{Number(reputation?.evaluated_decisions ?? 0)}</strong>
        </div>
        <div>
          <span>Tasa de cierre</span>
          <strong>{Number(reputation?.completion_rate ?? 0).toFixed(0)}%</strong>
        </div>
        <div>
          <span>Respuestas recibidas</span>
          <strong>{Number(reputation?.total_answers ?? 0)}</strong>
        </div>
      </section>

      <section className="decisionReadGrid">
        <article>
          <span className="kicker">CONTEXTO</span>
          <p>{decision.context}</p>
        </article>
        <article>
          <span className="kicker">DECISIÓN</span>
          <h2>{decision.question}</h2>
          {decision.deadline_at ? (
            <small>
              Disponible hasta{" "}
              {new Date(decision.deadline_at).toLocaleString("es-CO")}
            </small>
          ) : null}
        </article>
      </section>

      <section className="answerSection">
        <div className="answerSectionIntro">
          <span className="kicker">TU CRITERIO</span>
          <h2>{answer ? "Respuesta enviada." : "¿Qué harías tú?"}</h2>
          <p>
            {answer
              ? evaluation
                ? "Esta respuesta ya tiene un resultado verificable y su impacto quedó reflejado en tu reputación."
                : "Tu respuesta quedó registrada. Cuando la empresa cierre el resultado, Nowoork actualizará tu reputación."
              : "Decide con la información disponible y explica por qué. La calidad del razonamiento importa tanto como la respuesta."}
          </p>
        </div>

        {answer ? (
          <article className="submittedAnswer">
            <div>
              <span>Tu decisión</span>
              <strong>{answer.recommendation}</strong>
            </div>
            <div>
              <span>Razonamiento</span>
              <p>{answer.rationale}</p>
            </div>
            <div className="submittedAnswerMeta">
              <span>{answer.confidence}% confianza</span>
              <span>
                {new Date(answer.submitted_at).toLocaleString("es-CO")}
              </span>
            </div>
          </article>
        ) : (
          <DecisionAnswerForm decisionId={decision.id} />
        )}
      </section>

      {answer && earning ? (
        <section className="solverEarningNotice">
          <div>
            <span className="kicker">RECOMPENSA</span>
            <strong>{earningStatusLabel(earning.status as SolverEarningStatus)}</strong>
          </div>
          <div><span>Base</span><strong>{formatCop(earning.base_amount)}</strong></div>
          <div><span>Bono</span><strong>{formatCop(earning.bonus_amount)}</strong></div>
          <div><span>Total</span><strong>{formatCop(earning.total_amount)}</strong></div>
          <Link href="/app/ingresos">Ver ingresos →</Link>
        </section>
      ) : null}

      {answer && !evaluation ? (
        <section className="pendingResultNotice">
          <span className="kicker">PENDIENTE DE RESULTADO</span>
          <strong>Tu criterio está esperando validación.</strong>
          <p>
            No afecta tu precisión ni tu score hasta que exista un resultado
            registrado.
          </p>
        </section>
      ) : null}

      {answer && evaluation && result ? (
        <section className="solverVerifiedResult">
          <div className="solverResultHero">
            <div>
              <span className="kicker">RESULTADO VERIFICADO</span>
              <h2>
                {verdictLabel(evaluation.verdict as AnswerVerdict)}
              </h2>
            </div>
            <div
              className={`scoreDelta ${
                evaluation.score_delta > 0
                  ? "positive"
                  : evaluation.score_delta < 0
                    ? "negative"
                    : "neutral"
              }`}
            >
              <span>Impacto en score</span>
              <strong>
                {evaluation.score_delta > 0 ? "+" : ""}
                {evaluation.score_delta}
              </strong>
            </div>
          </div>
          <div className="verifiedResultGrid">
            <article>
              <span>Qué ocurrió</span>
              <p>{result.actual_outcome}</p>
            </article>
            <article>
              <span>Impacto observado</span>
              <p>{result.impact_summary}</p>
            </article>
          </div>
          <div className="resultMetaLine">
            <span>
              Confianza de atribución: {result.attribution_confidence}%
            </span>
            {evaluation.evaluation_note ? (
              <span>Evaluación: {evaluation.evaluation_note}</span>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
