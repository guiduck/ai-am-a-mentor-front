"use client";

import { ReactNode, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./PrivateNavigation.module.css";
import { getCreditBalance } from "@/services/payments";

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
  const [credits, setCredits] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = useMemo<NavItem[]>(() => {
    return role === "creator" ? creatorRoutes : studentRoutes;
  }, [role]);

  // Fetch credit balance
  useEffect(() => {
    const fetchCredits = async () => {
      const balance = await getCreditBalance();
      if (balance) {
        setCredits(balance.balance);
      }
    };
    fetchCredits();
  }, [pathname]); // Refresh when navigating

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

        {/* Credit Balance Card */}
        <button
          onClick={() => handleNavigate("/payments")}
          className={styles.creditsCard}
        >
          <span className={styles.creditsIcon}>💰</span>
          <div className={styles.creditsInfo}>
            <span className={styles.creditsLabel}>Créditos</span>
            <strong className={styles.creditsValue}>
              {credits !== null ? credits : "..."}
            </strong>
          </div>
          <span className={styles.creditsAdd}>+</span>
        </button>

        <nav className={styles.navigation}>
          <p className={styles.sectionLabel}>
            {role === "creator" ? "Gerenciar" : "Aprender"}
          </p>
          <ul>{navLinks.map(renderNavItem)}</ul>

          {/* Novo Curso button for creators */}
          {role === "creator" && (
            <button
              onClick={() => handleNavigate("/courses/create")}
              className={styles.newCourseButton}
            >
              + Novo Curso
            </button>
          )}

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
