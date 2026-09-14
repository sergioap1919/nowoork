import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type RankingRow = {
  rank_position: number;
  user_id: string;
  display_name: string;
  specialty_id: string | null;
  specialty_name: string;
  score: number;
  precision: number;
  decisions_scored: number;
  correct_decisions: number;
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ specialty?: string }>;
}) {
  const { specialty: specialtyParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: specialties = [] } = await supabase
    .from("specialties")
    .select("id, name, slug, parent_id")
    .eq("is_active", true)
    .order("name");

  const specialtyList = specialties ?? [];
  const selectedSpecialty = specialtyList.find(
    (item) => item.id === specialtyParam,
  );
  const selectedId = selectedSpecialty?.id ?? null;

  const { data: rankingData } = await supabase.rpc("get_solver_ranking", {
    p_specialty_id: selectedId,
    p_limit: 100,
  });

  const ranking = (rankingData ?? []) as RankingRow[];
  const me = ranking.find((row) => row.user_id === user!.id);
  const filterOptions = specialtyList.filter(
    (item) => item.parent_id !== null,
  );

  return (
    <div className="pageStack">
      <section className="pageIntro">
        <div>
          <span className="kicker">REPUTACIÓN REAL</span>
          <h1>Ranking.</h1>
          <p>
            La posición se calcula con score, precisión y cantidad de resultados
            concluyentes. No hay posiciones demo.
          </p>
        </div>
        <div className="rankHero">
          <span>Tu posición</span>
          <strong>{me ? `#${me.rank_position}` : "—"}</strong>
          <small>
            {selectedSpecialty?.name ?? "Global"} · Score {me?.score ?? "—"}
          </small>
        </div>
      </section>

      <section className="sectionBlock">
        <div className="rankingTabs realRankingTabs">
          <Link
            className={!selectedId ? "selected" : ""}
            href="/app/ranking"
          >
            Global
          </Link>
          {filterOptions.map((specialty) => (
            <Link
              className={selectedId === specialty.id ? "selected" : ""}
              href={`/app/ranking?specialty=${specialty.id}`}
              key={specialty.id}
            >
              {specialty.name}
            </Link>
          ))}
        </div>

        {ranking.length ? (
          <div className="resultsTable rankingTable">
            <div className="tableHeader">
              <span>#</span>
              <span>Solucionador</span>
              <span>Especialidad</span>
              <span>Score</span>
              <span>Precisión</span>
            </div>
            {ranking.map((row) => (
              <div
                className={`tableRow ${row.user_id === user!.id ? "me" : ""}`}
                key={row.user_id}
              >
                <span>{row.rank_position}</span>
                <strong>
                  {row.display_name}
                  {row.user_id === user!.id ? " · Tú" : ""}
                </strong>
                <span>{row.specialty_name}</span>
                <span>{row.score}</span>
                <span>
                  {Number(row.precision).toFixed(1)}% · {row.decisions_scored}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <strong>Aún no hay solucionadores en este ranking.</strong>
            <span>
              Cuando existan perfiles con esta especialidad aparecerán aquí.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
