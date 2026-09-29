"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchStudyJourney, fetchTeacherStudyPreview, studyDeviceClaims, type JourneyContentView, type JourneyStudyView } from "@/lib/study-api";
import styles from "../../study.module.css";
import { studyExcerpt } from "@/lib/study-excerpt";

function moduleProgress(contents: JourneyContentView[]) {
  const completed = contents.filter((content) => content.state === "COMPLETED").length;
  return { completed, total: contents.length };
}

function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7.5"/></svg>; }
function CurrentIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7.5 16 12l-7 4.5z"/></svg>; }
function ChevronIcon({ collapsed }: { collapsed: boolean }) { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={collapsed ? "m7 9 5 5 5-5" : "m7 15 5-5 5 5"}/></svg>; }
function PendingIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/></svg>; }
function ReviewIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.4-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.4 5.5-9.2 5.5S2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>; }

function ContentRow({ journeyId, content, preview = false }: { journeyId: string; content: JourneyContentView; preview?: boolean }) {
  const stateLabel = preview ? "Disponível" : content.state === "COMPLETED" ? "Concluído" : content.state === "CURRENT" ? "Em andamento" : "Bloqueado";
  const marker = preview ? <PendingIcon /> : content.state === "COMPLETED" ? <CheckIcon /> : content.state === "CURRENT" ? <CurrentIcon /> : <PendingIcon />;
  const body = <>
    <span className={`${styles.studyMarker} ${styles[`studyMarker${content.state}`]}`} aria-hidden="true">{marker}</span>
    <span className={styles.studyContentText}><strong>{content.title}</strong>{studyExcerpt(content.description) && <span>{studyExcerpt(content.description)}</span>}{!preview && content.state === "LOCKED" && <small>Conclua o conteúdo anterior para avançar.</small>}</span>
    {content.state === "LOCKED" && <span className={`${styles.studyState} ${styles.studyStateLOCKED}`}>{stateLabel}</span>}
    <span className={`${styles.studyContinue} ${content.state === "COMPLETED" && !preview ? styles.studyReviewIcon : ""}`} aria-label={content.state === "COMPLETED" && !preview ? `Revisar ${content.title}` : undefined} title={content.state === "COMPLETED" && !preview ? "Revisar" : undefined}>{preview ? "Abrir" : content.state === "CURRENT" ? "Continuar" : content.state === "COMPLETED" ? <ReviewIcon /> : ""}</span>
  </>;
  return !preview && content.state === "LOCKED"
    ? <div className={`${styles.studyContentRow} ${styles.studyContentLocked}`} aria-disabled="true">{body}</div>
    : <Link className={`${styles.studyContentRow} ${!preview && content.state === "CURRENT" ? styles.studyContentCurrent : ""}`} href={`/learn/journeys/${journeyId}/content/${content.id}${preview ? "?preview=teacher" : ""}`}>{body}</Link>;
}

