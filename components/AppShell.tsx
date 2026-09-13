"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { DecisionsIcon, HomeIcon, RankingIcon, ResultsIcon, WalletIcon } from "./Icons";

const nav = [
  { href: "/app", label: "Inicio", icon: HomeIcon },
  { href: "/app/decisiones", label: "Decisiones", icon: DecisionsIcon },
  { href: "/app/resultados", label: "Resultados", icon: ResultsIcon },
  { href: "/app/ranking", label: "Ranking", icon: RankingIcon },
  { href: "/app/ingresos", label: "Ingresos", icon: WalletIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop"><Brand size="sidebar" priority /></div>
        <nav className="sidebarNav">
          {nav.map((item) => {
            const active = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={`sideLink ${active ? "active" : ""}`}><Icon/><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebarBottom">
          <div className="miniProfile"><div className="avatar">S</div><div><strong>Sergio</strong><span>Marketing · 842</span></div></div>
        </div>
      </aside>
      <div className="appMain">
        <header className="topbar">
          <div className="mobileBrand"><Brand size="mobile" priority /></div>
          <div className="topbarSpacer" />
          <button className="plainButton">Empresa</button>
          <ThemeToggle />
          <button className="avatarButton">S</button>
        </header>
        <main className="appContent">{children}</main>
      </div>
    </div>
  );
}
