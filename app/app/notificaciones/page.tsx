import { createClient } from "@/lib/supabase/server";
import { NotificationCenter, type NotificationItem } from "@/components/NotificationCenter";

export default async function SolverNotificationsPage() {
  const supabase = await createClient();
  const { data: items = [] } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="pageStack">
      <section className="pageIntro">
        <div>
          <span className="kicker">NOTIFICACIONES</span>
          <h1>Lo importante, sin ruido.</h1>
          <p>Nuevas decisiones, resultados, score y recompensas en un solo lugar.</p>
        </div>
      </section>
      <section className="sectionBlock">
        <NotificationCenter initialItems={(items ?? []) as NotificationItem[]} />
      </section>
    </div>
  );
}
