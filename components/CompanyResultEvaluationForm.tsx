"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AnswerVerdict } from "@/lib/decisions";

type AnswerForEvaluation = {
  id: string;
  recommendation: string;
  confidence: number;
};

type EvaluationState = {
  verdict: AnswerVerdict | "";
  note: string;
};

export function CompanyResultEvaluationForm({
  decisionId,
  answers,
}: {
  decisionId: string;
  answers: AnswerForEvaluation[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [actualOutcome, setActualOutcome] = useState("");
  const [impactSummary, setImpactSummary] = useState("");
  const [attributionConfidence, setAttributionConfidence] = useState(80);
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationState>>(
    () =>
      Object.fromEntries(
        answers.map((answer) => [answer.id, { verdict: "", note: "" }]),
      ),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateEvaluation(
    answerId: string,
    field: keyof EvaluationState,
    value: string,
  ) {
    setEvaluations((current) => ({
      ...current,
      [answerId]: {
        ...current[answerId],
        [field]: value,
      },
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (actualOutcome.trim().length < 8) {
      setError("Describe brevemente qué ocurrió en realidad.");
      return;
    }

    if (impactSummary.trim().length < 8) {
      setError("Describe el impacto observado.");
      return;
    }

    const missingVerdict = answers.some(
      (answer) => !evaluations[answer.id]?.verdict,
    );
    if (missingVerdict) {
      setError("Debes evaluar todas las respuestas antes de cerrar el resultado.");
      return;
    }

    const confirmed = window.confirm(
      "¿Registrar este resultado? La evaluación será definitiva, actualizará score y wallet, y liquidará los créditos reservados de la empresa.",
    );
    if (!confirmed) return;

    setLoading(true);

    const payload = answers.map((answer) => ({
      answer_id: answer.id,
      verdict: evaluations[answer.id].verdict,
      note: evaluations[answer.id].note.trim() || null,
    }));

    const { error: rpcError } = await supabase.rpc("evaluate_company_decision", {
      p_decision_id: decisionId,
      p_actual_outcome: actualOutcome.trim(),
      p_impact_summary: impactSummary.trim(),
      p_attribution_confidence: attributionConfidence,
      p_evaluations: payload,
    });

    if (rpcError) {
      const message =
        rpcError.message.includes("DECISION_ALREADY_EVALUATED")
          ? "Esta decisión ya fue evaluada."
          : rpcError.message.includes("ALL_ANSWERS_MUST_BE_EVALUATED")
            ? "Todas las respuestas deben evaluarse en una sola operación."
            : rpcError.message.includes("NO_ANSWERS_TO_EVALUATE")
              ? "No hay respuestas para evaluar."
              : rpcError.message;
      setError(message);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <form className="resultEvaluationForm" onSubmit={submit}>
      <div className="resultEvaluationIntro">
        <span className="kicker">RESULTADO REAL</span>
        <h2>Cierra el ciclo de esta decisión.</h2>
        <p>
          Registra qué ocurrió y luego clasifica cada criterio recibido. Nowoork
          actualizará reputación y wallet, pagará bonos por acierto y devolverá
          a la empresa cualquier crédito reservado que no se haya utilizado.
        </p>
      </div>

      <div className="resultOutcomeGrid">
        <label>
          Qué ocurrió realmente
          <textarea
            rows={4}
            value={actualOutcome}
            onChange={(event) => setActualOutcome(event.target.value)}
            placeholder="Ej. Se mantuvo el presupuesto y se cambió el creativo. El CPA bajó durante los siguientes 5 días."
          />
        </label>
        <label>
          Impacto observado
          <textarea
            rows={4}
            value={impactSummary}
            onChange={(event) => setImpactSummary(event.target.value)}
            placeholder="Ej. CPA -18%, CTR +12% y volumen de compras estable."
          />
        </label>
      </div>

      <label className="attributionField">
        <span>
          Confianza de atribución
          <strong>{attributionConfidence}%</strong>
        </span>
        <input
          type="range"
          min="1"
          max="100"
          value={attributionConfidence}
          onChange={(event) =>
            setAttributionConfidence(Number(event.target.value))
          }
        />
        <small>
          Cuanto menor sea esta confianza, menor será el impacto de la evaluación
          sobre el score.
        </small>
      </label>

      <div className="evaluationList">
        {answers.map((answer, index) => {
          const state = evaluations[answer.id] ?? {
            verdict: "",
            note: "",
          };
          return (
            <article className="evaluationItem" key={answer.id}>
              <div className="evaluationItemTop">
                <div>
                  <span>Respuesta {index + 1}</span>
                  <strong>{answer.recommendation}</strong>
                </div>
                <small>{answer.confidence}% confianza del solucionador</small>
              </div>

              <div className="verdictPicker" role="group" aria-label={`Evaluar respuesta ${index + 1}`}>
                {[
                  ["correct", "Acierto"],
                  ["neutral", "Neutral"],
                  ["incorrect", "Desacierto"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    className={state.verdict === value ? `selected ${value}` : ""}
                    key={value}
                    onClick={() =>
                      updateEvaluation(
                        answer.id,
                        "verdict",
                        value as AnswerVerdict,
                      )
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label>
                Nota de evaluación <span>opcional</span>
                <input
                  value={state.note}
                  onChange={(event) =>
                    updateEvaluation(answer.id, "note", event.target.value)
                  }
                  placeholder="Qué hizo acertada, neutral o incorrecta esta respuesta."
                />
              </label>
            </article>
          );
        })}
      </div>

      {error ? <div className="formMessage error">{error}</div> : null}

      <div className="resultEvaluationActions">
        <span>
          Esta acción es definitiva: genera eventos de score y movimientos económicos auditables.
        </span>
        <button className="primaryButton" disabled={loading} type="submit">
          {loading ? "Registrando resultado…" : "Registrar resultado y evaluar"}
        </button>
      </div>
    </form>
  );
}
