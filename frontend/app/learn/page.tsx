"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchAllStudyJourneys, type MultiClassroomJourneySummary } from "@/lib/study-api";
import styles from "./study.module.css";

type Loaded = { journeys: MultiClassroomJourneySummary[] };

export default function LearnHomePage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetchAllStudyJourneys().then((journeys) => { if (active) { setLoaded({ journeys }); setLoading(false); } })
      .catch((caught) => { if (active) { setError(caught instanceof Error ? caught.message : "Não foi possível recuperar suas jornadas."); setLoading(false); } });
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
    {!loading && !error && !current && journeys.length === 0 && <div className={styles.empty}><strong>Seu espaço de estudo ainda está vazio.</strong><p>Quando uma jornada for publicada em uma das suas turmas, ela aparecerá aqui.</p></div>}
    {!loading && !error && !current && journeys.length > 0 && <div className={styles.empty}><strong>Você está em dia.</strong><p>Todas as jornadas disponíveis foram concluídas. <Link href="/learn/journeys">Ver jornadas concluídas</Link></p></div>}

    {current && <section className={styles.hero} aria-labelledby="continue-title">
      <div className={styles.heroTop}><div><p className={styles.eyebrow}>Continue estudando</p><h2 id="continue-title">{current.title}</h2><p className={styles.muted}>{current.classroomName && <span className={styles.contextLine}>{current.classroomName}</span>}{current.description || "Seu percurso de estudo atual."}</p>{current.currentContentTitle && <p className={styles.current}>Próximo conteúdo<strong>{current.currentContentTitle}</strong></p>}</div>
      <Link className={styles.button} href={current.currentContentId ? `/learn/journeys/${current.id}/content/${current.currentContentId}` : `/learn/journeys/${current.id}`}>{current.started ? "Continuar" : "Começar"}</Link></div>
      <div className={styles.progress} aria-label={`${current.progress.percent}% concluído`}><span style={{ width: `${current.progress.percent}%` }} /></div>
      <div className={styles.progressMeta}><span>{current.progress.completedContents} de {current.progress.totalContents} conteúdos</span><strong>{current.progress.percent}%</strong></div>
    </section>}

    {!loading && !error && others.filter(j=>j.progress.percent<100).length > 0 && <section className={styles.section}><div className={styles.sectionHead}><h2>Em andamento</h2><Link href="/learn/journeys" className={styles.sectionLink}>Ver todas</Link></div><div className={styles.list}>{others.filter(j=>j.progress.percent<100).slice(0,3).map((journey) => <Link key={journey.id} href={`/learn/journeys/${journey.id}`} className={styles.card}><div><h3>{journey.title}</h3><p>{journey.progress.percent === 100 ? "Jornada concluída" : journey.currentContentTitle ? `${journey.started ? "Continuar" : "Começar"} em ${journey.currentContentTitle}` : journey.description || "Jornada de estudo"}</p></div><span className={styles.percent}>{journey.progress.percent}%</span></Link>)}</div></section>}
  </>;
}
