"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dateTimeLocalValue, type DecisionDifficulty, type SpecialtyOption } from "@/lib/decisions";

type InitialDecision = {
  id: string;
  title: string;
  context: string;
  question: string;
  specialty_id: string;
  difficulty: DecisionDifficulty;
  expected_minutes: number;
  base_reward: number;
  performance_bonus: number;
  deadline_at: string | null;
};

export function CompanyDecisionForm({ specialties, initialDecision }: { specialties: SpecialtyOption[]; initialDecision?: InitialDecision }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(initialDecision?.title ?? "");
  const [context, setContext] = useState(initialDecision?.context ?? "");
  const [question, setQuestion] = useState(initialDecision?.question ?? "");
  const [specialtyId, setSpecialtyId] = useState(initialDecision?.specialty_id ?? specialties[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState<DecisionDifficulty>(initialDecision?.difficulty ?? "intermediate");
  const [expectedMinutes, setExpectedMinutes] = useState(String(initialDecision?.expected_minutes ?? 3));
  const [baseReward, setBaseReward] = useState(String(initialDecision?.base_reward ?? 0));
  const [performanceBonus, setPerformanceBonus] = useState(String(initialDecision?.performance_bonus ?? 0));
  const [deadline, setDeadline] = useState(dateTimeLocalValue(initialDecision?.deadline_at));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      p_title: title,
      p_context: context,
      p_question: question,
      p_specialty_id: specialtyId,
      p_difficulty: difficulty,
      p_expected_minutes: Number(expectedMinutes),
      p_base_reward: Number(baseReward || 0),
      p_performance_bonus: Number(performanceBonus || 0),
      p_deadline_at: deadline ? new Date(deadline).toISOString() : null,
    };

    if (initialDecision) {
      const { error } = await supabase.rpc("update_company_decision", { p_decision_id: initialDecision.id, ...payload });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      setMessage("Borrador actualizado.");
      router.refresh();
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("create_company_decision", payload);
    if (error || !data) {
      setMessage(error?.message ?? "No pudimos crear la decisión.");
      setLoading(false);
      return;
    }

    router.push(`/empresa/decisiones/${data}`);
    router.refresh();
  }

  return <form className="decisionForm" onSubmit={handleSubmit}>
    <div className="decisionFormSection">
      <div className="decisionFormHeading"><span>01</span><div><strong>La situación</strong><small>Describe qué está pasando antes de pedir criterio.</small></div></div>
      <label>Título<input required minLength={6} maxLength={140} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. El CPA subió 35% en cuatro días"/></label>
      <label>Contexto<textarea required minLength={12} rows={6} value={context} onChange={event => setContext(event.target.value)} placeholder="Incluye datos, restricciones y cualquier detalle que el solucionador necesite para decidir."/></label>
      <label>Pregunta de decisión<textarea required minLength={8} rows={4} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ej. ¿Mantendrías presupuesto, reducirías inversión o cambiarías creativos primero?"/></label>
    </div>

    <div className="decisionFormSection">
      <div className="decisionFormHeading"><span>02</span><div><strong>Quién debería resolverla</strong><small>Nowoork usará esta información para ordenar el marketplace.</small></div></div>
      <div className="decisionFormGrid">
        <label>Especialidad<select required value={specialtyId} onChange={event => setSpecialtyId(event.target.value)}>{specialties.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Dificultad<select value={difficulty} onChange={event => setDifficulty(event.target.value as DecisionDifficulty)}><option value="basic">Básico</option><option value="intermediate">Intermedio</option><option value="expert">Experto</option></select></label>
        <label>Tiempo estimado (min)<input required type="number" min="1" max="120" value={expectedMinutes} onChange={event => setExpectedMinutes(event.target.value)}/></label>
        <label>Fecha límite<input type="datetime-local" value={deadline} onChange={event => setDeadline(event.target.value)}/></label>
      </div>
    </div>

    <div className="decisionFormSection">
      <div className="decisionFormHeading"><span>03</span><div><strong>Valor</strong><small>Por ahora estos valores alimentan el marketplace; la wallet real llega en ZIP 04.</small></div></div>
      <div className="decisionFormGrid">
        <label>Recompensa base (COP)<input required type="number" min="0" step="100" value={baseReward} onChange={event => setBaseReward(event.target.value)}/></label>
        <label>Bono por resultado (COP)<input required type="number" min="0" step="100" value={performanceBonus} onChange={event => setPerformanceBonus(event.target.value)}/></label>
      </div>
    </div>

    {message ? <div className={message.includes("actualizado") ? "formMessage success" : "formMessage error"}>{message}</div> : null}
    <div className="decisionFormActions"><span>{initialDecision ? "Los cambios solo se permiten mientras sea borrador." : "Se guardará como borrador. Tú decides cuándo publicarla."}</span><button className="primaryButton" disabled={loading}>{loading ? "Guardando…" : initialDecision ? "Guardar cambios" : "Crear borrador"}</button></div>
  </form>;
}
