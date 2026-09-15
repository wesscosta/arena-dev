"use client";

import { useEffect, useState } from "react";
import {
  fetchActivityRubric,
  fetchStructuredAssessment,
  gradeStructuredAssessment,
  replaceActivityRubric,
  scoreAssessmentCriterion,
  type StructuredAssessment,
} from "@/lib/assessment-rubric-api";
import styles from "./AssessmentRubricPanel.module.css";
import AiAssessmentAssistantPanel from "@/components/AiAssessmentAssistantPanel";

type DraftCriterion = { title: string; description: string; maxPoints: string };

export default function AssessmentRubricPanel({
  activityId,
  submissionId,
  onGraded,
}: {
  activityId: string;
  submissionId: string;
  onGraded: () => Promise<void> | void;
}) {
  const [assessment, setAssessment] = useState<StructuredAssessment | null>(null);
  const [rubricExists, setRubricExists] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftCriterion[]>([
    { title: "Critério 1", description: "", maxPoints: "10" },
  ]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true); setError("");
    try {
      const rubric = await fetchActivityRubric(activityId);
      setRubricExists(rubric.criteria.length > 0);
      if (rubric.criteria.length > 0) {
        setDraft(rubric.criteria.map((item) => ({
          title: item.title,
          description: item.description ?? "",
          maxPoints: String(item.maxPoints),
        })));
      }
      const next = await fetchStructuredAssessment(activityId, submissionId);
      setAssessment(next);
      setScores(Object.fromEntries(next.criteria.map((item) => [item.id, item.awardedPoints == null ? "" : String(item.awardedPoints)])));
      setComments(Object.fromEntries(next.criteria.map((item) => [item.id, item.teacherComment ?? ""])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar a avaliação.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [activityId, submissionId]);

  async function saveRubric() {
    const criteria = draft.map((item) => ({
      title: item.title.trim(),
      description: item.description.trim() || null,
      maxPoints: Number(item.maxPoints),
    }));
    if (criteria.some((item) => !item.title || !Number.isFinite(item.maxPoints) || item.maxPoints <= 0)) {
      setError("Revise os títulos e as pontuações máximas da rubrica.");
      return;
    }
    setBusy(true); setError("");
    try {
      await replaceActivityRubric(activityId, criteria);
      setEditing(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a rubrica.");
    } finally { setBusy(false); }
  }

  async function saveScore(criterionId: string, maxPoints: number) {
    const value = Number(scores[criterionId]);
    if (!Number.isFinite(value) || value < 0 || value > maxPoints) {
      setError(`A pontuação deve ficar entre 0 e ${maxPoints}.`);
      return;
    }
    setBusy(true); setError("");
    try {
      const next = await scoreAssessmentCriterion(
        activityId,
        submissionId,
        criterionId,
        value,
        comments[criterionId] ?? "",
      );
      setAssessment(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o critério.");
    } finally { setBusy(false); }
  }

  async function grade() {
    if (!assessment?.complete) return;
    setBusy(true); setError("");
    try {
      const next = await gradeStructuredAssessment(activityId, submissionId);
      setAssessment(next);
      await onGraded();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir a correção.");
    } finally { setBusy(false); }
  }

  return <section className={styles.shell}>
    <div className={styles.head}>
      <div><span className="eyebrow accent">RUBRICA</span><h3>Avaliação estruturada</h3><p>Nota pedagógica separada de XP. Cada critério fica auditável na entrega.</p></div>
      <div className={styles.total}>{assessment ? `${assessment.awardedPoints} / ${assessment.maxPoints}` : "—"}</div>
    </div>

    {error && <div className={styles.error} role="alert">{error}</div>}

    {assessment && assessment.criteria.length > 0 && <AiAssessmentAssistantPanel activityId={activityId} submissionId={submissionId} disabled={assessment.submissionStatus === "GRADED" || assessment.submissionStatus === "RETURNED"} onApplied={load} />}

    {(!rubricExists || editing) && (!assessment || assessment.criteria.length === 0) ? <div className={styles.editor}>
      <div className={styles.hint}>Defina a rubrica antes de pontuar esta entrega. Ela será copiada como snapshot para a avaliação.</div>
      {draft.map((item, index) => <div className={styles.editorRow} key={index}>
        <input aria-label={`Título do critério ${index + 1}`} value={item.title} onChange={(e) => setDraft((current) => current.map((row, i) => i === index ? { ...row, title: e.target.value } : row))} placeholder="Ex.: Modelagem correta" />
        <input aria-label={`Pontuação máxima do critério ${index + 1}`} type="number" min="0.01" step="0.5" value={item.maxPoints} onChange={(e) => setDraft((current) => current.map((row, i) => i === index ? { ...row, maxPoints: e.target.value } : row))} />
        <button type="button" className={`${styles.button} ${styles.danger}`} disabled={draft.length === 1} onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}>Remover</button>
        <textarea value={item.description} onChange={(e) => setDraft((current) => current.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} placeholder="Descrição do que será observado" />
      </div>)}
      <div className={styles.editorActions}>
        <button type="button" className={styles.button} onClick={() => setDraft((current) => [...current, { title: `Critério ${current.length + 1}`, description: "", maxPoints: "10" }])}>+ Critério</button>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void saveRubric()}>{busy ? "Salvando..." : "Salvar rubrica"}</button>
      </div>
    </div> : null}

    {assessment && assessment.criteria.length > 0 && <div className={styles.criteria}>
      {assessment.criteria.map((criterion) => <div className={styles.criterion} key={criterion.id}>
        <div className={styles.criterionHead}><div><strong>{criterion.title}</strong>{criterion.description && <div className={styles.hint}>{criterion.description}</div>}</div><small>máx. {criterion.maxPoints}</small></div>
        <div className={styles.scoreRow}>
          <label><span className={styles.hint}>Pontuação</span><input type="number" min="0" max={criterion.maxPoints} step="0.5" value={scores[criterion.id] ?? ""} disabled={busy || assessment.submissionStatus === "GRADED" || assessment.submissionStatus === "RETURNED"} onChange={(e) => setScores((current) => ({ ...current, [criterion.id]: e.target.value }))} onBlur={() => void saveScore(criterion.id, criterion.maxPoints)} /></label>
          <label><span className={styles.hint}>Observação do critério</span><textarea value={comments[criterion.id] ?? ""} disabled={busy || assessment.submissionStatus === "GRADED" || assessment.submissionStatus === "RETURNED"} onChange={(e) => setComments((current) => ({ ...current, [criterion.id]: e.target.value }))} onBlur={() => scores[criterion.id] !== "" && void saveScore(criterion.id, criterion.maxPoints)} /></label>
        </div>
      </div>)}
    </div>}

    {assessment?.criteria.length === 0 && rubricExists && <button type="button" className={styles.button} disabled={busy} onClick={() => void load()}>Carregar rubrica nesta avaliação</button>}

    {assessment && assessment.criteria.length > 0 && assessment.submissionStatus !== "GRADED" && assessment.submissionStatus !== "RETURNED" && <div className={styles.editorActions}>
      <span className={styles.hint}>{assessment.complete ? "Todos os critérios foram pontuados." : "Pontue todos os critérios para concluir."}</span>
      <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy || !assessment.complete} onClick={() => void grade()}>{busy ? "Concluindo..." : "Concluir correção"}</button>
    </div>}

    {assessment?.submissionStatus === "GRADED" && <div className={styles.hint}><strong>Correção concluída.</strong> Esta nota continua separada do XP.</div>}
  </section>;
}
