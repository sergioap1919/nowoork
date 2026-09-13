"use client";

import { useMemo, useState } from "react";
import { DecisionCard } from "./DecisionCard";
import { SearchIcon } from "./Icons";

const all = [
  { category: "Marketing", specialty: "Meta Ads", title: "¿Qué harías con una campaña cuyo CPA subió 42% en cuatro días?", company: "NaturaBox", time: "2 min", reward: "$8.500", bonus: "$12.000", match: 96 },
  { category: "Finanzas", specialty: "Pricing", title: "¿Subirías el precio 6% para proteger margen o mantendrías volumen?", company: "Nodo", time: "4 min", reward: "$14.000", bonus: "$18.000", match: 53, level: "Experto" },
  { category: "E-commerce", specialty: "Conversión", title: "¿Mantendrías este descuento o probarías una oferta por volumen?", company: "Marea", time: "3 min", reward: "$6.200", bonus: "$8.000", match: 91 },
  { category: "Marketing", specialty: "Creativos", title: "Elige el concepto que debería pasar a prueba A/B esta semana", company: "Brava", time: "1 min", reward: "$3.800", match: 89, level: "Básico" },
  { category: "Operaciones", specialty: "Logística", title: "¿Despacharías nuevamente este pedido contraentrega después de dos intentos?", company: "Línea 8", time: "2 min", reward: "$4.200", match: 66 },
  { category: "Marketing", specialty: "CRO", title: "¿Qué hipótesis probarías primero para recuperar conversión móvil?", company: "Tenda", time: "5 min", reward: "$11.500", bonus: "$16.000", match: 93, level: "Experto" },
];

export function DecisionExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [mine, setMine] = useState(true);
  const filtered = useMemo(() => all.filter((d) => {
    const matchQuery = (d.title + d.category + d.specialty + d.company).toLowerCase().includes(query.toLowerCase());
    const matchCategory = category === "Todas" || d.category === category;
    const matchMine = !mine || d.match >= 80;
    return matchQuery && matchCategory && matchMine;
  }), [query, category, mine]);

  return <>
    <div className="explorerToolbar">
      <label className="searchField"><SearchIcon/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar decisión, empresa o especialidad"/></label>
      <div className="filterChips">{["Todas","Marketing","E-commerce","Finanzas","Operaciones"].map(c=><button key={c} onClick={()=>setCategory(c)} className={category===c?"selected":""}>{c}</button>)}</div>
      <label className="switchLabel"><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/><span/>Solo mi especialidad</label>
    </div>
    <div className="resultsMeta"><strong>{filtered.length} decisiones</strong><span>Ordenadas por compatibilidad contigo</span></div>
    <div className="decisionList">{filtered.map(d=><DecisionCard key={d.title} {...d}/>)}</div>
  </>;
}
