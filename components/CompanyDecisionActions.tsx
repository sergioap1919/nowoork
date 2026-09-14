"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DecisionStatus } from "@/lib/decisions";

function humanizeError(message: string) {
  if (message.includes("INSUFFICIENT_CREDITS")) return "No tienes créditos suficientes para reservar esta decisión. Revisa Créditos antes de publicarla.";
  if (message.includes("BASE_REWARD_MINIMUM_1000")) return "La recompensa base mínima para publicar es de $1.000 COP por solucionador.";
  if (message.includes("DECISION_HAS_ANSWERS_CLOSE_AND_EVALUATE")) return "Esta decisión ya recibió respuestas. Debes cerrarla y evaluar el resultado; no se puede cancelar.";
  if (message.includes("DECISION_NOT_PUBLISHABLE")) return "La decisión no cumple las condiciones para publicarse. Revisa contenido y fecha límite.";
  return message;
}

export function CompanyDecisionActions({
  decisionId,
  status,
}: {
  decisionId: string;
  status: DecisionStatus;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(action: "publish" | "cancel" | "close") {
    const confirmation =
      action === "publish"
        ? "¿Publicar esta decisión? Nowoork reservará el presupuesto máximo indicado. El excedente no utilizado volverá a tus créditos al liquidarla."
        : action === "cancel"
          ? "¿Cancelar esta decisión? Si ya fue publicada solo podrá cancelarse si todavía no recibió respuestas."
          : "¿Cerrar esta decisión? No recibirá nuevas respuestas. Si ya hay respuestas, el presupuesto seguirá reservado hasta registrar el resultado.";

    if (!window.confirm(confirmation)) return;
    setLoading(action);
    setError("");

    const functionName =
      action === "publish"
        ? "publish_company_decision"
        : action === "cancel"
          ? "cancel_company_decision"
          : "close_company_decision";
    const { error: rpcError } = await supabase.rpc(functionName, {
      p_decision_id: decisionId,
    });
    if (rpcError) {
      setError(humanizeError(rpcError.message));
      setLoading(null);
      return;
    }

    router.refresh();
    setLoading(null);
  }

  return (
    <div className="decisionActionArea">
      <div className="decisionActionButtons">
        {status === "draft" ? (
          <button className="primaryButton" disabled={!!loading} onClick={() => run("publish")}>
            {loading === "publish" ? "Publicando…" : "Publicar decisión"}
          </button>
        ) : null}
        {status === "published" ? (
          <button className="secondaryButton" disabled={!!loading} onClick={() => run("close")}>
            {loading === "close" ? "Cerrando…" : "Cerrar decisión"}
          </button>
        ) : null}
        {status === "draft" || status === "published" ? (
          <button className="dangerTextButton" disabled={!!loading} onClick={() => run("cancel")}>
            {loading === "cancel" ? "Cancelando…" : "Cancelar"}
          </button>
        ) : null}
      </div>
      {error ? (
        <div className="formMessage error decisionActionError">
          <span>{error}</span>
          {error.includes("créditos") ? <Link href="/empresa/creditos">Ir a Créditos →</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
