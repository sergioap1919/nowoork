import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyProfileForm } from "@/components/CompanyProfileForm";

export default async function CompanyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("company_members")
    .select("role, companies(id, name, sector)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const relation = membership?.companies as { id?: string; name?: string; sector?: string | null } | { id?: string; name?: string; sector?: string | null }[] | null | undefined;
  const company = Array.isArray(relation) ? relation[0] : relation;

  if (!company) redirect("/empresa");

  return (
    <main className="companyMain">
      <section className="pageIntro">
        <div><span className="kicker">PERFIL DE EMPRESA</span><h1>La identidad detrás de cada decisión.</h1><p>Estos datos identifican a tu organización dentro de Nowoork.</p></div>
      </section>
      <section className="profileSection">
        <div className="profileSectionIntro"><span className="kicker">INFORMACIÓN BÁSICA</span><h2>Tu cuenta y empresa</h2><p>El tipo de cuenta está bloqueado como Empresa. No puede cambiarse desde el navegador.</p></div>
        <CompanyProfileForm
          fullName={profile?.full_name || ""}
          email={profile?.email || user.email || ""}
          companyName={company.name || ""}
          sector={company.sector || ""}
        />
      </section>
    </main>
  );
}
