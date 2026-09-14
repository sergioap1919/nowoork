import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { verdictLabel, type AnswerVerdict } from "@/lib/decisions";

type ResultHistoryRow = {
  evaluation_id: string;
  decision_id: string;
  decision_title: string;
  specialty_name: string;
  recommendation: string;
  verdict: AnswerVerdict;
  actual_outcome: string;
  impact_summary: string;
  attribution_confidence: number;
  score_delta: number;
  evaluated_at: string;
};

export default async function ResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: solver },
    { data: historyData },
    { data: scoreEvents = [] },
  ] = await Promise.all([
    supabase
      .from("solver_profiles")
      .select(
        "score, decisions_scored, correct_decisions, precision, current_streak, best_streak",
      )
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase.rpc("get_my_result_history", { p_limit: 100 }),
    supabase
      .from("score_events")
      .select("delta, created_at")
      .eq("solver_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const history = (historyData ?? []) as ResultHistoryRow[];
  const incorrect = history.filter(
    (item) => item.verdict === "incorrect",
  ).length;
  const neutral = history.filter((item) => item.verdict === "neutral").length;
  const scoreChange = (scoreEvents ?? []).reduce(
    (sum, event) => sum + Number(event.delta ?? 0),
    0,
  );

  return (
    <div className="pageStack">
      <section className="pageIntro">
        <div>
          <span className="kicker">APRENDIZAJE VERIFICABLE</span>
          <h1>Tus resultados.</h1>
          <p>
            Cada fila viene de una decisión real, un resultado registrado y un
            evento de score auditable.
          </p>
        </div>
        <div className="rankHero">
          <span>Score actual</span>
          <strong>{solver?.score ?? 500}</strong>
          <small>
            Mejor racha: {solver?.best_streak ?? 0}
          </small>
        </div>
      </section>

      <section className="metricStrip">
        <div className="metric">
          <span>Aciertos</span>
          <strong>{solver?.correct_decisions ?? 0}</strong>
          <em>{Number(solver?.precision ?? 0).toFixed(1)}% precisión</em>
        </div>
        <div className="metric">
          <span>Desaciertos</span>
          <strong>{incorrect}</strong>
          <em>solo resultados concluyentes</em>
        </div>
        <div className="metric">
          <span>Neutrales</span>
          <strong>{neutral}</strong>
          <em>no alteran precisión</em>
        </div>
        <div className="metric">
          <span>Score acumulado</span>
          <strong>
            {scoreChange > 0 ? "+" : ""}
            {scoreChange}
          </strong>
          <em>{solver?.decisions_scored ?? 0} evaluaciones concluyentes</em>
        </div>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading">
          <div>
            <span className="kicker">HISTORIAL</span>
            <h2>Decisiones evaluadas</h2>
          </div>
        </div>

        {history.length ? (
          <div className="resultsTable verifiedResultsTable">
            <div className="tableHeader">
              <span>Especialidad</span>
              <span>Tu decisión</span>
              <span>Resultado</span>
              <span>Impacto</span>
              <span>Score</span>
            </div>
            {history.map((item) => (
              <Link
                href={`/app/decisiones/${item.decision_id}`}
                className="tableRow"
                key={item.evaluation_id}
              >
                <span>{item.specialty_name}</span>
                <strong>{item.recommendation}</strong>
                <span className={`status ${item.verdict}`}>
                  {verdictLabel(item.verdict)}
                </span>
                <span>{item.impact_summary}</span>
                <span
                  className={
                    item.score_delta > 0
                      ? "scorePositive"
                      : item.score_delta < 0
                        ? "scoreNegative"
                        : ""
                  }
                >
                  {item.score_delta > 0 ? "+" : ""}
                  {item.score_delta}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <strong>Todavía no tienes resultados evaluados.</strong>
            <span>
              Responde decisiones del marketplace. Cuando una empresa registre
              el resultado, aparecerá aquí y tu reputación se actualizará.
            </span>
            <Link className="primaryButton small" href="/app/decisiones">
              Explorar decisiones
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
