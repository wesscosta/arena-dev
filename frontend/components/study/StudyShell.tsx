"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./study.module.css";
import { useStudentPreferences } from "@/components/student/StudentAccessibilityControls";

function HomeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-4v6H5a1.5 1.5 0 0 1-1.5-1.5z" /></svg>; }
function JourneyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v4H5zM5 10h14v4H5zM5 15.5h14v4H5z" /></svg>; }
function LiveIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-7 12h6l-1 8 7-12h-6z"/></svg>}
function ProfileIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4.5 20c.8-3.5 3.8-5.5 7.5-5.5s6.7 2 7.5 5.5" /></svg>}
function SidebarIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.5h15v15h-15zM9.5 4.5v15" /></svg>}
function AchievementIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L9.5 8z"/></svg>}

export default function StudyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const journeysActive = pathname.startsWith("/learn/journeys");
  const liveActive = pathname.startsWith("/learn/live");
  const achievementsActive = pathname.startsWith("/learn/achievements");
  const profileActive = pathname.startsWith("/learn/profile");
  const homeActive = pathname === "/learn";
  const { scale: textScale, reducedMotion } = useStudentPreferences();
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [achievementToast, setAchievementToast] = useState<{ title: string; description: string } | null>(null);
  useEffect(() => {
    function onAchievement(event: Event) {
      const detail = (event as CustomEvent<{ title: string; description: string }>).detail;
      if (!detail) return;
      setAchievementToast(detail);
      window.setTimeout(() => setAchievementToast(null), 5000);
    }
    window.addEventListener("arena:achievement-unlocked", onAchievement);
    return () => window.removeEventListener("arena:achievement-unlocked", onAchievement);
  }, []);
  useEffect(() => {
    setSidebarHidden(window.localStorage.getItem("arena-dev:study-sidebar-hidden") === "1");
  }, []);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
  function toggleSidebar(hidden: boolean) {
    setSidebarHidden(hidden);
    window.localStorage.setItem("arena-dev:study-sidebar-hidden", hidden ? "1" : "0");
  }
  return <div className={`${styles.shell}${sidebarHidden ? ` ${styles.sidebarHidden}` : ""}`} style={{ "--study-text-scale": textScale, "--study-content-scale": textScale, "--study-text-percent": `${Math.round(textScale * 100)}%` } as React.CSSProperties} data-student-motion={reducedMotion ? "reduce" : undefined}>
    <aside className={styles.studySidebar} hidden={sidebarHidden}>
      <div className={styles.sidebarHead}>
        <Link href="/learn" className={styles.brand} aria-label="Arena Dev — Estudos"><span className={styles.brandMark}>A</span><span className={styles.brandCopy}><strong>ARENA DEV</strong><small>ESTUDOS</small></span></Link>
        <button type="button" className={styles.sidebarToggle} onClick={() => toggleSidebar(true)} aria-label="Ocultar menu lateral" title="Ocultar menu lateral"><SidebarIcon/></button>
      </div>
      <nav className={styles.nav} aria-label="Navegação de estudos">
        <Link href="/learn" className={homeActive ? styles.activeNav : undefined}><HomeIcon/><span>Início</span></Link>
        <Link href="/learn/journeys" className={journeysActive ? styles.activeNav : undefined}><JourneyIcon/><span>Jornadas</span></Link>
        <Link href="/learn/live" className={liveActive ? styles.activeNav : undefined}><LiveIcon/><span>Entrar ao vivo</span></Link>
        <Link href="/learn/achievements" className={achievementsActive ? styles.activeNav : undefined}><AchievementIcon/><span>Conquistas</span></Link>
      </nav>
      <nav className={`${styles.nav} ${styles.navFoot}`} aria-label="Conta">
        <Link href="/learn/profile" className={profileActive ? styles.activeNav : undefined}><ProfileIcon/><span>Configurações</span></Link>
      </nav>
    </aside>
    <div className={styles.studyWorkspace}>
      {sidebarHidden && <div className={styles.sidebarRevealBar}><button type="button" className={styles.sidebarReveal} onClick={() => toggleSidebar(false)} aria-label="Mostrar menu lateral" title="Mostrar menu lateral"><SidebarIcon/></button></div>}
      <header className={styles.mobileHeader}>
        <Link href="/learn" className={styles.brand} aria-label="Arena Dev — Estudos"><span className={styles.brandMark}>A</span><span className={styles.brandCopy}><strong>ARENA DEV</strong><small>ESTUDOS</small></span></Link>
        <div className={styles.mobileHeaderActions}>
          <Link href="/learn/profile" className={`${styles.mobileProfile}${profileActive ? ` ${styles.activeNav}` : ""}`} aria-label="Configurações e perfil"><ProfileIcon/></Link>
          <button type="button" className={styles.mobileMenuButton} aria-label={mobileMenuOpen ? "Fechar navegação" : "Abrir navegação"} aria-expanded={mobileMenuOpen} aria-controls="student-mobile-navigation" onClick={() => setMobileMenuOpen((value) => !value)}><SidebarIcon/></button>
        </div>
      </header>
      {mobileMenuOpen && <nav id="student-mobile-navigation" className={styles.mobileNavigation} aria-label="Navegação de estudos no celular">
        <Link href="/learn" aria-current={homeActive ? "page" : undefined}><HomeIcon/>Início</Link>
        <Link href="/learn/journeys" aria-current={journeysActive ? "page" : undefined}><JourneyIcon/>Jornadas</Link>
        <Link href="/learn/live" aria-current={liveActive ? "page" : undefined}><LiveIcon/>Entrar ao vivo</Link>
        <Link href="/learn/achievements" aria-current={achievementsActive ? "page" : undefined}><AchievementIcon/>Conquistas</Link>
        <Link href="/learn/profile" aria-current={profileActive ? "page" : undefined}><ProfileIcon/>Configurações</Link>
      </nav>}
      <main className={styles.main}>{children}</main>
    </div>
    {achievementToast && <div className={styles.achievementToast} role="status" aria-live="polite"><span><AchievementIcon /></span><div><small>Nova conquista</small><strong>{achievementToast.title}</strong><p>{achievementToast.description}</p></div></div>}
  </div>;
}
