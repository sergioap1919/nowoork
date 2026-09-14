import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyDecisionActions } from "@/components/CompanyDecisionActions";
import { CompanyDecisionForm } from "@/components/CompanyDecisionForm";
import { CompanyResultEvaluationForm } from "@/components/CompanyResultEvaluationForm";
import { createClient } from "@/lib/supabase/server";
import {
  difficultyLabel,
  estimateDecisionMaxCost,
  formatCop,
  statusLabel,
  verdictLabel,
  type AnswerVerdict,
  type DecisionDifficulty,
  type DecisionStatus,
  type SpecialtyOption,
} from "@/lib/decisions";

export default async function CompanyDecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: decision },
    { data: specialties = [] },
    { data: result },
  ] = await Promise.all([
    supabase
      .from("decisions")
      .select(
        "id, title, context, question, specialty_id, difficulty, expected_minutes, base_reward, performance_bonus, solver_slots, platform_fee_rate, reserved_credits, final_cost, economy_locked_at, status, deadline_at, created_at, published_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("specialties")
      .select("id, name, slug, parent_id")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("decision_results")
      .select(
        "actual_outcome, impact_summary, attribution_confidence, recorded_at",
      )
      .eq("decision_id", id)
      .maybeSingle(),
  ]);

  if (!decision) notFound();

  const { data: answers = [] } = await supabase
    .from("decision_answers")
    .select("id, recommendation, rationale, confidence, submitted_at")
    .eq("decision_id", id)
    .order("submitted_at", { ascending: false });

  const answerIds = (answers ?? []).map((answer) => answer.id);
  const { data: evaluations = [] } = answerIds.length
    ? await supabase
        .from("answer_evaluations")
        .select(
          "answer_id, verdict, evaluation_note, score_delta, evaluated_at",
        )
        .in("answer_id", answerIds)
    : { data: [] };

  const evaluationMap = new Map(
    (evaluations ?? []).map((evaluation) => [
      evaluation.answer_id,
      evaluation,
    ]),
  );

  const specialty = (specialties ?? []).find(
    (item) => item.id === decision.specialty_id,
  );
  const status = decision.status as DecisionStatus;
  const maxBudget = estimateDecisionMaxCost(
    Number(decision.base_reward),
    Number(decision.performance_bonus),
    Number(decision.solver_slots ?? 3),
    Number(decision.platform_fee_rate ?? 0.15),
  );

  return (
    <main className="companyMain compactCompanyMain">
      <section className="decisionPageHeader">
        <div>
          <Link href="/empresa/decisiones">← Decisiones</Link>
          <span className="kicker">
            {result ? "EVALUADA" : statusLabel(status).toUpperCase()}
          </span>
          <h1>{decision.title}</h1>
          <p>
            {specialty?.name ?? "General"} ·{" "}
            {difficultyLabel(decision.difficulty as DecisionDifficulty)} ·{" "}
            {decision.expected_minutes} min · {decision.solver_slots ?? 3} solucionadores
          </p>
        </div>
        {!result ? (
          <CompanyDecisionActions decisionId={decision.id} status={status} />
        ) : null}
      </section>

      {status === "draft" ? (
        <CompanyDecisionForm
          specialties={(specialties ?? []) as SpecialtyOption[]}
          initialDecision={{
            id: decision.id,
            title: decision.title,
            context: decision.context,
            question: decision.question,
            specialty_id: decision.specialty_id,
            difficulty: decision.difficulty as DecisionDifficulty,
            expected_minutes: decision.expected_minutes,
            base_reward: Number(decision.base_reward),
            performance_bonus: Number(decision.performance_bonus),
            solver_slots: Number(decision.solver_slots ?? 3),
            deadline_at: decision.deadline_at,
          }}
        />
      ) : (
        <>
          <section className="decisionReadGrid">
            <article>
              <span className="kicker">CONTEXTO</span>
              <p>{decision.context}</p>
            </article>
            <article>
              <span className="kicker">PREGUNTA</span>
              <h2>{decision.question}</h2>
            </article>
          </section>
          <section className="decisionFactStrip economyDecisionFacts">
            <div>
              <span>Base / solucionador</span>
              <strong>{formatCop(decision.base_reward)}</strong>
            </div>
            <div>
              <span>Bono por acierto</span>
              <strong>{formatCop(decision.performance_bonus)}</strong>
            </div>
            <div>
              <span>Cupos</span>
              <strong>{(answers ?? []).length} / {decision.solver_slots ?? 3}</strong>
            </div>
            <div>
              <span>{result ? "Costo final" : "Reservado"}</span>
              <strong>{formatCop(result ? decision.final_cost : decision.reserved_credits)}</strong>
            </div>
          </section>
          <section className="decisionEconomySummary">
            <div>
              <span>Exposición máxima al publicar</span>
              <strong>{formatCop(maxBudget.total)}</strong>
            </div>
            <div>
              <span>Fee provisional</span>
              <strong>{Math.round(Number(decision.platform_fee_rate ?? 0.15) * 100)}%</strong>
            </div>
            <p>{result ? "La decisión ya fue liquidada. El saldo no utilizado volvió a los créditos de la empresa." : decision.economy_locked_at ? "El presupuesto máximo está reservado. Solo se gastará lo correspondiente a respuestas, bonos obtenidos y fee." : "Esta decisión fue publicada antes de activar la economía. Para probar wallet y créditos crea una nueva decisión."}</p>
          </section>
        </>
      )}

      {result ? (
        <section className="verifiedResultBlock">
          <div className="verifiedResultHeading">
            <div>
              <span className="kicker">RESULTADO REGISTRADO</span>
              <h2>El ciclo ya fue evaluado.</h2>
            </div>
            <span className="confidenceBadge">
              {result.attribution_confidence}% atribución
            </span>
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
          <small>
            Registrado el{" "}
            {new Date(result.recorded_at).toLocaleString("es-CO")}
          </small>
        </section>
      ) : null}

      <section className="sectionBlock">
        <div className="sectionHeading">
          <div>
            <span className="kicker">CRITERIO RECIBIDO</span>
            <h2>{(answers ?? []).length} respuestas</h2>
          </div>
        </div>

        {(answers ?? []).length ? (
          <div className="answerReviewList">
            {(answers ?? []).map((answer, index) => {
              const evaluation = evaluationMap.get(answer.id);
              return (
                <article className="answerReview" key={answer.id}>
                  <div className="answerReviewTop">
                    <strong>Solucionador {index + 1}</strong>
                    <span>
                      {answer.confidence}% confianza ·{" "}
                      {new Date(answer.submitted_at).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <h3>{answer.recommendation}</h3>
                  <p>{answer.rationale}</p>
                  {evaluation ? (
                    <div className="answerEvaluationSummary">
                      <span className={`resultVerdict ${evaluation.verdict}`}>
                        {verdictLabel(evaluation.verdict as AnswerVerdict)}
                      </span>
                      <strong>
                        {evaluation.score_delta > 0 ? "+" : ""}
                        {evaluation.score_delta} score
                      </strong>
                      {evaluation.evaluation_note ? (
                        <p>{evaluation.evaluation_note}</p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="emptyState">
            <strong>Aún no hay respuestas.</strong>
            <span>
              {status === "draft"
                ? "Publica la decisión para que aparezca a solucionadores."
                : status === "published"
                  ? "La decisión ya está disponible en el marketplace."
                  : "Esta decisión terminó sin respuestas registradas."}
            </span>
          </div>
        )}
      </section>

      {!result &&
      (status === "published" || status === "closed") &&
      (answers ?? []).length > 0 ? (
        <section className="sectionBlock resultEvaluationSection">
          <CompanyResultEvaluationForm
            decisionId={decision.id}
            answers={(answers ?? []).map((answer) => ({
              id: answer.id,
              recommendation: answer.recommendation,
              confidence: answer.confidence,
            }))}
          />
        </section>
      ) : null}
    </main>
  );
}
