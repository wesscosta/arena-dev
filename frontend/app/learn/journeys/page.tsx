"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchStudyJourneys, studyDeviceClaims, type JourneyStudySummary } from "@/lib/study-api";
import styles from "../study.module.css";

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<JourneyStudySummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { let active = true; (async () => { for (const claim of studyDeviceClaims()) { try { const data = await fetchStudyJourneys(claim.token); if (active) { setJourneys(data); setState("ready"); } return; } catch {} } if (active) setState("error"); })(); return () => { active = false; }; }, []);
  return <><p className={styles.eyebrow}>Jornadas</p><h1 className={styles.title}>Seus percursos de estudo</h1><p className={styles.lead}>Acesse os conteúdos publicados para sua turma e acompanhe o avanço em cada jornada.</p>
    {state === "loading" && <div className={styles.empty}>Carregando jornadas…</div>}
    {state === "error" && <div className={styles.error}>Não foi possível identificar seus estudos neste dispositivo. <Link href="/join">Entrar em uma aula</Link></div>}
    {state === "ready" && <section className={styles.section}><div className={styles.list}>{journeys.map(j => <Link key={j.id} href={`/learn/journeys/${j.id}`} className={styles.card}><div><h3>{j.title}</h3><p>{j.progress.percent === 100 ? "Jornada concluída" : j.currentContentTitle ? `${j.started ? "Continuar" : "Começar"}: ${j.currentContentTitle}` : j.description || "Percurso de estudo"}</p></div><span className={styles.percent}>{j.progress.percent}%</span></Link>)}</div>{!journeys.length && <div className={styles.empty}>Nenhuma jornada publicada para sua turma.</div>}</section>}
  </>;
}
