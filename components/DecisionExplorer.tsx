"use client";

import { useMemo, useState } from "react";
import { DecisionCard, type MarketplaceDecisionCard } from "./DecisionCard";
import { SearchIcon } from "./Icons";

export function DecisionExplorer({ decisions }: { decisions: MarketplaceDecisionCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [mine, setMine] = useState(true);
  const categories = useMemo(() => ["Todas", ...Array.from(new Set(decisions.map((item) => item.category)))], [decisions]);

  const filtered = useMemo(() => decisions.filter((decision) => {
    const matchQuery = `${decision.title} ${decision.category} ${decision.specialty} ${decision.company}`.toLowerCase().includes(query.toLowerCase());
    const matchCategory = category === "Todas" || decision.category === category;
    const matchMine = !mine || decision.match >= 80;
    return matchQuery && matchCategory && matchMine;
  }), [decisions, query, category, mine]);

  return <>
    <div className="explorerToolbar">
      <label className="searchField"><SearchIcon/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar decisión, empresa o especialidad"/></label>
      <div className="filterChips">{categories.map(item => <button type="button" key={item} onClick={() => setCategory(item)} className={category === item ? "selected" : ""}>{item}</button>)}</div>
      <label className="switchLabel"><input type="checkbox" checked={mine} onChange={event => setMine(event.target.checked)}/><span/>Solo mi especialidad</label>
    </div>
    <div className="resultsMeta"><strong>{filtered.length} decisiones</strong><span>Ordenadas por compatibilidad contigo</span></div>
    {filtered.length > 0 ? <div className="decisionList">{filtered.map(decision => <DecisionCard key={decision.id} {...decision}/>)}</div> : <div className="emptyState"><strong>No hay decisiones para este filtro.</strong><span>Prueba otra categoría o desactiva “Solo mi especialidad”.</span></div>}
  </>;
}
