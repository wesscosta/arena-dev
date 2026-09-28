"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "@/app/learn/study.module.css";

function HomeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-4v6H5a1.5 1.5 0 0 1-1.5-1.5z" /></svg>; }
function JourneyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v4H5zM5 10h14v4H5zM5 15.5h14v4H5z" /></svg>; }
function LiveIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-7 12h6l-1 8 7-12h-6z"/></svg>}
function AchievementIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L9.5 8z"/></svg>}

export default function StudyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const journeysActive = pathname.startsWith("/learn/journeys");
  const liveActive = pathname.startsWith("/learn/live");
  const achievementsActive = pathname.startsWith("/learn/achievements");
  const homeActive = pathname === "/learn";
  return <div className={styles.shell}>
    <aside className={styles.studySidebar}>
      <Link href="/learn" className={styles.brand} aria-label="Arena Dev — Estudos"><span className={styles.brandMark}>A</span><span className={styles.brandCopy}><strong>ARENA DEV</strong><small>ESTUDOS</small></span></Link>
      <nav className={styles.nav} aria-label="Navegação de estudos">
        <Link href="/learn" className={homeActive ? styles.activeNav : undefined}><HomeIcon/><span>Início</span></Link>
        <Link href="/learn/journeys" className={journeysActive ? styles.activeNav : undefined}><JourneyIcon/><span>Jornadas</span></Link>
        <Link href="/learn/live" className={liveActive ? styles.activeNav : undefined}><LiveIcon/><span>Entrar ao vivo</span></Link>
        <Link href="/learn/achievements" className={achievementsActive ? styles.activeNav : undefined}><AchievementIcon/><span>Conquistas</span></Link>
      </nav>
      <div className={styles.sidebarFoot}><span>Seu espaço de aprendizagem</span></div>
    </aside>
    <div className={styles.studyWorkspace}>
      <header className={styles.mobileHeader}><Link href="/learn" className={styles.brand} aria-label="Arena Dev — Estudos"><span className={styles.brandMark}>A</span><span className={styles.brandCopy}><strong>ARENA DEV</strong><small>ESTUDOS</small></span></Link></header>
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}
