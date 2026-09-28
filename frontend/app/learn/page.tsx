"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchStudyJourneys, StudyApiError, studyDeviceClaims, type JourneyStudySummary } from "@/lib/study-api";
import styles from "./study.module.css";

type Loaded = { token: string; journeys: JourneyStudySummary[] };

export default function LearnHomePage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const claims = studyDeviceClaims();
      if (!claims.length) { if (active) { setError("Este dispositivo ainda não possui uma identificação de estudo. Entre em uma aula e marque a opção de lembrar o dispositivo."); setLoading(false); } return; }
      let lastError = "Não foi possível recuperar suas jornadas.";
      for (const claim of claims) {
        try {
          const journeys = await fetchStudyJourneys(claim.token);
          if (!active) return;
          setLoaded({ token: claim.token, journeys });
          setLoading(false);
          return;
        } catch (caught) {
          lastError = caught instanceof Error ? caught.message : lastError;
          if (caught instanceof StudyApiError && caught.status === 401) localStorage.removeItem(`arena-dev-device:${claim.classroomId}`);
        }
      }
      if (active) { setError(lastError); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const journeys = loaded?.journeys ?? [];
  const current = useMemo(() => journeys.find((journey) => journey.started && journey.progress.percent < 100)
    ?? journeys.find((journey) => journey.progress.percent < 100)
    ?? null, [journeys]);
  const others = current ? journeys.filter((journey) => journey.id !== current.id) : journeys;

  return <>
    <p className={styles.eyebrow}>Seu espaço de estudo</p>
    <h1 className={styles.title}>Continue de onde parou.</h1>
    <p className={styles.lead}>Jornadas organizadas em módulos e conteúdos, com seu progresso salvo para você retomar sem depender de uma aula ao vivo.</p>

    {loading && <div className={`${styles.hero} ${styles.skeleton}`}><h2>Carregando seus estudos…</h2><p className={styles.muted}>Recuperando jornadas e progresso.</p></div>}
    {!loading && error && <div className={styles.error}><strong>Não foi possível abrir seu espaço de estudo.</strong><p>{error}</p><Link href="/join" className={styles.button}>Entrar em uma aula</Link></div>}
    {!loading && !error && !current && <div className={styles.empty}><strong>Nenhuma jornada publicada ainda.</strong><p>Quando seu professor publicar um percurso de estudo, ele aparecerá aqui.</p></div>}

    {current && <section className={styles.hero} aria-labelledby="continue-title">
      <div className={styles.heroTop}><div><p className={styles.eyebrow}>Continue estudando</p><h2 id="continue-title">{current.title}</h2><p className={styles.muted}>{current.description || "Seu percurso de estudo atual."}</p>{current.currentContentTitle && <p className={styles.current}>Próximo conteúdo<strong>{current.currentContentTitle}</strong></p>}</div>
      <Link className={styles.button} href={current.currentContentId ? `/learn/journeys/${current.id}/content/${current.currentContentId}` : `/learn/journeys/${current.id}`}>{current.started ? "Continuar" : "Começar"}</Link></div>
      <div className={styles.progress} aria-label={`${current.progress.percent}% concluído`}><span style={{ width: `${current.progress.percent}%` }} /></div>
      <div className={styles.progressMeta}><span>{current.progress.completedContents} de {current.progress.totalContents} conteúdos</span><strong>{current.progress.percent}%</strong></div>
    </section>}

    {!loading && !error && others.length > 0 && <section className={styles.section}><div className={styles.sectionHead}><h2>Outras jornadas</h2></div><div className={styles.list}>{others.map((journey) => <Link key={journey.id} href={`/learn/journeys/${journey.id}`} className={styles.card}><div><h3>{journey.title}</h3><p>{journey.progress.percent === 100 ? "Jornada concluída" : journey.currentContentTitle ? `${journey.started ? "Continuar" : "Começar"} em ${journey.currentContentTitle}` : journey.description || "Jornada de estudo"}</p></div><span className={styles.percent}>{journey.progress.percent}%</span></Link>)}</div></section>}
  </>;
}
