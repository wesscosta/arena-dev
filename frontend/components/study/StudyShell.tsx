"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "@/app/learn/study.module.css";

export default function StudyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const journeysActive = pathname.startsWith("/learn/journeys");
  return <div className={styles.shell}>
    <header className={styles.header}>
      <Link href="/learn" className={styles.brand} aria-label="Arena Dev — Estudos"><span className={styles.brandMark}>A</span><span>Arena Dev</span></Link>
      <nav className={styles.nav} aria-label="Navegação de estudos">
        <Link href="/learn" className={!journeysActive ? styles.activeNav : undefined}>Início</Link>
        <Link href="/learn/journeys" className={journeysActive ? styles.activeNav : undefined}>Jornadas</Link>
      </nav>
    </header>
    <main className={styles.main}>{children}</main>
  </div>;
}
