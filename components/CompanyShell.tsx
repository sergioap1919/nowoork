"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/SignOutButton";

export function CompanyShell({ children, companyName, notificationCount = 0 }: { children: React.ReactNode; companyName: string; notificationCount?: number }) {
  const pathname = usePathname();
  const onDecisions = pathname.startsWith("/empresa/decisiones");
  const onCredits = pathname.startsWith("/empresa/creditos");
  const onProfile = pathname.startsWith("/empresa/perfil");
  const onTeam = pathname.startsWith("/empresa/equipo");
  const onNotifications = pathname.startsWith("/empresa/notificaciones");
  const onHome = pathname === "/empresa";

  return (
    <div className="companyPage">
      <header className="companyNav">
        <Link href="/empresa" aria-label="Ir al inicio de empresa"><Brand size="nav" priority /></Link>
        <nav className="companyNavLinks">
          <Link className={onHome ? "active" : ""} href="/empresa">Inicio</Link>
          <Link className={onDecisions ? "active" : ""} href="/empresa/decisiones">Decisiones</Link>
          <Link className={onCredits ? "active" : ""} href="/empresa/creditos">Créditos</Link>
          <Link className={onTeam ? "active" : ""} href="/empresa/equipo">Equipo</Link>
          <Link className={onNotifications ? "active" : ""} href="/empresa/notificaciones">Notificaciones{notificationCount > 0 ? <b className="navCount inline">{notificationCount > 99 ? "99+" : notificationCount}</b> : null}</Link>
          <Link className={onProfile ? "active" : ""} href="/empresa/perfil">Perfil</Link>
        </nav>
        <div className="companyNavActions">
          <span className="companyIdentity" title={companyName}>{companyName}</span>
          <ThemeToggle />
          <SignOutButton variant="header" />
        </div>
      </header>
      {children}
    </div>
  );
}
