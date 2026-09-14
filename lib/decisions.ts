
export type DecisionDifficulty = "basic" | "intermediate" | "expert";
export type DecisionStatus = "draft" | "published" | "closed" | "cancelled";
export type AnswerVerdict = "correct" | "neutral" | "incorrect";
export type SolverEarningStatus = "pending" | "available" | "paid" | "void";

export type SpecialtyOption = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export const DEFAULT_PLATFORM_FEE_RATE = 0.15;

export function difficultyLabel(value: DecisionDifficulty) {
  if (value === "basic") return "Básico";
  if (value === "expert") return "Experto";
  return "Intermedio";
}

export function statusLabel(value: DecisionStatus) {
  if (value === "draft") return "Borrador";
  if (value === "published") return "Publicada";
  if (value === "closed") return "Cerrada";
  return "Cancelada";
}

export function verdictLabel(value: AnswerVerdict) {
  if (value === "correct") return "Acierto";
  if (value === "incorrect") return "Desacierto";
  return "Neutral";
}

export function earningStatusLabel(value: SolverEarningStatus) {
  if (value === "available") return "Disponible";
  if (value === "paid") return "Pagado";
  if (value === "void") return "Anulado";
  return "En evaluación";
}

export function formatCop(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return `$${numeric.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

export function estimateDecisionMaxCost(
  baseReward: number,
  performanceBonus: number,
  solverSlots: number,
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE,
) {
  const payout = Math.max(0, baseReward + performanceBonus) * Math.max(1, solverSlots);
  const fee = payout * Math.max(0, platformFeeRate);
  return {
    payout,
    fee,
    total: payout + fee,
  };
}

export function computeCompatibility(
  decisionSpecialtyId: string,
  userSpecialtyId: string | null,
  specialties: SpecialtyOption[],
) {
  if (!userSpecialtyId) return 70;
  if (decisionSpecialtyId === userSpecialtyId) return 96;

  const decision = specialties.find((item) => item.id === decisionSpecialtyId);
  const user = specialties.find((item) => item.id === userSpecialtyId);

  if (!decision || !user) return 65;
  if (decision.parent_id && decision.parent_id === user.parent_id) return 86;
  if (decision.parent_id === user.id || user.parent_id === decision.id) return 84;
  return 62;
}

export function categoryForSpecialty(specialtyId: string, specialties: SpecialtyOption[]) {
  const specialty = specialties.find((item) => item.id === specialtyId);
  if (!specialty) return "General";
  if (!specialty.parent_id) return specialty.name;
  return specialties.find((item) => item.id === specialty.parent_id)?.name ?? specialty.name;
}

export function dateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
