import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  earningStatusLabel,
  formatCop,
  type SolverEarningStatus,
} from "@/lib/decisions";

type EarningRow = {
  earning_id: string;
  decision_id: string;
  decision_title: string;
  base_amount: number | string;
  bonus_amount: number | string;
  total_amount: number | string;
  earning_status: SolverEarningStatus;
  created_at: string;
  available_at: string | null;
};

export default async function IncomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: wallet }, { data: historyData }] = await Promise.all([
    supabase
      .from("solver_wallet_accounts")
      .select("pending_balance, available_balance, paid_balance, lifetime_earned")
      .eq("solver_id", user!.id)
      .maybeSingle(),
    supabase.rpc("get_my_earnings_history", { p_limit: 100 }),
  ]);

  const history = (historyData ?? []) as EarningRow[];
  const now = new Date();
  const monthTotal = history
    .filter((item) => {
      const date = new Date(item.available_at ?? item.created_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && item.earning_status === "available";
    })
    .reduce((sum, item) => sum + Number(item.total_amount ?? 0), 0);
  const baseTotal = history.reduce((sum, item) => sum + Number(item.base_amount ?? 0), 0);
  const bonusTotal = history.reduce((sum, item) => sum + Number(item.bonus_amount ?? 0), 0);
  const compositionTotal = baseTotal + bonusTotal;
  const basePercent = compositionTotal ? Math.round((baseTotal / compositionTotal) * 100) : 0;
  const bonusPercent = compositionTotal ? 100 - basePercent : 0;

  return (
    <div className="pageStack">
      <section className="pageIntro">
        <div>
          <span className="kicker">WALLET INTERNA</span>
          <h1>Tu criterio, convertido en valor.</h1>
          <p>La recompensa base entra en evaluación al responder y se vuelve disponible cuando existe un resultado. Los aciertos pueden sumar el bono de la decisión.</p>
        </div>
        <button className="secondaryButton" disabled title="Los retiros reales se habilitarán en la fase de pagos">Retiros próximamente</button>
      </section>

      <section className="metricStrip">
        <div className="metric"><span>Disponible</span><strong>{formatCop(wallet?.available_balance)}</strong><em>ganancias ya liquidadas</em></div>
        <div className="metric"><span>En evaluación</span><strong>{formatCop(wallet?.pending_balance)}</strong><em>recompensas base pendientes</em></div>
        <div className="metric"><span>Este mes</span><strong>{formatCop(monthTotal)}</strong><em>liquidado en el mes</em></div>
        <div className="metric"><span>Total histórico</span><strong>{formatCop(wallet?.lifetime_earned)}</strong><em>antes de retiros</em></div>
      </section>

      <section className="splitSection incomeOverview">
        <div className="plainPanel">
          <span className="kicker">COMPOSICIÓN</span>
          <h2>Cómo estás ganando</h2>
          <div className="incomeBars">
            <div><span>Recompensa base</span><b style={{ width: `${basePercent}%` }} /><em>{basePercent}%</em></div>
            <div><span>Bonos por acierto</span><b style={{ width: `${bonusPercent}%` }} /><em>{bonusPercent}%</em></div>
          </div>
        </div>
        <div className="plainPanel">
          <span className="kicker">REGLA ECONÓMICA</span>
          <h2>Base por participar. Bono por acertar.</h2>
          <p className="largeMuted">Responder una decisión financiada genera la recompensa base en estado pendiente. Al evaluarse, la base se libera y el bono se suma únicamente si el resultado fue clasificado como acierto.</p>
        </div>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading"><div><span className="kicker">HISTORIAL</span><h2>Movimientos por decisión</h2></div></div>
        {history.length ? (
          <div className="earningsLedger">
            <div className="earningsLedgerHeader"><span>Decisión</span><span>Base</span><span>Bono</span><span>Total</span><span>Estado</span></div>
            {history.map((earning) => (
              <Link className="earningsLedgerRow" href={`/app/decisiones/${earning.decision_id}`} key={earning.earning_id}>
                <div><strong>{earning.decision_title}</strong><small>{new Date(earning.created_at).toLocaleString("es-CO")}</small></div>
                <span>{formatCop(earning.base_amount)}</span>
                <span>{formatCop(earning.bonus_amount)}</span>
                <strong>{formatCop(earning.total_amount)}</strong>
                <span className={`earningStatus ${earning.earning_status}`}>{earningStatusLabel(earning.earning_status)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <strong>Todavía no tienes movimientos.</strong>
            <span>Responde una decisión financiada y su recompensa base aparecerá aquí en evaluación.</span>
            <Link className="primaryButton small" href="/app/decisiones">Explorar decisiones</Link>
          </div>
        )}
      </section>

      <section className="futureDataBlock">
        <div><span className="kicker">PRÓXIMA CAPA</span><h2>Retiros y dinero real vendrán después.</h2></div>
        <p>Por ahora Nowoork lleva una contabilidad auditable sin mover dinero. Esto nos permite validar incentivos y liquidaciones antes de integrar cobros, retiros, impuestos y antifraude.</p>
      </section>
    </div>
  );
}
