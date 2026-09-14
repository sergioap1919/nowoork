import { createClient } from "@/lib/supabase/server";

type TeamMember = {
  user_id: string;
  full_name: string;
  email: string;
  member_role: "owner" | "admin" | "member";
  joined_at: string;
};

function roleLabel(role: TeamMember["member_role"]) {
  if (role === "owner") return "Propietario";
  if (role === "admin") return "Administrador";
  return "Miembro";
}

export default async function CompanyTeamPage() {
  const supabase = await createClient();
  const { data: members = [] } = await supabase.rpc("get_my_company_team");

  return (
    <main className="companyMain">
      <section className="pageIntro">
        <div>
          <span className="kicker">EQUIPO</span>
          <h1>Quién puede actuar por tu empresa.</h1>
          <p>Nowoork muestra los miembros y roles vinculados a la organización. Las invitaciones llegarán en una fase posterior con envío de correo verificado.</p>
        </div>
      </section>

      <section className="sectionBlock">
        <div className="sectionHeading">
          <div>
            <span className="kicker">ACCESO</span>
            <h2>Miembros actuales</h2>
          </div>
        </div>

        {(members ?? []).length ? (
          <div className="teamList">
            {(members as TeamMember[]).map((member) => (
              <article className="teamRow" key={member.user_id}>
                <div className="teamAvatar">{member.full_name?.trim().charAt(0).toUpperCase() || "N"}</div>
                <div className="teamIdentity">
                  <strong>{member.full_name || "Usuario Nowoork"}</strong>
                  <span>{member.email}</span>
                </div>
                <span className={`teamRole ${member.member_role}`}>{roleLabel(member.member_role)}</span>
                <small>Desde {new Date(member.joined_at).toLocaleDateString("es-CO")}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <strong>No encontramos miembros vinculados.</strong>
            <span>La cuenta propietaria debería aparecer aquí. Si no aparece, revisa la migración 008.</span>
          </div>
        )}
      </section>
    </main>
  );
}
