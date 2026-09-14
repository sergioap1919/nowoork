"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/nueva-contrasena")}`,
    });

    if (resetError) {
      setError("No pudimos enviar el enlace. Intenta nuevamente.");
      setLoading(false);
      return;
    }

    setMessage("Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.");
    setLoading(false);
  }

  return (
    <div className="authPage">
      <div className="authBrand"><Link href="/"><Brand size="auth" priority /></Link></div>
      <div className="authContent">
        <span className="kicker">RECUPERAR ACCESO</span>
        <h1>Recupera tu cuenta.</h1>
        <p>Te enviaremos un enlace seguro para definir una nueva contraseña.</p>
        <form className="authForm" onSubmit={onSubmit}>
          <label>Correo<input name="email" type="email" placeholder="tu@correo.com" required autoComplete="email" /></label>
          {error && <div className="formMessage error">{error}</div>}
          {message && <div className="formMessage success">{message}</div>}
          <button className="primaryButton full" type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar enlace"}</button>
        </form>
        <small><Link href="/login">← Volver a iniciar sesión</Link></small>
      </div>
    </div>
  );
}