function learnerJourneyDescription(description: string | null | undefined) {
  if (!description) return "";
  const normalized = description.trim().toLowerCase();
  const technicalDescriptions = [
    "estrutura preservada a partir do markdown fornecido.",
    "estrutura preservada a partir do texto fornecido.",
    "estrutura preservada a partir do notion fornecido.",
  ];
  return technicalDescriptions.includes(normalized) ? "" : description.trim();
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
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [collapseInitialized, setCollapseInitialized] = useState(false);
  useEffect(() => { let active = true; (async () => {
    if (teacherPreview) {
      try { const data = await fetchTeacherStudyPreview(journeyId); if (active) setJourney(data); }
      catch { if (active) setError("Não foi possível abrir a prévia desta jornada."); }
      return;
    }
    for (const claim of studyDeviceClaims()) { try { const data = await fetchStudyJourney(journeyId, claim.token); if (active) setJourney(data); return; } catch {} }
    if (active) setError("Não foi possível abrir esta jornada.");
  })(); return () => { active = false; }; }, [journeyId, teacherPreview]);
  useEffect(() => {
    if (!journey || collapseInitialized || teacherPreview) return;
    const completed = journey.modules
      .filter((module) => module.contents.length > 0 && module.contents.every((content) => content.state === "COMPLETED"))
      .map((module, index) => module.id || `module-${index}`);
    setCollapsedModules(new Set(completed));
    setCollapseInitialized(true);
  }, [journey, collapseInitialized, teacherPreview]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!journey) return <div className={styles.empty}>Carregando jornada…</div>;

  function toggleModule(key: string) {
    setCollapsedModules((currentSet) => {
      const next = new Set(currentSet);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function collapseAllModules(moduleKeys: string[]) {
    setCollapsedModules(new Set(moduleKeys));
  }
  function expandAllModules() {
    setCollapsedModules(new Set());
  }

  const current = !teacherPreview ? currentContent(journey) : null;
  return <div className={styles.studyView}>
    {teacherPreview && <div className={styles.teacherPreviewBar}><span><strong>ⓘ Prévia do professor</strong><span className={styles.previewDetail}> · sem registrar progresso</span></span><a href={`/?journey=${journeyId}`}>Editar jornada</a></div>}
    {teacherPreview && <Link href="/" className={styles.studyBack}>← Voltar para Jornadas</Link>}
    <header className={styles.studyHeader}>
      <div><p className={styles.eyebrow}>Jornada de estudo</p><h1 className={styles.studyTitle}>{journey.title}</h1>{learnerJourneyDescription(journey.description) && <p className={styles.studyLead}>{learnerJourneyDescription(journey.description)}</p>}</div>
      {!teacherPreview && <div className={styles.studyProgressNumber}><strong>{journey.progress.percent}%</strong><span>concluído</span></div>}
    </header>
    {!teacherPreview && <><div className={styles.studyProgressTrack} aria-label={`${journey.progress.percent}% concluído`}><span style={{ width: `${journey.progress.percent}%` }} /></div>
    <div className={styles.studyProgressMeta}><span>{journey.progress.completedContents} de {journey.progress.totalContents} conteúdos concluídos</span><span>{journey.progress.percent}%</span></div>
    {current && <Link className={styles.studyResume} href={`/learn/journeys/${journey.id}/content/${current.content.id}`}><span className={styles.resumeIcon}><CurrentIcon /></span><span><small>CONTINUE DE ONDE PAROU · {current.moduleTitle}</small><strong>{current.content.title}</strong>{studyExcerpt(current.content.description) && <em>{studyExcerpt(current.content.description)}</em>}</span><b>Continuar</b></Link>}
    {journey.progress.totalContents > 0 && journey.progress.percent === 100 && <div className={styles.studyComplete}><span><CheckIcon /></span><div><small>JORNADA CONCLUÍDA</small><strong>Você concluiu todos os conteúdos.</strong></div></div>}</>}

    <div className={styles.studyModulesToolbar}>
      <span>{journey.modules.length} capítulos</span>
      <div><button type="button" onClick={() => collapseAllModules(journey.modules.map((module, index) => module.id || `module-${index}`))}>Recolher tudo</button><button type="button" onClick={expandAllModules}>Expandir tudo</button></div>
    </div>
    <div className={styles.studyModules}>{journey.modules.map((module, moduleIndex) => {
      const progress = moduleProgress(module.contents);
      const done = !teacherPreview && progress.total > 0 && progress.completed === progress.total;
      const moduleKey = module.id || `module-${moduleIndex}`;
      const collapsed = collapsedModules.has(moduleKey);
      const hasCurrent = !teacherPreview && module.contents.some((content) => content.state === "CURRENT");
      return <section className={`${styles.studyModule} ${collapsed ? styles.studyModuleCollapsed : ""} ${hasCurrent ? styles.studyModuleActive : ""}`} key={moduleKey} aria-labelledby={`module-${moduleIndex}`}>
        <div className={`${styles.studyModuleIndex} ${done ? styles.studyModuleIndexDone : ""} ${hasCurrent ? styles.studyModuleIndexCurrent : ""}`}>{done ? <CheckIcon /> : hasCurrent ? <CurrentIcon /> : <span>{String(moduleIndex + 1).padStart(2, "0")}</span>}</div>
        <div className={styles.studyModuleBody}>
          <header className={styles.studyModuleHeader}>
            <button type="button" className={styles.studyModuleToggle} onClick={() => toggleModule(moduleKey)} aria-expanded={!collapsed} aria-controls={`module-contents-${moduleIndex}`}>
              <span className={styles.studyModuleHeading}><h2 id={`module-${moduleIndex}`}>{module.title}</h2>{module.description && <p>{module.description}</p>}</span>
              <span className={styles.studyModuleMeta}><span className={styles.studyModuleCount}>{teacherPreview ? `${progress.total} conteúdos` : `${progress.completed}/${progress.total}`}</span><span className={styles.studyModuleChevron} aria-hidden="true"><ChevronIcon collapsed={collapsed} /></span></span>
            </button>
          </header>
          {!collapsed && <div className={styles.studyContents} id={`module-contents-${moduleIndex}`}>{module.contents.map((content) => <ContentRow key={content.id} journeyId={journey.id} content={content} preview={teacherPreview} />)}</div>}
        </div>
      </section>;
    })}</div>
  </div>;
}
