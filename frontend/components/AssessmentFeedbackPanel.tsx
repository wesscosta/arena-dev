"use client";

import { useEffect, useState } from "react";
import {
  fetchAssessmentFeedback,
  publishAssessmentFeedback,
  saveAssessmentFeedbackDraft,
  useLatestAiFeedback,
  type AssessmentFeedback,
} from "@/lib/assessment-feedback-api";
import styles from "./AssessmentFeedbackPanel.module.css";

export default function AssessmentFeedbackPanel({ activityId, submissionId }: { activityId: string; submissionId: string }) {
  const [feedback, setFeedback] = useState<AssessmentFeedback | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true); setError("");
    try {
      const next = await fetchAssessmentFeedback(activityId, submissionId);
      setFeedback(next); setDraft(next.feedbackDraft ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar o feedback.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, [activityId, submissionId]);

  async function saveDraft() {
    setBusy(true); setError("");
    try {
      const next = await saveAssessmentFeedbackDraft(activityId, submissionId, draft);
      setFeedback(next); setDraft(next.feedbackDraft ?? "");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar o feedback."); }
    finally { setBusy(false); }
  }

  async function fromAi() {
    setBusy(true); setError("");
    try {
      const next = await useLatestAiFeedback(activityId, submissionId);
      setFeedback(next); setDraft(next.feedbackDraft ?? "");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Nenhuma sugestão textual de IA disponível."); }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!window.confirm("Publicar este feedback para o aluno? O texto publicado ficará visível na atividade.")) return;
    setBusy(true); setError("");
    try {
      await saveAssessmentFeedbackDraft(activityId, submissionId, draft);
      const next = await publishAssessmentFeedback(activityId, submissionId);
      setFeedback(next); setDraft(next.feedbackDraft ?? "");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível publicar o feedback."); }
    finally { setBusy(false); }
  }

  const canPublish = feedback?.submissionStatus === "GRADED" || feedback?.submissionStatus === "RETURNED";

  return <section className={styles.shell} aria-label="Feedback individual">
    <div className={styles.head}><div><span className={styles.badge}>FEEDBACK AO ALUNO</span><h4>Devolutiva individual</h4><p>Rascunho supervisionado. Só fica visível para o aluno depois de publicação explícita.</p></div></div>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <textarea className={styles.textarea} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva o feedback final que o aluno deverá receber..." disabled={busy} />
    <div className={styles.actions}>
      <button type="button" className={styles.button} disabled={busy} onClick={() => void fromAi()}>Usar sugestão da IA</button>
      <button type="button" className={styles.button} disabled={busy} onClick={() => void saveDraft()}>{busy ? "Salvando..." : "Salvar rascunho"}</button>
      <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy || !draft.trim() || !canPublish} onClick={() => void publish()}>Publicar para o aluno</button>
    </div>
    {!canPublish && <div className={styles.notice}>Conclua a correção estruturada antes de publicar a devolutiva.</div>}
    {feedback?.publishedFeedback && <div className={styles.published}><strong>Feedback publicado</strong><p>{feedback.publishedFeedback}</p><small>{feedback.publishedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(feedback.publishedAt)) : ""}</small></div>}
  </section>;
}
