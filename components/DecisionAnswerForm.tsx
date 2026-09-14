"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DecisionAnswerForm({ decisionId }: { decisionId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [recommendation, setRecommendation] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState(75);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("¿Enviar esta decisión? Después no podrás reemplazarla.")) return;
    setLoading(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("submit_decision_answer", {
      p_decision_id: decisionId,
      p_recommendation: recommendation,
      p_rationale: rationale,
      p_confidence: confidence,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return <form className="answerForm" onSubmit={handleSubmit}>
    <label>Tu decisión<textarea required minLength={5} rows={3} value={recommendation} onChange={event => setRecommendation(event.target.value)} placeholder="Escribe qué harías."/></label>
    <label>Por qué<textarea required minLength={10} rows={6} value={rationale} onChange={event => setRationale(event.target.value)} placeholder="Explica el razonamiento que sostiene tu decisión."/></label>
    <label className="confidenceField"><span>Confianza en tu criterio <strong>{confidence}%</strong></span><input type="range" min="1" max="100" value={confidence} onChange={event => setConfidence(Number(event.target.value))}/></label>
    {error ? <div className="formMessage error">{error}</div> : null}
    <div className="answerActions"><span>Una respuesta por solucionador. El resultado se evaluará en ZIP 03.</span><button className="primaryButton" disabled={loading}>{loading ? "Enviando…" : "Enviar decisión"}</button></div>
  </form>;
}
