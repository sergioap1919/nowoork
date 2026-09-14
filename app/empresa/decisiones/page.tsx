import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCop, statusLabel, type DecisionStatus } from "@/lib/decisions";

export default async function CompanyDecisionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  const companyId = membership?.company_id as string | undefined;

  const { data: decisions = [] } = companyId
    ? await supabase
        .from("decisions")
        .select("id, title, status, difficulty, base_reward, solver_slots, reserved_credits, final_cost, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const ids = (decisions ?? []).map((decision) => decision.id);

  const [{ data: answers = [] }, { data: results = [] }] = ids.length
    ? await Promise.all([
        supabase
          .from("decision_answers")
          .select("decision_id")
          .in("decision_id", ids),
        supabase
          .from("decision_results")
          .select("decision_id")
          .in("decision_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const counts = new Map<string, number>();
  for (const answer of answers ?? []) {
    counts.set(
      answer.decision_id,
      (counts.get(answer.decision_id) ?? 0) + 1,
    );
  }

  const evaluatedIds = new Set(
    (results ?? []).map((result) => result.decision_id),
  );

  return (
    <main className="companyMain">
      <section className="pageIntro">
        <div>
          <span className="kicker">MARKETPLACE · EMPRESA</span>
          <h1>Tus decisiones.</h1>
          <p>
            Borradores, decisiones publicadas, resultados y criterios recibidos
            en un solo lugar.
          </p>
        </div>
        <Link
          className="primaryButton"
          href="/empresa/decisiones/nueva"
        >
          + Crear decisión
        </Link>
      </section>

      <section className="sectionBlock">
        {(decisions ?? []).length > 0 ? (
          <div className="companyDecisionTable">
            <div className="companyDecisionHeader">
              <span>Decisión</span>
              <span>Estado</span>
              <span>Respuestas</span>
              <span>Economía</span>
              <span />
            </div>

            {(decisions ?? []).map((decision) => (
              <div
                className="companyDecisionTableRow"
                key={decision.id}
              >
                <div>
                  <strong>{decision.title}</strong>
                  <small>
                    {new Date(decision.created_at).toLocaleDateString("es-CO")}
                  </small>
                </div>
                <span
                  className={`statusBadge ${
                    evaluatedIds.has(decision.id)
                      ? "evaluated"
                      : decision.status
                  }`}
                >
                  {evaluatedIds.has(decision.id)
                    ? "Evaluada"
                    : statusLabel(decision.status as DecisionStatus)}
                </span>
                <span>{counts.get(decision.id) ?? 0}</span>
                <span>
                  {evaluatedIds.has(decision.id)
                    ? `${formatCop(decision.final_cost)} final`
                    : Number(decision.reserved_credits) > 0
                      ? `${formatCop(decision.reserved_credits)} reservado`
                      : `${formatCop(decision.base_reward)} × ${decision.solver_slots ?? 3}`}
                </span>
                <Link href={`/empresa/decisiones/${decision.id}`}>
                  Abrir →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <strong>No hay decisiones todavía.</strong>
            <span>Crea la primera para activar tu marketplace.</span>
            <Link
              className="primaryButton small"
              href="/empresa/decisiones/nueva"
            >
              Crear decisión
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
