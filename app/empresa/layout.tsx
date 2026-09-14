import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return children;
}
