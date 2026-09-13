import Link from "next/link";
import { ArrowIcon } from "./Icons";

type DecisionCardProps = {
  category: string;
  specialty: string;
  title: string;
  company: string;
  time: string;
  reward: string;
  bonus?: string;
  match: number;
  level?: string;
};

export function DecisionCard({ category, specialty, title, company, time, reward, bonus, match, level = "Intermedio" }: DecisionCardProps) {
  return <article className="decisionRow">
    <div className="decisionMain">
      <div className="eyebrowRow"><span className="categoryDot"/><span>{category}</span><span>·</span><span>{specialty}</span><span className="levelPill">{level}</span></div>
      <h3>{title}</h3>
      <p>{company} · {time}</p>
    </div>
    <div className="decisionMatch"><span>{match}%</span><small>compatibilidad</small></div>
    <div className="decisionMoney"><strong>{reward}</strong><small>{bonus ? `+ ${bonus} bono` : "recompensa"}</small></div>
    <Link className="roundAction" href="/app/decisiones"><ArrowIcon/></Link>
  </article>;
}
