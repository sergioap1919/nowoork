import Link from "next/link";
import { DecisionCard } from "@/components/DecisionCard";
import { createClient } from "@/lib/supabase/server";

const decisions = [
  { category: "Marketing", specialty: "Meta Ads", title: "¿Qué harías con una campaña cuyo CPA subió 42% en cuatro días?", company: "NaturaBox", time: "2 min", reward: "$8.500", bonus: "$12.000", match: 96 },
  { category: "E-commerce", specialty: "Conversión", title: "¿Mantendrías este descuento o probarías una oferta por volumen?", company: "Marea", time: "3 min", reward: "$6.200", bonus: "$8.000", match: 91 },
  { category: "Marketing", specialty: "Creativos", title: "Elige el concepto que debería pasar a prueba A/B esta semana", company: "Brava", time: "1 min", reward: "$3.800", match: 89, level: "Básico" },
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: solver }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("solver_profiles").select("score, precision, decisions_scored, correct_decisions, earnings_total, current_streak").eq("user_id", user!.id).maybeSingle(),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] || "Usuario";
  const score = solver?.score ?? 500;
  const precision = Number(solver?.precision ?? 0);
  const decisionsScored = solver?.decisions_scored ?? 0;
  const correct = solver?.correct_decisions ?? 0;
  const earnings = Number(solver?.earnings_total ?? 0);
  const streak = solver?.current_streak ?? 0;

  return <div className="pageStack">
    <section className="pageIntro">
      <div><span className="kicker">NOWOORK · TU CRITERIO</span><h1>Buenos días, {firstName}.</h1><p>Estas son las decisiones donde tu criterio puede generar más valor hoy.</p></div>
      <Link className="primaryButton" href="/app/decisiones">Explorar decisiones</Link>
    </section>

    <section className="metricStrip">
      <div className="metric"><span>Score</span><strong>{score}</strong><em>score inicial verificable</em></div>
      <div className="metric"><span>Precisión</span><strong>{precision.toFixed(0)}%</strong><em>{correct} de {decisionsScored}</em></div>
      <div className="metric"><span>Decisiones evaluadas</span><strong>{decisionsScored}</strong><em>resultados verificados</em></div>
      <div className="metric"><span>Ganado</span><strong>${earnings.toLocaleString("es-CO")}</strong><em>acumulado</em></div>
    </section>

    <section className="sectionBlock">
      <div className="sectionHeading"><div><span className="kicker">PARA TI</span><h2>Decisiones recomendadas</h2></div><Link href="/app/decisiones">Ver todas →</Link></div>
      <div className="decisionList">{decisions.map((d) => <DecisionCard key={d.title} {...d} />)}</div>
    </section>

    <section className="splitSection">
      <div className="plainPanel">
        <div className="sectionHeading"><div><span className="kicker">TU DESEMPEÑO</span><h2>Tu historial empieza aquí</h2></div></div>
        <div className="accuracyVisual"><div className="accuracyRing"><span>{correct}/{Math.max(decisionsScored, 0)}</span><small>aciertos</small></div><div className="accuracyCopy"><strong>Tu score se construirá con resultados verificables.</strong><p>A medida que tus decisiones se evalúen, Nowoork calculará precisión, consistencia e impacto.</p><Link className="textButton" href="/app/resultados">Ver resultados →</Link></div></div>
      </div>
      <div className="plainPanel">
        <div className="sectionHeading"><div><span className="kicker">RACHA</span><h2>{streak} aciertos seguidos</h2></div></div>
        <div className="streak"><div className="streakDays">{["L","M","X","J","V","S","D"].map((x,i)=><span className={i<Math.min(streak,7)?"done":""} key={x+i}>{i<Math.min(streak,7)?"✓":x}</span>)}</div><p>Las rachas se activan únicamente cuando una decisión ya tiene resultado evaluado.</p></div>
      </div>
    </section>
  </div>;
}
