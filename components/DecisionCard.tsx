import Link from "next/link";
import { ArrowIcon } from "./Icons";

export type MarketplaceDecisionCard = {
  id: string;
  category: string;
  specialty: string;
  title: string;
  company: string;
  time: string;
  reward: string;
  bonus?: string;
  match: number;
  level: string;
  answered?: boolean;
};

export function DecisionCard({ id, category, specialty, title, company, time, reward, bonus, match, level, answered = false }: MarketplaceDecisionCard) {
  return <article className="decisionRow">
    <div className="decisionMain">
      <div className="eyebrowRow"><span className="categoryDot"/><span>{category}</span><span>·</span><span>{specialty}</span><span className="levelPill">{level}</span>{answered ? <span className="answeredPill">Respondida</span> : null}</div>
      <h3>{title}</h3>
      <p>{company} · {time}</p>
    </div>
    <div className="decisionMatch"><span>{match}%</span><small>compatibilidad</small></div>
    <div className="decisionMoney"><strong>{reward}</strong><small>{bonus ? `+ ${bonus} bono` : "recompensa"}</small></div>
    <Link className="roundAction" href={`/app/decisiones/${id}`} aria-label={`Abrir ${title}`}><ArrowIcon/></Link>
  </article>;
}
