import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SolverProfileForm } from "@/components/SolverProfileForm";

export default async function SolverProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: solver }, { data: specialty }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    supabase.from("solver_profiles").select("headline, years_experience").eq("user_id", user.id).maybeSingle(),
    supabase.from("profile_specialties").select("specialties(slug, name)").eq("user_id", user.id).eq("is_primary", true).maybeSingle(),
  ]);

  const relation = specialty?.specialties as { slug?: string; name?: string } | { slug?: string; name?: string }[] | null | undefined;
  const primary = Array.isArray(relation) ? relation[0] : relation;

  return (
    <div className="pageStack">
      <section className="pageIntro">
        <div><span className="kicker">TU PERFIL</span><h1>Tu criterio empieza por quién eres.</h1><p>Mantén actualizada la información que Nowoork usará para entender dónde puedes aportar más valor.</p></div>
      </section>
      <section className="profileSection">
        <div className="profileSectionIntro"><span className="kicker">INFORMACIÓN BÁSICA</span><h2>Perfil de solucionador</h2><p>Tu rol y tu score no se pueden editar manualmente. Se construyen con tu actividad y resultados.</p></div>
        <SolverProfileForm
          fullName={profile?.full_name || ""}
          email={profile?.email || user.email || ""}
          headline={solver?.headline || ""}
          yearsExperience={solver?.years_experience ?? null}
          specialtySlug={primary?.slug || "marketing"}
        />
      </section>
    </div>
  );
}
