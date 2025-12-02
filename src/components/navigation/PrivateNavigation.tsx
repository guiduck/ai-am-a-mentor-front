"use client";

import { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./PrivateNavigation.module.css";

type Role = "creator" | "student" | undefined;

interface PrivateNavigationProps {
  role: Role;
  username?: string;
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
}

const creatorRoutes: NavItem[] = [
  { href: "/dashboard/creator", label: "Dashboard" },
  { href: "/courses/manage", label: "Gerenciar cursos" },
  { href: "/courses/create", label: "Novo curso" },
  { href: "/courses", label: "Biblioteca" },
];

const studentRoutes: NavItem[] = [
  { href: "/dashboard/student", label: "Dashboard" },
  { href: "/courses", label: "Explorar cursos" },
  { href: "/courses/enrolled", label: "Meus cursos" },
];

const accountRoutes: NavItem[] = [
  { href: "/profile", label: "Perfil" },
  { href: "/payments", label: "Pagamentos" },
  { href: "/messages", label: "Mensagens" },
];

export function PrivateNavigation({
  role,
  username,
  children,
}: PrivateNavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = useMemo<NavItem[]>(() => {
    return role === "creator" ? creatorRoutes : studentRoutes;
  }, [role]);

  const handleNavigate = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname.startsWith(item.href);
    return (
      <li key={item.href}>
        <button
          onClick={() => handleNavigate(item.href)}
          className={`${styles.navButton} ${isActive ? styles.active : ""}`}
        >
          {item.label}
        </button>
      </li>
    );
  };

  return (
    <div className={styles.shell}>
      <button
        className={`${styles.toggle} ${menuOpen ? styles.toggleOpen : ""}`}
        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>

      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.brand}>
          <Link href="/dashboard">
            <span>AI Mentor</span>
          </Link>
          <p>{role === "creator" ? "Criador" : "Estudante"}</p>
        </div>

        <div className={styles.userCard}>
          <div>
            <p>Logado como</p>
            <strong>{username || "Usuário"}</strong>
          </div>
          <span className={styles.userBadge}>
            {role === "creator" ? "Criador" : "Estudante"}
          </span>
        </div>

        <nav className={styles.navigation}>
          <p className={styles.sectionLabel}>
            {role === "creator" ? "Gerenciar" : "Aprender"}
          </p>
          <ul>{navLinks.map(renderNavItem)}</ul>

          <p className={styles.sectionLabel}>Conta</p>
          <ul>{accountRoutes.map(renderNavItem)}</ul>
        </nav>

        <button
          onClick={() => handleNavigate("/logout")}
          className={styles.logoutButton}
        >
          Sair
        </button>
      </aside>

      {menuOpen && (
        <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />
      )}

      <main className={styles.content}>{children}</main>
    </div>
  );
}

