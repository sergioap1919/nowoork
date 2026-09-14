"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DecisionStatus } from "@/lib/decisions";

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
        ? "¿Publicar esta decisión en el marketplace? Después ya no podrás editar su contenido."
        : action === "cancel"
          ? "¿Cancelar esta decisión? Dejará de estar disponible para solucionadores."
          : "¿Cerrar esta decisión? No recibirá nuevas respuestas.";

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
      setError(rpcError.message);
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
          <button
            className="primaryButton"
            disabled={!!loading}
            onClick={() => run("publish")}
          >
            {loading === "publish" ? "Publicando…" : "Publicar decisión"}
          </button>
        ) : null}
        {status === "published" ? (
          <button
            className="secondaryButton"
            disabled={!!loading}
            onClick={() => run("close")}
          >
            {loading === "close" ? "Cerrando…" : "Cerrar decisión"}
          </button>
        ) : null}
        {status === "draft" || status === "published" ? (
          <button
            className="dangerTextButton"
            disabled={!!loading}
            onClick={() => run("cancel")}
          >
            {loading === "cancel" ? "Cancelando…" : "Cancelar"}
          </button>
        ) : null}
      </div>
      {error ? <div className="formMessage error">{error}</div> : null}
    </div>
  );
}
