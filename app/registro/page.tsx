"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";

type Role = "solver" | "company";

const specialties = [
  { label: "Marketing", value: "marketing" },
  { label: "E-commerce", value: "ecommerce" },
  { label: "Finanzas", value: "finanzas" },
  { label: "Economía", value: "economia" },
  { label: "Operaciones", value: "operaciones" },
  { label: "Tecnología", value: "tecnologia" },
];

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get("role");
    if (requestedRole === "solver" || requestedRole === "company") {
      setRole(requestedRole);
    }
  }, []);


  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (!role) {
      setError("Elige si quieres usar Nowoork como solucionador o como empresa.");
      setLoading(false);
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const fullName = String(form.get("fullName") || "").trim();
    const specialtySlug = String(form.get("specialtySlug") || "");
    const subSpecialty = String(form.get("subSpecialty") || "").trim();
    const companyName = String(form.get("companyName") || "").trim();
    const sector = String(form.get("sector") || "").trim();

    const supabase = createClient();
    const nextPath = role === "company" ? "/empresa" : "/app";
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        data: {
          full_name: fullName,
          primary_role: role,
          specialty_slug: role === "solver" ? specialtySlug : null,
          sub_specialty: role === "solver" ? subSpecialty : null,
          company_name: role === "company" ? companyName : null,
          sector: role === "company" ? sector : null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace(nextPath);
      router.refresh();
      return;
    }

    setMessage("Cuenta creada. Revisa tu correo y confirma tu registro para entrar a Nowoork.");
    setLoading(false);
    event.currentTarget.reset();
  }

  return <div className="authPage">
    <div className="authBrand"><Link href="/"><Brand size="auth" priority /></Link></div>
    <div className="authContent wide">
      <span className="kicker">CREA TU PERFIL</span>
      <h1>¿Cómo quieres usar Nowoork?</h1>
      <div className="roleSelector">
        <button type="button" onClick={()=>setRole("solver")} className={role==="solver"?"active":""}><strong>Quiero resolver decisiones</strong><span>Usa tu experiencia, construye score y genera ingresos.</span></button>
        <button type="button" onClick={()=>setRole("company")} className={role==="company"?"active":""}><strong>Soy una empresa</strong><span>Obtén criterio humano en los momentos que importan.</span></button>
      </div>
      {role ? <form className="authForm" onSubmit={onSubmit}>
        <label>Tu nombre completo<input name="fullName" placeholder="Tu nombre" required /></label>
        {role === "solver" ? <>
          <label>Especialidad principal<select name="specialtySlug" defaultValue="marketing" required>{specialties.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Subespecialidad<input name="subSpecialty" placeholder="Ej. Meta Ads" /></label>
        </> : <>
          <label>Nombre de la empresa<input name="companyName" placeholder="Empresa" required /></label>
          <label>Sector<input name="sector" placeholder="Ej. Ecommerce" required /></label>
        </>}
        <label>Correo<input name="email" type="email" placeholder={role === "company" ? "tu@empresa.com" : "tu@correo.com"} required autoComplete="email" /></label>
        <label>Contraseña<input name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required autoComplete="new-password" /></label>
        {error && <div className="formMessage error">{error}</div>}
        {message && <div className="formMessage success">{message}</div>}
        <button className="primaryButton full" type="submit" disabled={loading}>{loading ? "Creando cuenta…" : role === "solver" ? "Crear perfil" : "Crear empresa"}</button>
      </form> : <div className="rolePrompt">Elige una opción para continuar con la creación de tu cuenta.</div>}
      <small>¿Ya tienes cuenta? <Link href="/login">Entrar</Link></small>
    </div>
  </div>;
}
