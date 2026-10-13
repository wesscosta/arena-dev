"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchAllStudyJourneys, fetchAllStudyLiveSessions, type LiveSessionSummary, type MultiClassroomJourneySummary } from "@/lib/study-api";
import styles from "@/components/study/study.module.css";

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

    {!loading && !error && (current || liveSessions.length > 0) && (
      <div className={styles.learningFeatureGrid}>
        {current && <section className={`${styles.hero} ${styles.learningHero}`} aria-labelledby="continue-title">
          <div className={styles.heroTop}>
            <div>
              <p className={styles.eyebrow}>Jornada em andamento</p>
              <h2 id="continue-title">{current.title}</h2>
              {learnerDescription(current.description) && <p className={styles.muted}>{learnerDescription(current.description)}</p>}
              {current.currentContentTitle && <p className={styles.current}>Próximo conteúdo<strong>{current.currentContentTitle}</strong></p>}
            </div>
            <Link className={styles.button} href={current.currentContentId ? `/learn/journeys/${current.id}/content/${current.currentContentId}` : `/learn/journeys/${current.id}`}>{current.started ? "Continuar" : "Começar"}</Link>
          </div>
          <div className={styles.learningProgressStage}>
            <div className={styles.learningStageHeader}>
              <span>PROGRESSO DA JORNADA</span>
              <strong>{current.progress.percent}%</strong>
            </div>
            <div className={styles.progress} role="progressbar"
              aria-label="Conteúdos concluídos nesta jornada"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.progress.percent}>
              <span style={{ width: `${Math.min(100, Math.max(0, current.progress.percent))}%` }} />
            </div>
            <div className={styles.learningMilestones} aria-label="Resumo dos conteúdos da jornada">
              <span><strong>{current.progress.completedContents}</strong> concluídos</span>
              <span><strong>{Math.max(0, current.progress.totalContents - current.progress.completedContents)}</strong> pendentes</span>
              <span><strong>{current.progress.totalContents}</strong> no total</span>
            </div>
          </div>
        </section>}
        {liveSessions.length > 0 ? (
          <aside className={styles.learningLiveCard} aria-label="Aulas ao vivo disponíveis">
            <span className={styles.learningLiveEyebrow}>ARENA AO VIVO</span>
            <h2>{liveSessions.length === 1 ? liveSessions[0].classroomName : `${liveSessions.length} aulas acontecendo`}</h2>
            <p>{liveSessions.length === 1 ? liveSessions[0].sessionTitle : "Escolha uma aula ao vivo disponível."}</p>
            <div className={styles.learningLiveFooter}>
              <span>Participação durante a sessão</span>
              <Link href="/learn/live">Entrar ao vivo <span aria-hidden="true">↗</span></Link>
            </div>
          </aside>
        ) : current && (
          <aside className={styles.learningContextCard} aria-label="Outras jornadas disponíveis">
            <span className={styles.eyebrow}>ORGANIZE SEU ESTUDO</span>
            <h2>Seu próximo passo está definido.</h2>
            <p>Continue no conteúdo indicado ou consulte outras jornadas publicadas. Progresso indica estudo realizado, não domínio comprovado.</p>
            <Link href="/learn/journeys">Ver todas as jornadas <span aria-hidden="true">↗</span></Link>
          </aside>
        )}
      </div>
    )}

    {!loading && !error && others.filter(j=>j.progress.percent<100).length > 0 && <section className={styles.section}><div className={styles.sectionHead}><h2>Em andamento</h2><Link href="/learn/journeys" className={styles.sectionLink}>Ver todas</Link></div><div className={styles.list}>{others.filter(j=>j.progress.percent<100).slice(0,3).map((journey) => <Link key={journey.id} href={`/learn/journeys/${journey.id}`} className={styles.card}><div><h3>{journey.title}</h3><p>{journey.progress.percent === 100 ? "Jornada concluída" : journey.currentContentTitle ? `${journey.started ? "Continuar" : "Começar"} em ${journey.currentContentTitle}` : journey.description || "Jornada de estudo"}</p></div><span className={styles.percent}>{journey.progress.percent}%</span></Link>)}</div></section>}
  </>;
}
