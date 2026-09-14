"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  dateTimeLocalValue,
  estimateDecisionMaxCost,
  formatCop,
  type DecisionDifficulty,
  type SpecialtyOption,
} from "@/lib/decisions";

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
  solver_slots: number;
  deadline_at: string | null;
};

function humanizeError(message: string) {
  if (message.includes("BASE_REWARD_MINIMUM_1000")) return "La recompensa base mínima para publicar es de $1.000 COP por solucionador.";
  if (message.includes("INSUFFICIENT_CREDITS")) return "Tu empresa no tiene créditos suficientes para reservar el presupuesto máximo de esta decisión.";
  if (message.includes("INVALID_SOLVER_SLOTS")) return "Elige entre 1 y 20 solucionadores.";
  if (message.includes("REWARD_TOO_HIGH")) return "El valor de la recompensa supera el límite permitido para esta etapa.";
  return message;
}

export function CompanyDecisionForm({
  specialties,
  initialDecision,
}: {
  specialties: SpecialtyOption[];
  initialDecision?: InitialDecision;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(initialDecision?.title ?? "");
  const [context, setContext] = useState(initialDecision?.context ?? "");
  const [question, setQuestion] = useState(initialDecision?.question ?? "");
  const [specialtyId, setSpecialtyId] = useState(initialDecision?.specialty_id ?? specialties[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState<DecisionDifficulty>(initialDecision?.difficulty ?? "intermediate");
  const [expectedMinutes, setExpectedMinutes] = useState(String(initialDecision?.expected_minutes ?? 3));
  const [baseReward, setBaseReward] = useState(String(initialDecision?.base_reward ?? 8000));
  const [performanceBonus, setPerformanceBonus] = useState(String(initialDecision?.performance_bonus ?? 6000));
  const [solverSlots, setSolverSlots] = useState(String(initialDecision?.solver_slots ?? 3));
  const [deadline, setDeadline] = useState(dateTimeLocalValue(initialDecision?.deadline_at));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const estimate = estimateDecisionMaxCost(
    Number(baseReward || 0),
    Number(performanceBonus || 0),
    Number(solverSlots || 1),
  );

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
      p_solver_slots: Number(solverSlots),
      p_deadline_at: deadline ? new Date(deadline).toISOString() : null,
    };

    if (initialDecision) {
      const { error } = await supabase.rpc("update_company_decision", {
        p_decision_id: initialDecision.id,
        ...payload,
      });
      if (error) {
        setMessage(humanizeError(error.message));
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
      setMessage(humanizeError(error?.message ?? "No pudimos crear la decisión."));
      setLoading(false);
      return;
    }

    router.push(`/empresa/decisiones/${data}`);
    router.refresh();
  }

  return (
    <form className="decisionForm" onSubmit={handleSubmit}>
      <div className="decisionFormSection">
        <div className="decisionFormHeading">
          <span>01</span>
          <div>
            <strong>La situación</strong>
            <small>Describe qué está pasando antes de pedir criterio.</small>
          </div>
        </div>
        <label>
          Título
          <input required minLength={6} maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. El CPA subió 35% en cuatro días" />
        </label>
        <label>
          Contexto
          <textarea required minLength={12} rows={6} value={context} onChange={(event) => setContext(event.target.value)} placeholder="Incluye datos, restricciones y cualquier detalle que el solucionador necesite para decidir." />
        </label>
        <label>
          Pregunta de decisión
          <textarea required minLength={8} rows={4} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ej. ¿Mantendrías presupuesto, reducirías inversión o cambiarías creativos primero?" />
        </label>
      </div>

      <div className="decisionFormSection">
        <div className="decisionFormHeading">
          <span>02</span>
          <div>
            <strong>Quién debería resolverla</strong>
            <small>La decisión se cerrará automáticamente cuando se ocupen todos los cupos.</small>
          </div>
        </div>
        <div className="decisionFormGrid">
          <label>
            Especialidad
            <select required value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)}>
              {specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Dificultad
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as DecisionDifficulty)}>
              <option value="basic">Básico</option>
              <option value="intermediate">Intermedio</option>
              <option value="expert">Experto</option>
            </select>
          </label>
          <label>
            Solucionadores
            <input required type="number" min="1" max="20" value={solverSlots} onChange={(event) => setSolverSlots(event.target.value)} />
          </label>
          <label>
            Tiempo estimado (min)
            <input required type="number" min="1" max="120" value={expectedMinutes} onChange={(event) => setExpectedMinutes(event.target.value)} />
          </label>
          <label>
            Fecha límite
            <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="decisionFormSection economyFormSection">
        <div className="decisionFormHeading">
          <span>03</span>
          <div>
            <strong>Economía de la decisión</strong>
            <small>La base se paga por responder; el bono solo se libera cuando la respuesta resulta acertada.</small>
          </div>
        </div>
        <div className="decisionFormGrid">
          <label>
            Recompensa base por solucionador (COP)
            <input required type="number" min="1000" step="500" value={baseReward} onChange={(event) => setBaseReward(event.target.value)} />
          </label>
          <label>
            Bono por acierto (COP)
            <input required type="number" min="0" step="500" value={performanceBonus} onChange={(event) => setPerformanceBonus(event.target.value)} />
          </label>
        </div>
        <div className="economyEstimate">
          <div>
            <span>Máximo para solucionadores</span>
            <strong>{formatCop(estimate.payout)}</strong>
          </div>
          <div>
            <span>Fee de simulación · 15%</span>
            <strong>{formatCop(estimate.fee)}</strong>
          </div>
          <div className="economyEstimateTotal">
            <span>Reserva máxima al publicar</span>
            <strong>{formatCop(estimate.total)}</strong>
          </div>
        </div>
        <p className="economyHint">Solo se gastará el valor real: las recompensas de quienes respondan, los bonos obtenidos y el fee correspondiente. El excedente reservado vuelve al saldo de la empresa al evaluar o cerrar sin respuestas.</p>
      </div>

      {message ? <div className={message.includes("actualizado") ? "formMessage success" : "formMessage error"}>{message}</div> : null}
      <div className="decisionFormActions">
        <span>{initialDecision ? "Los cambios solo se permiten mientras sea borrador." : "Se guardará como borrador. Los créditos solo se reservan cuando publiques."}</span>
        <button className="primaryButton" disabled={loading}>{loading ? "Guardando…" : initialDecision ? "Guardar cambios" : "Crear borrador"}</button>
      </div>
    </form>
  );
}
