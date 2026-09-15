import { DecisionExplorer } from "@/components/DecisionExplorer";
import { createClient } from "@/lib/supabase/server";
import { categoryForSpecialty, computeCompatibility, difficultyLabel, formatCop, type DecisionDifficulty, type SpecialtyOption } from "@/lib/decisions";

export default async function DecisionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: decisions = [] }, { data: specialties = [] }, { data: primarySpecialty }, { data: answers = [] }] = await Promise.all([
    supabase.from("decisions").select("id, title, specialty_id, difficulty, expected_minutes, base_reward, performance_bonus, companies(name)").eq("status", "published").order("published_at", { ascending: false }),
    supabase.from("specialties").select("id, name, slug, parent_id").eq("is_active", true),
    supabase.from("profile_specialties").select("specialty_id").eq("user_id", user!.id).eq("is_primary", true).maybeSingle(),
    supabase.from("decision_answers").select("decision_id").eq("solver_id", user!.id),
  ]);

  const specialtyList = (specialties ?? []) as SpecialtyOption[];
  const answeredIds = new Set((answers ?? []).map((answer) => answer.decision_id));
  const cards = (decisions ?? []).map((decision) => {
    const companyRelation = decision.companies as { name?: string } | { name?: string }[] | null | undefined;
    const company = Array.isArray(companyRelation) ? companyRelation[0] : companyRelation;
    const specialty = specialtyList.find((item) => item.id === decision.specialty_id);
    return {
      id: decision.id,
      category: categoryForSpecialty(decision.specialty_id, specialtyList),
      specialty: specialty?.name ?? "General",
      title: decision.title,
      company: company?.name ?? "Empresa Nowoork",
      time: `${decision.expected_minutes} min`,
      reward: formatCop(decision.base_reward),
      bonus: Number(decision.performance_bonus) > 0 ? formatCop(decision.performance_bonus) : undefined,
      match: computeCompatibility(decision.specialty_id, primarySpecialty?.specialty_id ?? null, specialtyList),
      level: difficultyLabel(decision.difficulty as DecisionDifficulty),
      answered: answeredIds.has(decision.id),
    };
  }).sort((a, b) => b.match - a.match);

  return <div className="pageStack"><section className="pageIntro"><div><span className="kicker">MARKETPLACE REAL</span><h1>Decisiones.</h1><p>Situaciones publicadas por empresas donde tu experiencia puede generar valor.</p></div></section><section className="sectionBlock"><DecisionExplorer decisions={cards}/></section></div>;
}
