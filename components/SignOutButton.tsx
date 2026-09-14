"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ variant = "sidebar" }: { variant?: "sidebar" | "header" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return <button className={`signOutButton ${variant === "header" ? "headerSignOutButton" : ""}`} onClick={signOut} disabled={loading}>{loading ? "Saliendo…" : "Cerrar sesión"}</button>;
}
