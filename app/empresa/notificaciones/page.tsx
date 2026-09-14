import { createClient } from "@/lib/supabase/server";
import { NotificationCenter, type NotificationItem } from "@/components/NotificationCenter";

export default async function CompanyNotificationsPage() {
  const supabase = await createClient();
  const { data: items = [] } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="companyMain">
      <section className="pageIntro">
        <div>
          <span className="kicker">NOTIFICACIONES</span>
          <h1>Actividad que requiere tu atención.</h1>
          <p>Respuestas nuevas, resultados y eventos importantes de tus decisiones.</p>
        </div>
      </section>
      <section className="sectionBlock">
        <NotificationCenter initialItems={(items ?? []) as NotificationItem[]} />
      </section>
    </main>
  );
}
