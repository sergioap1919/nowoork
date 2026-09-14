import Link from "next/link";
import { DecisionCard } from "@/components/DecisionCard";
import { createClient } from "@/lib/supabase/server";
import { categoryForSpecialty, computeCompatibility, difficultyLabel, formatCop, type DecisionDifficulty, type SpecialtyOption } from "@/lib/decisions";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: solver }, { data: specialties = [] }, { data: primarySpecialty }, { data: decisions = [] }, { data: answers = [] }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("solver_profiles").select("score, precision, decisions_scored, correct_decisions, earnings_total, current_streak").eq("user_id", user!.id).maybeSingle(),
    supabase.from("specialties").select("id, name, slug, parent_id").eq("is_active", true),
    supabase.from("profile_specialties").select("specialty_id").eq("user_id", user!.id).eq("is_primary", true).maybeSingle(),
    supabase.from("decisions").select("id, title, specialty_id, difficulty, expected_minutes, base_reward, performance_bonus, companies(name)").eq("status", "published").order("published_at", { ascending: false }).limit(12),
    supabase.from("decision_answers").select("decision_id").eq("solver_id", user!.id),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] || "Usuario";
  const score = solver?.score ?? 500;
  const precision = Number(solver?.precision ?? 0);
  const decisionsScored = solver?.decisions_scored ?? 0;
  const correct = solver?.correct_decisions ?? 0;
  const earnings = Number(solver?.earnings_total ?? 0);
  const streak = solver?.current_streak ?? 0;
  const specialtyList = (specialties ?? []) as SpecialtyOption[];
  const answeredIds = new Set((answers ?? []).map((answer) => answer.decision_id));

  const recommended = (decisions ?? []).map((decision) => {
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
  }).sort((a, b) => b.match - a.match).slice(0, 3);

  return <div className="pageStack">
    <section className="pageIntro">
      <div><span className="kicker">NOWOORK · TU CRITERIO</span><h1>Buenos días, {firstName}.</h1><p>Estas son las decisiones donde tu criterio puede generar más valor hoy.</p></div>
      <Link className="primaryButton" href="/app/decisiones">Explorar decisiones</Link>
    </section>

    <section className="metricStrip">
      <div className="metric"><span>Score</span><strong>{score}</strong><em>reputación actual</em></div>
      <div className="metric"><span>Precisión</span><strong>{precision.toFixed(0)}%</strong><em>{correct} de {decisionsScored}</em></div>
      <div className="metric"><span>Decisiones evaluadas</span><strong>{decisionsScored}</strong><em>resultados verificados</em></div>
      <div className="metric"><span>Ganado</span><strong>${earnings.toLocaleString("es-CO")}</strong><em>acumulado</em></div>
    </section>

    <section className="sectionBlock">
      <div className="sectionHeading"><div><span className="kicker">PARA TI</span><h2>Decisiones recomendadas</h2></div><Link href="/app/decisiones">Ver todas →</Link></div>
      {recommended.length ? <div className="decisionList">{recommended.map((decision) => <DecisionCard key={decision.id} {...decision} />)}</div> : <div className="emptyState"><strong>No hay decisiones publicadas todavía.</strong><span>Cuando una empresa publique una situación compatible contigo aparecerá aquí.</span></div>}
    </section>

    <section className="splitSection">
      <div className="plainPanel">
        <div className="sectionHeading"><div><span className="kicker">TU DESEMPEÑO</span><h2>Tu historial empieza aquí</h2></div></div>
        <div className="accuracyVisual"><div className="accuracyRing"><span>{correct}/{Math.max(decisionsScored, 0)}</span><small>aciertos</small></div><div className="accuracyCopy"><strong>Tu score se construirá con resultados verificables.</strong><p>A medida que tus decisiones se evalúen, Nowoork calculará precisión, consistencia e impacto.</p><Link className="textButton" href="/app/resultados">Ver resultados →</Link></div></div>
      </div>
      <div className="plainPanel">
        <div className="sectionHeading"><div><span className="kicker">RACHA</span><h2>{streak} aciertos seguidos</h2></div></div>
        <div className="streak"><div className="streakDays">{["L","M","X","J","V","S","D"].map((item,index)=><span className={index < Math.min(streak,7) ? "done" : ""} key={item+index}>{index < Math.min(streak,7) ? "✓" : item}</span>)}</div><p>Las rachas se activan únicamente cuando una decisión ya tiene resultado evaluado.</p></div>
      </div>
    </section>
  </div>;
}
