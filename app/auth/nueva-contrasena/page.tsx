"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");

    if (password.length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("El enlace no es válido o ya venció. Solicita uno nuevo.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
  }

  return (
    <div className="authPage">
      <div className="authBrand"><Link href="/"><Brand size="auth" priority /></Link></div>
      <div className="authContent">
        <span className="kicker">NUEVA CONTRASEÑA</span>
        <h1>Define una nueva clave.</h1>
        {!done ? <>
          <p>Usa mínimo 8 caracteres y evita reutilizar una contraseña de otro servicio.</p>
          <form className="authForm" onSubmit={onSubmit}>
            <label>Nueva contraseña<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
            <label>Confirmar contraseña<input name="confirmation" type="password" minLength={8} required autoComplete="new-password" /></label>
            {error && <div className="formMessage error">{error}</div>}
            <button className="primaryButton full" type="submit" disabled={loading}>{loading ? "Actualizando…" : "Actualizar contraseña"}</button>
          </form>
        </> : <div className="passwordDone"><div className="formMessage success">Contraseña actualizada correctamente.</div><Link className="primaryButton full" href="/login">Iniciar sesión</Link></div>}
      </div>
    </div>
  );
}
