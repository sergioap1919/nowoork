"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : authError.message);
      setLoading(false);
      return;
    }

    const requested = searchParams.get("next");
    const role = data.user?.user_metadata?.primary_role;
    const fallback = role === "company" ? "/empresa" : "/app";
    router.replace(requested || fallback);
    router.refresh();
  }

  return <div className="authContent">
    <span className="kicker">BIENVENIDO</span>
    <h1>Entra a Nowoork.</h1>
    <p>Continúa construyendo el valor de tu criterio.</p>
    {searchParams.get("error") === "confirmation" && <div className="formMessage error">No pudimos confirmar tu correo. Intenta de nuevo.</div>}
    <form className="authForm" onSubmit={onSubmit}>
      <label>Correo<input type="email" placeholder="tu@correo.com" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" /></label>
      <label>Contraseña<input type="password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8} autoComplete="current-password" /></label>
      {error && <div className="formMessage error">{error}</div>}
      <button className="primaryButton full" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
    </form>
    <small>¿Aún no tienes cuenta? <Link href="/registro">Crear cuenta</Link></small>
  </div>;
}

export default function Login() {
  return <div className="authPage">
    <div className="authBrand"><Link href="/"><Brand size="auth" priority /></Link></div>
    <Suspense fallback={<div className="authContent"><span className="kicker">NOWOORK</span><h1>Cargando…</h1></div>}><LoginForm /></Suspense>
  </div>;
}
