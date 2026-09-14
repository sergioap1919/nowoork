import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, primary_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?error=profile");
  }

  if (profile.primary_role !== "solver") {
    redirect("/empresa");
  }

  const { data: solver } = await supabase
    .from("solver_profiles")
    .select("score")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: primarySpecialty } = await supabase
    .from("profile_specialties")
    .select("specialties(name)")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  const specialtyRelation = primarySpecialty?.specialties as { name?: string } | { name?: string }[] | null | undefined;
  const specialty = Array.isArray(specialtyRelation) ? specialtyRelation[0]?.name : specialtyRelation?.name;

  return <AppShell
    profileName={profile.full_name || user.email?.split("@")[0] || "Usuario"}
    specialty={specialty || "Solucionador"}
    score={solver?.score ?? 500}
  >{children}</AppShell>;
}
