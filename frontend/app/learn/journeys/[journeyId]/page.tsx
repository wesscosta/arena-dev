"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchStudyJourney, fetchTeacherStudyPreview, studyDeviceClaims, type JourneyContentView, type JourneyStudyView } from "@/lib/study-api";
import styles from "../../study.module.css";

function moduleProgress(contents: JourneyContentView[]) {
  const completed = contents.filter((content) => content.state === "COMPLETED").length;
  return { completed, total: contents.length };
}

function ContentRow({ journeyId, content, isLast, preview = false }: { journeyId: string; content: JourneyContentView; isLast: boolean; preview?: boolean }) {
  const stateLabel = preview ? "Disponível" : content.state === "COMPLETED" ? "Concluído" : content.state === "CURRENT" ? "Atual" : "Bloqueado";
  const marker = preview ? "○" : content.state === "COMPLETED" ? "✓" : content.state === "CURRENT" ? "●" : "○";
  const body = <>
    <span className={`${styles.studyMarker} ${styles[`studyMarker${content.state}`]}`} aria-hidden="true">{marker}</span>
    {!isLast && <span className={styles.studyConnector} aria-hidden="true" />}
    <span className={styles.studyContentText}><strong>{content.title}</strong>{content.description && <span>{content.description}</span>}{!preview && content.state === "LOCKED" && <small>Conclua o conteúdo anterior para avançar.</small>}</span>
    <span className={`${styles.studyState} ${styles[`studyState${content.state}`]}`}>{stateLabel}</span>
    {content.state === "CURRENT" && <span className={styles.studyContinue}>{preview ? "Abrir" : "Continuar"} <span aria-hidden="true">→</span></span>}
  </>;

  return !preview && content.state === "LOCKED"
    ? <div className={`${styles.studyContentRow} ${styles.studyContentLocked}`} aria-disabled="true">{body}</div>
    : <Link className={`${styles.studyContentRow} ${!preview && content.state === "CURRENT" ? styles.studyContentCurrent : ""}`} href={`/learn/journeys/${journeyId}/content/${content.id}${preview ? "?preview=teacher" : ""}`}>{body}</Link>;
}

export default function JourneyStudyPage() {
  const { journeyId } = useParams<{ journeyId: string }>();
  const searchParams = useSearchParams();
  const teacherPreview = searchParams.get("preview") === "teacher";
  const [journey, setJourney] = useState<JourneyStudyView | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; (async () => {
    if (teacherPreview) {
      try { const data = await fetchTeacherStudyPreview(journeyId); if (active) setJourney(data); }
      catch { if (active) setError("Não foi possível abrir a prévia desta jornada."); }
      return;
    }
    for (const claim of studyDeviceClaims()) { try { const data = await fetchStudyJourney(journeyId, claim.token); if (active) setJourney(data); return; } catch {} }
    if (active) setError("Não foi possível abrir esta jornada.");
  })(); return () => { active = false; }; }, [journeyId, teacherPreview]);
  if (error) return <div className={styles.error}>{error}</div>;
  if (!journey) return <div className={styles.empty}>Carregando jornada…</div>;

  return <div className={styles.studyView}>
    {teacherPreview && <div className={styles.teacherPreviewBar}><span><strong>Prévia do professor</strong> · mesma experiência de estudo do aluno, sem registrar progresso</span><a href={`/?journey=${journeyId}`}>Editar jornada</a></div>}
    <Link href={teacherPreview ? "/" : "/learn/journeys"} className={styles.studyBack}>← {teacherPreview ? "Workspace" : "Jornadas"}</Link>
    <header className={styles.studyHeader}>
      <div><p className={styles.eyebrow}>Jornada de estudo</p><h1 className={styles.studyTitle}>{journey.title}</h1>{journey.description && <p className={styles.studyLead}>{journey.description}</p>}</div>
      {!teacherPreview && <div className={styles.studyProgressNumber}><strong>{journey.progress.percent}%</strong><span>concluído</span></div>}
    </header>
    {!teacherPreview && <><div className={styles.studyProgressTrack} aria-label={`${journey.progress.percent}% concluído`}><span style={{ width: `${journey.progress.percent}%` }} /></div>
    <div className={styles.studyProgressMeta}><span>{journey.progress.completedContents} de {journey.progress.totalContents} conteúdos concluídos</span><span>{journey.progress.totalContents - journey.progress.completedContents} restantes</span></div></>}

    <div className={styles.studyModules}>{journey.modules.map((module, moduleIndex) => {
      const progress = moduleProgress(module.contents);
      const done = !teacherPreview && progress.total > 0 && progress.completed === progress.total;
      return <section className={styles.studyModule} key={module.id || `module-${moduleIndex}`} aria-labelledby={`module-${moduleIndex}`}>
        <div className={styles.studyModuleIndex}>{String(moduleIndex + 1).padStart(2, "0")}</div>
        <div className={styles.studyModuleBody}>
          <header className={styles.studyModuleHeader}><div><div className={styles.studyModuleTitleLine}><h2 id={`module-${moduleIndex}`}>{module.title}</h2>{done && <span className={styles.studyModuleDone}>Concluído</span>}</div>{module.description && <p>{module.description}</p>}</div><span className={styles.studyModuleCount}>{teacherPreview ? `${progress.total} conteúdos` : `${progress.completed}/${progress.total}`}</span></header>
          <div className={styles.studyContents}>{module.contents.map((content, contentIndex) => <ContentRow key={content.id} journeyId={journey.id} content={content} isLast={contentIndex === module.contents.length - 1} preview={teacherPreview} />)}</div>
        </div>
      </section>;
    })}</div>
  </div>;
}
