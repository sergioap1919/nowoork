import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyDecisionActions } from "@/components/CompanyDecisionActions";
import { CompanyDecisionForm } from "@/components/CompanyDecisionForm";
import { CompanyResultEvaluationForm } from "@/components/CompanyResultEvaluationForm";
import { createClient } from "@/lib/supabase/server";
import {
  difficultyLabel,
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
        "id, title, context, question, specialty_id, difficulty, expected_minutes, base_reward, performance_bonus, status, deadline_at, created_at, published_at",
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
            {decision.expected_minutes} min
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
          <section className="decisionFactStrip">
            <div>
              <span>Recompensa</span>
              <strong>{formatCop(decision.base_reward)}</strong>
            </div>
            <div>
              <span>Bono</span>
              <strong>{formatCop(decision.performance_bonus)}</strong>
            </div>
            <div>
              <span>Fecha límite</span>
              <strong>
                {decision.deadline_at
                  ? new Date(decision.deadline_at).toLocaleString("es-CO")
                  : "Sin límite"}
              </strong>
            </div>
            <div>
              <span>Respuestas</span>
              <strong>{(answers ?? []).length}</strong>
            </div>
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
                      <span
                        className={`resultVerdict ${evaluation.verdict}`}
                      >
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
