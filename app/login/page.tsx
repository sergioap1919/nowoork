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
      setError(authError.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : "No pudimos iniciar sesión. Intenta nuevamente.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("primary_role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      setError("No pudimos cargar tu perfil de Nowoork. Intenta nuevamente.");
      setLoading(false);
      return;
    }

    if (!profile) {
      await supabase.auth.signOut();
      setError("Tu cuenta existe, pero su perfil de Nowoork no está disponible.");
      setLoading(false);
      return;
    }

    const home = profile.primary_role === "company" ? "/empresa" : "/app";
    const requested = searchParams.get("next");
    const requestedIsValid = profile.primary_role === "company"
      ? requested?.startsWith("/empresa")
      : requested?.startsWith("/app");

    router.replace(requestedIsValid && requested ? requested : home);
    router.refresh();
  }

  const urlError = searchParams.get("error");

  return <div className="authContent">
    <span className="kicker">BIENVENIDO</span>
    <h1>Entra a Nowoork.</h1>
    <p>Continúa construyendo el valor de tu criterio.</p>
    {urlError === "confirmation" && <div className="formMessage error">No pudimos validar ese enlace. Solicita uno nuevo o intenta iniciar sesión.</div>}
    {urlError === "profile" && <div className="formMessage error">No pudimos cargar tu perfil de Nowoork. Vuelve a intentarlo.</div>}
    <form className="authForm" onSubmit={onSubmit}>
      <label>Correo<input type="email" placeholder="tu@correo.com" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" /></label>
      <label>Contraseña<input type="password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={8} autoComplete="current-password" /></label>
      <div className="authInlineLink"><Link href="/recuperar">¿Olvidaste tu contraseña?</Link></div>
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
