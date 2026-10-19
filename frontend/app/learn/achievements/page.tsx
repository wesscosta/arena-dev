"use client";

import { useEffect, useState } from "react";
import { fetchAllStudyAchievements, type AchievementCode, type AchievementSummary } from "@/lib/study-api";
import styles from "@/components/study/study.module.css";

function MilestoneIcon({ code, unlocked }: { code: AchievementCode; unlocked: boolean }) {
  if (unlocked) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>;
  if (code === "FIRST_JOURNEY_COMPLETED") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v15H5zM8 8h8M8 12h8M8 16h5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /></svg>;
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetchAllStudyAchievements().then(setData).catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar suas conquistas.")); }, []);

  if (error) return <div className={styles.error}>{error}</div>;
  return <>
    <p className={styles.eyebrow}>Conquistas</p>
    <h1 className={styles.title}>Marcos do seu percurso.</h1>
    <p className={styles.lead}>Reconhecimentos conquistados conforme você avança nas Jornadas.</p>
    {!data ? <div className={styles.empty}>Carregando conquistas…</div> : <section className={styles.achievementView} aria-labelledby="achievement-summary">
      <div className={styles.achievementSummary}>
        <div><strong id="achievement-summary">{data.unlocked} de {data.total}</strong><span>conquistadas</span></div>
        <div className={styles.achievementProgress} role="progressbar" aria-label={`${data.unlocked} de ${data.total} conquistas`} aria-valuemin={0} aria-valuemax={data.total} aria-valuenow={data.unlocked}><span style={{ width: `${data.total ? Math.round(data.unlocked * 100 / data.total) : 0}%` }} /></div>
      </div>
      <div className={styles.achievementList}>
        {data.items.map((item) => <article key={item.code} className={`${styles.achievementRow} ${item.unlocked ? styles.achievementUnlocked : ""}`}>
          <span className={styles.achievementMark}><MilestoneIcon code={item.code} unlocked={item.unlocked} /></span>
          <div><h2>{item.title}</h2><p>{item.description}</p>{item.unlocked && <small>Conquistada</small>}</div>
        </article>)}
      </div>
    </section>}
  </>;
}
