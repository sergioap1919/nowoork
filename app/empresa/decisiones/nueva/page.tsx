import Link from "next/link";
import { CompanyDecisionForm } from "@/components/CompanyDecisionForm";
import { createClient } from "@/lib/supabase/server";
import type { SpecialtyOption } from "@/lib/decisions";

export default async function NewCompanyDecisionPage() {
  const supabase = await createClient();
  const { data: specialties = [] } = await supabase.from("specialties").select("id, name, slug, parent_id").eq("is_active", true).order("name");

  return <main className="companyMain compactCompanyMain">
    <section className="decisionPageHeader"><div><Link href="/empresa/decisiones">← Decisiones</Link><span className="kicker">NUEVA DECISIÓN</span><h1>Convierte una situación en una pregunta útil.</h1><p>Entrega contexto suficiente para que una persona pueda decidir sin tener que conocer toda tu operación.</p></div></section>
    <CompanyDecisionForm specialties={(specialties ?? []) as SpecialtyOption[]} />
  </main>;
}
