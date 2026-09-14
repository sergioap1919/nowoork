import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyShell } from "@/components/CompanyShell";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?error=profile");
  }

  if (profile.primary_role !== "company") {
    redirect("/app");
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("companies(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const relation = membership?.companies as { name?: string } | { name?: string }[] | null | undefined;
  const company = Array.isArray(relation) ? relation[0] : relation;

  return <CompanyShell companyName={company?.name || "Mi empresa"}>{children}</CompanyShell>;
}
