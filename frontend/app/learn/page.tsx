"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchAllStudyJourneys, fetchAllStudyLiveSessions, type LiveSessionSummary, type MultiClassroomJourneySummary } from "@/lib/study-api";
import styles from "./study.module.css";

type Loaded = { journeys: MultiClassroomJourneySummary[]; liveSessions: LiveSessionSummary[] };
function learnerDescription(description: string | null | undefined) {
  if (!description) return "";
  const normalized = description.trim().toLowerCase();
  if ([
    "estrutura preservada a partir do markdown fornecido.",
    "estrutura preservada a partir do texto fornecido.",
    "estrutura preservada a partir do notion fornecido.",
  ].includes(normalized)) return "";
  return description.trim();
}


export default function LearnHomePage() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([fetchAllStudyJourneys(), fetchAllStudyLiveSessions()])
      .then(([journeys, liveSessions]) => { if (active) { setLoaded({ journeys, liveSessions }); setLoading(false); } })
      .catch((caught) => { if (active) { setError(caught instanceof Error ? caught.message : "Não foi possível recuperar seu espaço de estudo."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const journeys = loaded?.journeys ?? [];
  const liveSessions = loaded?.liveSessions ?? [];
  const current = useMemo(() => journeys.find((journey) => journey.started && journey.progress.percent < 100)
    ?? journeys.find((journey) => journey.progress.percent < 100)
    ?? null, [journeys]);
  const others = current ? journeys.filter((journey) => journey.id !== current.id) : journeys;

  return <>
    <p className={styles.eyebrow}>Seu espaço de estudo</p>
    <h1 className={styles.title}>{journeys.length ? "Continue de onde parou." : "Seu espaço de estudo"}</h1>
    <p className={styles.lead}>Retome seus estudos, acompanhe o progresso e acesse rapidamente o próximo conteúdo.</p>

    {loading && <div className={`${styles.hero} ${styles.skeleton}`}><h2>Carregando seus estudos…</h2><p className={styles.muted}>Recuperando jornadas e progresso.</p></div>}
    {!loading && error && <div className={styles.error}><strong>Não foi possível abrir seu espaço de estudo.</strong><p>{error}</p><Link href="/join" className={styles.button}>Entrar em uma aula</Link></div>}
    {!loading && !error && !current && journeys.length === 0 && <div className={styles.empty}><strong>Seu espaço de estudo ainda está vazio.</strong><p>Quando uma jornada for publicada em uma das suas turmas, ela aparecerá aqui.</p></div>}
    {!loading && !error && !current && journeys.length > 0 && <div className={styles.empty}><strong>Você está em dia.</strong><p>Todas as jornadas disponíveis foram concluídas. <Link href="/learn/journeys">Ver jornadas concluídas</Link></p></div>}

    {!loading && !error && liveSessions.length > 0 && <section className={styles.homeLive}>
      <div><span>AGORA</span><strong>{liveSessions.length === 1 ? liveSessions[0].classroomName : liveSessions.length + " aulas acontecendo"}</strong><p>{liveSessions.length === 1 ? liveSessions[0].sessionTitle : "Escolha a aula que deseja acompanhar."}</p></div>
      <Link href="/learn/live" className={styles.button}>Entrar ao vivo</Link>
    </section>}

    {current && <section className={styles.hero} aria-labelledby="continue-title">
      <div className={styles.heroTop}><div><p className={styles.eyebrow}>Jornada em andamento</p><h2 id="continue-title">{current.title}</h2>{learnerDescription(current.description) && <p className={styles.muted}>{learnerDescription(current.description)}</p>}{current.currentContentTitle && <p className={styles.current}>Próximo conteúdo<strong>{current.currentContentTitle}</strong></p>}</div>
      <Link className={styles.button} href={current.currentContentId ? `/learn/journeys/${current.id}/content/${current.currentContentId}` : `/learn/journeys/${current.id}`}>{current.started ? "Continuar" : "Começar"}</Link></div>
      <div className={styles.progress} aria-label={`${current.progress.percent}% concluído`}><span style={{ width: `${current.progress.percent}%` }} /></div>
      <div className={styles.progressMeta}><span>{current.progress.completedContents} de {current.progress.totalContents} conteúdos</span><strong>{current.progress.percent}%</strong></div>
    </section>}

    {!loading && !error && others.filter(j=>j.progress.percent<100).length > 0 && <section className={styles.section}><div className={styles.sectionHead}><h2>Em andamento</h2><Link href="/learn/journeys" className={styles.sectionLink}>Ver todas</Link></div><div className={styles.list}>{others.filter(j=>j.progress.percent<100).slice(0,3).map((journey) => <Link key={journey.id} href={`/learn/journeys/${journey.id}`} className={styles.card}><div><h3>{journey.title}</h3><p>{journey.progress.percent === 100 ? "Jornada concluída" : journey.currentContentTitle ? `${journey.started ? "Continuar" : "Começar"} em ${journey.currentContentTitle}` : journey.description || "Jornada de estudo"}</p></div><span className={styles.percent}>{journey.progress.percent}%</span></Link>)}</div></section>}
  </>;
}
