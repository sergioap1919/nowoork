"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ClaimLaunchCreditsButton() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function claim() {
    setLoading(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("claim_company_launch_credits");
    if (rpcError) {
      setError(
        rpcError.message.includes("LAUNCH_CREDITS_ALREADY_CLAIMED")
          ? "Los créditos de lanzamiento ya fueron reclamados."
          : rpcError.message,
      );
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="launchCreditAction">
      <button className="primaryButton" type="button" disabled={loading} onClick={claim}>
        {loading ? "Activando…" : "Activar $300.000 en créditos"}
      </button>
      {error ? <div className="formMessage error">{error}</div> : null}
    </div>
  );
}
