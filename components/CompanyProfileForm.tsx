"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CompanyProfileForm({
  fullName,
  email,
  companyName,
  sector,
}: {
  fullName: string;
  email: string;
  companyName: string;
  sector: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("update_my_company_profile", {
      p_full_name: String(form.get("fullName") || "").trim(),
      p_company_name: String(form.get("companyName") || "").trim(),
      p_sector: String(form.get("sector") || "").trim(),
    });

    if (rpcError) {
      setError("No pudimos guardar los cambios. Revisa los datos e intenta de nuevo.");
      setLoading(false);
      return;
    }

    setMessage("Perfil de empresa actualizado correctamente.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form className="profileForm" onSubmit={onSubmit}>
      <div className="profileFormGrid">
        <label>Tu nombre completo<input name="fullName" defaultValue={fullName} minLength={2} required /></label>
        <label>Correo<input value={email} disabled aria-label="Correo de la cuenta" /></label>
        <label>Nombre de la empresa<input name="companyName" defaultValue={companyName} minLength={2} required /></label>
        <label>Sector<input name="sector" defaultValue={sector} placeholder="Ej. Ecommerce" maxLength={100} /></label>
      </div>
      {error && <div className="formMessage error">{error}</div>}
      {message && <div className="formMessage success">{message}</div>}
      <div className="profileActions"><button className="primaryButton" type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar cambios"}</button></div>
    </form>
  );
}
