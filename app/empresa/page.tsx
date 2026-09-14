import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { statusLabel, type DecisionStatus } from "@/lib/decisions";

export default async function Company() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies(name)")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  const companyId = membership?.company_id as string | undefined;
  const companyRelation = membership?.companies as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  const company = Array.isArray(companyRelation)
    ? companyRelation[0]
    : companyRelation;

  const { data: decisions = [] } = companyId
    ? await supabase
        .from("decisions")
        .select("id, title, status, created_at, published_at")
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

  const answerCount = new Map<string, number>();
  for (const answer of answers ?? []) {
    answerCount.set(
      answer.decision_id,
      (answerCount.get(answer.decision_id) ?? 0) + 1,
    );
  }

  const evaluatedIds = new Set(
    (results ?? []).map((result) => result.decision_id),
  );

  const open = (decisions ?? []).filter(
    (item) => item.status === "published",
  ).length;
  const drafts = (decisions ?? []).filter(
    (item) => item.status === "draft",
  ).length;
  const totalAnswers = (answers ?? []).length;
  const evaluated = evaluatedIds.size;

  return (
    <main className="companyMain">
      <section className="pageIntro">
        <div>
          <span className="kicker">
            EMPRESA · {company?.name || "NOWOORK"}
          </span>
          <h1>Decisiones que esperan criterio.</h1>
          <p>
            Crea situaciones reales, publícalas y cierra el ciclo con resultados
            verificables.
          </p>
        </div>
        <Link
          className="primaryButton"
          href="/empresa/decisiones/nueva"
        >
          + Crear decisión
        </Link>
      </section>

      <section className="metricStrip">
        <div className="metric">
          <span>Publicadas</span>
          <strong>{open}</strong>
          <em>recibiendo criterio</em>
        </div>
        <div className="metric">
          <span>Borradores</span>
          <strong>{drafts}</strong>
          <em>por completar</em>
        </div>
        <div className="metric">
          <span>Respuestas</span>
          <strong>{totalAnswers}</strong>
          <em>criterios recibidos</em>
        </div>
        <div className="metric">
          <span>Evaluadas</span>
          <strong>{evaluated}</strong>
          <em>con resultado registrado</em>
        </div>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading">
          <div>
            <span className="kicker">ACTIVIDAD</span>
            <h2>Decisiones recientes</h2>
          </div>
          <Link href="/empresa/decisiones">Ver todas →</Link>
        </div>

        {(decisions ?? []).length > 0 ? (
          <div className="companyDecisionList">
            {(decisions ?? []).slice(0, 6).map((decision) => (
              <Link
                href={`/empresa/decisiones/${decision.id}`}
                className="companyDecision"
                key={decision.id}
              >
                <div>
                  <span
                    className={`statusDot ${decision.status}`}
                  />
                  <strong>{decision.title}</strong>
                  <p>
                    {evaluatedIds.has(decision.id)
                      ? "Evaluada"
                      : statusLabel(decision.status as DecisionStatus)}
                    {" · "}
                    {answerCount.get(decision.id) ?? 0} respuestas
                  </p>
                </div>
                <span>
                  {new Date(decision.created_at).toLocaleDateString("es-CO")}
                </span>
                <b>Revisar →</b>
              </Link>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <strong>Aún no has creado decisiones.</strong>
            <span>
              Empieza con una situación concreta que necesite criterio humano.
            </span>
            <Link
              className="primaryButton small"
              href="/empresa/decisiones/nueva"
            >
              Crear primera decisión
            </Link>
          </div>
        )}
      </section>

      <section className="futureDataBlock">
        <div>
          <span className="kicker">CICLO DE APRENDIZAJE</span>
          <h2>Pregunta, recibe criterio y registra qué ocurrió.</h2>
        </div>
        <p>
          Cada resultado evaluado alimenta la reputación del solucionador. Más
          adelante Shopify, Meta y la IA automatizarán la evidencia y la
          atribución.
        </p>
      </section>
    </main>
  );
}
