import { DecisionCard } from "@/components/DecisionCard";

const decisions = [
  { category: "Marketing", specialty: "Meta Ads", title: "¿Qué harías con una campaña cuyo CPA subió 42% en cuatro días?", company: "NaturaBox", time: "2 min", reward: "$8.500", bonus: "$12.000", match: 96 },
  { category: "E-commerce", specialty: "Conversión", title: "¿Mantendrías este descuento o probarías una oferta por volumen?", company: "Marea", time: "3 min", reward: "$6.200", bonus: "$8.000", match: 91 },
  { category: "Marketing", specialty: "Creativos", title: "Elige el concepto que debería pasar a prueba A/B esta semana", company: "Brava", time: "1 min", reward: "$3.800", match: 89, level: "Básico" },
];

export default function Dashboard() {
  return <div className="pageStack">
    <section className="pageIntro">
      <div><span className="kicker">DOMINGO · 13 SEP</span><h1>Buenos días, Sergio.</h1><p>Estas son las decisiones donde tu criterio puede generar más valor hoy.</p></div>
      <button className="primaryButton">Explorar decisiones</button>
    </section>

    <section className="metricStrip">
      <div className="metric"><span>Score</span><strong>842</strong><em>+14 esta semana</em></div>
      <div className="metric"><span>Precisión</span><strong>78%</strong><em>254 de 327</em></div>
      <div className="metric"><span>Ranking Meta Ads</span><strong>#54</strong><em>Top 8%</em></div>
      <div className="metric"><span>Ganado este mes</span><strong>$382.400</strong><em>+18% vs. agosto</em></div>
    </section>

    <section className="sectionBlock">
      <div className="sectionHeading"><div><span className="kicker">PARA TI</span><h2>Decisiones recomendadas</h2></div><a href="/app/decisiones">Ver todas →</a></div>
      <div className="decisionList">{decisions.map((d) => <DecisionCard key={d.title} {...d} />)}</div>
    </section>

    <section className="splitSection">
      <div className="plainPanel">
        <div className="sectionHeading"><div><span className="kicker">TU DESEMPEÑO</span><h2>Últimas 10 decisiones</h2></div></div>
        <div className="accuracyVisual"><div className="accuracyRing"><span>8/10</span><small>aciertos</small></div><div className="accuracyCopy"><strong>Tu mejor área sigue siendo Meta Ads.</strong><p>Tu precisión en decisiones de performance es 9 puntos superior a tu promedio general.</p><button className="textButton">Ver resultados →</button></div></div>
      </div>
      <div className="plainPanel">
        <div className="sectionHeading"><div><span className="kicker">RACHA</span><h2>6 aciertos seguidos 🔥</h2></div></div>
        <div className="streak"><div className="streakDays">{["L","M","X","J","V","S","D"].map((x,i)=><span className={i<6?"done":""} key={x+i}>{i<6?"✓":x}</span>)}</div><p>Una decisión acertada más y superas tu mejor racha del mes.</p></div>
      </div>
    </section>
  </div>;
}
