"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";
import { BellIcon, DecisionsIcon, HomeIcon, RankingIcon, ResultsIcon, WalletIcon } from "./Icons";

const nav = [
  { href: "/app", label: "Inicio", icon: HomeIcon },
  { href: "/app/decisiones", label: "Decisiones", icon: DecisionsIcon },
  { href: "/app/resultados", label: "Resultados", icon: ResultsIcon },
  { href: "/app/ranking", label: "Ranking", icon: RankingIcon },
  { href: "/app/ingresos", label: "Ingresos", icon: WalletIcon },
  { href: "/app/notificaciones", label: "Notificaciones", icon: BellIcon },
];

export function AppShell({ children, profileName, specialty, score, notificationCount = 0 }: { children: React.ReactNode; profileName: string; specialty: string; score: number; notificationCount?: number }) {
  const pathname = usePathname();
  const initial = profileName.trim().charAt(0).toUpperCase() || "N";
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop"><Brand size="sidebar" priority /></div>
        <nav className="sidebarNav">
          {nav.map((item) => {
            const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={`sideLink ${active ? "active" : ""}`}><Icon/><span>{item.label}</span>{item.href === "/app/notificaciones" && notificationCount > 0 ? <b className="navCount">{notificationCount > 99 ? "99+" : notificationCount}</b> : null}</Link>;
          })}
        </nav>
        <div className="sidebarBottom">
          <div className="miniProfile"><div className="avatar">{initial}</div><div><strong>{profileName}</strong><span>{specialty} · {score}</span></div></div>
          <SignOutButton />
        </div>
      </aside>
      <div className="appMain">
        <header className="topbar">
          <div className="mobileBrand"><Brand size="mobile" priority /></div>
          <div className="topbarSpacer" />
          <Link className="topbarNotification" href="/app/notificaciones" aria-label="Abrir notificaciones">
            <BellIcon />
            {notificationCount > 0 ? <b className="navCount floating">{notificationCount > 99 ? "99+" : notificationCount}</b> : null}
          </Link>
          <ThemeToggle />
          <Link className="avatarButton" href="/app/perfil" aria-label="Abrir perfil">{initial}</Link>
        </header>
        <main className="appContent">{children}</main>
      </div>
    </div>
  );
}
