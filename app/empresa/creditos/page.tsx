import Link from "next/link";
import { ClaimLaunchCreditsButton } from "@/components/ClaimLaunchCreditsButton";
import { createClient } from "@/lib/supabase/server";
import { formatCop } from "@/lib/decisions";

type CreditEvent = {
  id: string;
  kind: "launch_credit" | "decision_reserve" | "decision_release" | "decision_settlement";
  decision_id: string | null;
  available_delta: number | string;
  reserved_delta: number | string;
  spent_delta: number | string;
  description: string;
  created_at: string;
};

function eventLabel(kind: CreditEvent["kind"]) {
  if (kind === "launch_credit") return "Crédito de lanzamiento";
  if (kind === "decision_reserve") return "Reserva";
  if (kind === "decision_release") return "Liberación";
  return "Liquidación";
}

export default async function CompanyCreditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  const companyId = membership?.company_id as string | undefined;
  const [{ data: account }, { data: events = [] }] = companyId
    ? await Promise.all([
        supabase
          .from("company_credit_accounts")
          .select("available_credits, reserved_credits, spent_credits, launch_credit_claimed_at")
          .eq("company_id", companyId)
          .maybeSingle(),
        supabase
          .from("company_credit_events")
          .select("id, kind, decision_id, available_delta, reserved_delta, spent_delta, description, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100),
      ])
    : [{ data: null }, { data: [] }];

  const history = (events ?? []) as CreditEvent[];

  return (
    <main className="companyMain compactCompanyMain">
      <section className="pageIntro creditsIntro">
        <div>
          <span className="kicker">ECONOMÍA NOWOORK</span>
          <h1>Créditos de empresa.</h1>
          <p>Publicar una decisión reserva su exposición máxima. Al evaluarla, solo se cobra el costo real y el excedente vuelve a estar disponible.</p>
        </div>
        <Link className="secondaryButton" href="/empresa/decisiones/nueva">Crear decisión</Link>
      </section>

      <section className="metricStrip">
        <div className="metric"><span>Disponibles</span><strong>{formatCop(account?.available_credits)}</strong><em>para nuevas decisiones</em></div>
        <div className="metric"><span>Reservados</span><strong>{formatCop(account?.reserved_credits)}</strong><em>exposición máxima activa</em></div>
        <div className="metric"><span>Gastados</span><strong>{formatCop(account?.spent_credits)}</strong><em>liquidaciones reales</em></div>
        <div className="metric"><span>Moneda</span><strong>COP</strong><em>créditos internos</em></div>
      </section>

      {!account?.launch_credit_claimed_at ? (
        <section className="launchCreditPanel">
          <div>
            <span className="kicker">CRÉDITOS DE LANZAMIENTO</span>
            <h2>Activa saldo para probar el circuito económico.</h2>
            <p>Recibes $300.000 en créditos internos una sola vez. No representan dinero real ni son retirables; sirven para validar publicación, reservas y liquidaciones antes de integrar pagos.</p>
          </div>
          <ClaimLaunchCreditsButton />
        </section>
      ) : null}

      <section className="sectionBlock">
        <div className="sectionHeading">
          <div><span className="kicker">LEDGER</span><h2>Movimientos de créditos</h2></div>
        </div>
        {history.length ? (
          <div className="creditLedger">
            <div className="creditLedgerHeader"><span>Movimiento</span><span>Disponible</span><span>Reservado</span><span>Gastado</span><span>Fecha</span></div>
            {history.map((event) => (
              <div className="creditLedgerRow" key={event.id}>
                <div><strong>{eventLabel(event.kind)}</strong><small>{event.description}</small>{event.decision_id ? <Link href={`/empresa/decisiones/${event.decision_id}`}>Ver decisión →</Link> : null}</div>
                <span className={Number(event.available_delta) >= 0 ? "moneyPositive" : "moneyNegative"}>{Number(event.available_delta) > 0 ? "+" : ""}{formatCop(event.available_delta)}</span>
                <span>{Number(event.reserved_delta) > 0 ? "+" : ""}{formatCop(event.reserved_delta)}</span>
                <span>{Number(event.spent_delta) > 0 ? "+" : ""}{formatCop(event.spent_delta)}</span>
                <span>{new Date(event.created_at).toLocaleString("es-CO")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyState"><strong>Aún no hay movimientos.</strong><span>Activa los créditos de lanzamiento o publica una decisión para comenzar el ledger.</span></div>
        )}
      </section>

      <section className="futureDataBlock">
        <div><span className="kicker">SIN DINERO REAL TODAVÍA</span><h2>La contabilidad ya funciona; los pagos llegarán después.</h2></div>
        <p>Este bloque prueba reservas, gasto real y recompensas sin integrar pasarela. Cuando lleguemos al ZIP de pagos, el ledger actual será la fuente contable y no tendremos que rehacer la economía.</p>
      </section>
    </main>
  );
}
