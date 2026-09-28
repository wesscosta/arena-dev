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

function ContentRow({ journeyId, content, preview = false }: { journeyId: string; content: JourneyContentView; preview?: boolean }) {
  const stateLabel = preview ? "Disponível" : content.state === "COMPLETED" ? "Concluído" : content.state === "CURRENT" ? "Em andamento" : "Bloqueado";
  const marker = preview ? "○" : content.state === "COMPLETED" ? "✓" : content.state === "CURRENT" ? "▶" : "•";
  const body = <>
    <span className={`${styles.studyMarker} ${styles[`studyMarker${content.state}`]}`} aria-hidden="true">{marker}</span>
    <span className={styles.studyContentText}><strong>{content.title}</strong>{content.description && <span>{content.description}</span>}{!preview && content.state === "LOCKED" && <small>Conclua o conteúdo anterior para avançar.</small>}</span>
    <span className={`${styles.studyState} ${styles[`studyState${content.state}`]}`}>{stateLabel}</span>
    <span className={styles.studyContinue}>{preview ? "Abrir" : content.state === "CURRENT" ? "Continuar" : content.state === "COMPLETED" ? "Revisar" : ""} {!(!preview && content.state === "LOCKED") && <span aria-hidden="true">→</span>}</span>
  </>;
  return !preview && content.state === "LOCKED"
    ? <div className={`${styles.studyContentRow} ${styles.studyContentLocked}`} aria-disabled="true">{body}</div>
    : <Link className={`${styles.studyContentRow} ${!preview && content.state === "CURRENT" ? styles.studyContentCurrent : ""}`} href={`/learn/journeys/${journeyId}/content/${content.id}${preview ? "?preview=teacher" : ""}`}>{body}</Link>;
}

function currentContent(journey: JourneyStudyView) {
  for (const module of journey.modules) {
    const content = module.contents.find((item) => item.state === "CURRENT");
    if (content) return { moduleTitle: module.title, content };
  }
  return null;
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

  const current = !teacherPreview ? currentContent(journey) : null;
  return <div className={styles.studyView}>
    {teacherPreview && <div className={styles.teacherPreviewBar}><span><strong>ⓘ Prévia do professor</strong><span className={styles.previewDetail}> · sem registrar progresso</span></span><a href={`/?journey=${journeyId}`}>Editar jornada</a></div>}
    <Link href={teacherPreview ? "/" : "/learn/journeys"} className={styles.studyBack}>← {teacherPreview ? "Voltar para Jornadas" : "Minhas jornadas"}</Link>
    <header className={styles.studyHeader}>
      <div><p className={styles.eyebrow}>Jornada de estudo</p><h1 className={styles.studyTitle}>{journey.title}</h1>{journey.description && <p className={styles.studyLead}>{journey.description}</p>}</div>
      {!teacherPreview && <div className={styles.studyProgressNumber}><strong>{journey.progress.percent}%</strong><span>concluído</span></div>}
    </header>
    {!teacherPreview && <><div className={styles.studyProgressTrack} aria-label={`${journey.progress.percent}% concluído`}><span style={{ width: `${journey.progress.percent}%` }} /></div>
    <div className={styles.studyProgressMeta}><span>{journey.progress.completedContents} de {journey.progress.totalContents} conteúdos concluídos</span><span>{journey.progress.percent}%</span></div>
    {current && <Link className={styles.studyResume} href={`/learn/journeys/${journey.id}/content/${current.content.id}`}><span className={styles.resumeIcon}>▶</span><span><small>CONTINUE DE ONDE PAROU · {current.moduleTitle}</small><strong>{current.content.title}</strong>{current.content.description && <em>{current.content.description}</em>}</span><b>Continuar →</b></Link>}
    {journey.progress.totalContents > 0 && journey.progress.percent === 100 && <div className={styles.studyComplete}><span>✓</span><div><small>JORNADA CONCLUÍDA</small><strong>Você concluiu todos os conteúdos.</strong></div></div>}</>}

    <div className={styles.studyModules}>{journey.modules.map((module, moduleIndex) => {
      const progress = moduleProgress(module.contents);
      const done = !teacherPreview && progress.total > 0 && progress.completed === progress.total;
      return <section className={styles.studyModule} key={module.id || `module-${moduleIndex}`} aria-labelledby={`module-${moduleIndex}`}>
        <div className={`${styles.studyModuleIndex} ${done ? styles.studyModuleIndexDone : ""}`}>{done ? "✓" : String(moduleIndex + 1).padStart(2, "0")}</div>
        <div className={styles.studyModuleBody}>
          <header className={styles.studyModuleHeader}><div><div className={styles.studyModuleTitleLine}><h2 id={`module-${moduleIndex}`}>{module.title}</h2>{done && <span className={styles.studyModuleDone}>Concluído</span>}</div>{module.description && <p>{module.description}</p>}</div><span className={styles.studyModuleCount}>{teacherPreview ? `${progress.total} conteúdos` : `${progress.completed}/${progress.total}`}</span></header>
          <div className={styles.studyContents}>{module.contents.map((content, contentIndex) => <ContentRow key={content.id} journeyId={journey.id} content={content} preview={teacherPreview} />)}</div>
        </div>
      </section>;
    })}</div>
  </div>;
}
