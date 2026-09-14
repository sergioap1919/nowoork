import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirmation`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=confirmation`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=confirmation`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=profile`);
  }

  return NextResponse.redirect(`${origin}${profile.primary_role === "company" ? "/empresa" : "/app"}`);
}
