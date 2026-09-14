"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/SignOutButton";

export function CompanyShell({
  children,
  companyName,
}: {
  children: React.ReactNode;
  companyName: string;
}) {
  const pathname = usePathname();
  const onProfile = pathname.startsWith("/empresa/perfil");

  return (
    <div className="companyPage">
      <header className="companyNav">
        <Link href="/empresa" aria-label="Ir al inicio de empresa">
          <Brand size="nav" priority />
        </Link>
        <nav className="companyNavLinks">
          <Link className={!onProfile ? "active" : ""} href="/empresa">Inicio</Link>
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
