"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const specialties = [
  { label: "Marketing", value: "marketing" },
  { label: "E-commerce", value: "ecommerce" },
  { label: "Finanzas", value: "finanzas" },
  { label: "Economía", value: "economia" },
  { label: "Operaciones", value: "operaciones" },
  { label: "Tecnología", value: "tecnologia" },
];

export function SolverProfileForm({
  fullName,
  email,
  headline,
  yearsExperience,
  specialtySlug,
}: {
  fullName: string;
  email: string;
  headline: string;
  yearsExperience: number | null;
  specialtySlug: string;
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
    const yearsRaw = String(form.get("yearsExperience") || "").trim();

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("update_my_solver_profile", {
      p_full_name: String(form.get("fullName") || "").trim(),
      p_headline: String(form.get("headline") || "").trim(),
      p_years_experience: yearsRaw ? Number(yearsRaw) : null,
      p_specialty_slug: String(form.get("specialtySlug") || ""),
    });

    if (rpcError) {
      setError("No pudimos guardar tu perfil. Revisa los datos e intenta de nuevo.");
      setLoading(false);
      return;
    }

    setMessage("Perfil actualizado correctamente.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form className="profileForm" onSubmit={onSubmit}>
      <div className="profileFormGrid">
        <label>Nombre completo<input name="fullName" defaultValue={fullName} minLength={2} required /></label>
        <label>Correo<input value={email} disabled aria-label="Correo de la cuenta" /></label>
        <label>Especialidad principal<select name="specialtySlug" defaultValue={specialtySlug || "marketing"} required>{specialties.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Años de experiencia<input name="yearsExperience" type="number" min={0} max={70} defaultValue={yearsExperience ?? ""} placeholder="Ej. 5" /></label>
      </div>
      <label>Cómo describes tu fuerte<input name="headline" defaultValue={headline} placeholder="Ej. Meta Ads, performance y escalamiento" maxLength={120} /></label>
      {error && <div className="formMessage error">{error}</div>}
      {message && <div className="formMessage success">{message}</div>}
      <div className="profileActions"><button className="primaryButton" type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar cambios"}</button></div>
    </form>
  );
}
