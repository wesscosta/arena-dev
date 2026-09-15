"use client";

import { useEffect, useState } from "react";
import {
  applyAiAssessmentSuggestion,
  fetchLatestAiAssessmentSuggestion,
  generateAiAssessmentSuggestion,
  type AiAssessmentSuggestion,
} from "@/lib/assessment-ai-api";
import styles from "./AiAssessmentAssistantPanel.module.css";

export default function AiAssessmentAssistantPanel({
  activityId,
  submissionId,
  disabled,
  onApplied,
}: {
  activityId: string;
  submissionId: string;
  disabled: boolean;
  onApplied: () => Promise<void> | void;
}) {
  const [suggestion, setSuggestion] = useState<AiAssessmentSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadLatest() {
    try {
      setSuggestion(await fetchLatestAiAssessmentSuggestion(activityId, submissionId));
    } catch {
      // A ausência de histórico de IA não bloqueia a correção manual.
    }
  }

  useEffect(() => { void loadLatest(); }, [activityId, submissionId]);

  async function generate() {
    if (disabled || busy) return;
    setBusy(true); setError("");
    try {
      setSuggestion(await generateAiAssessmentSuggestion(activityId, submissionId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar a sugestão.");
    } finally { setBusy(false); }
  }

  async function apply() {
    if (!suggestion || disabled || busy) return;
    setBusy(true); setError("");
    try {
      await applyAiAssessmentSuggestion(activityId, submissionId, suggestion.suggestionId);
      await onApplied();
      await loadLatest();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível aplicar a sugestão.");
    } finally { setBusy(false); }
  }

  return <section className={styles.shell} aria-label="Correção assistida por IA">
    <div className={styles.head}>
      <div><span className={styles.badge}>RASCUNHO DA IA</span><h4>Correção assistida</h4><p>A IA sugere pontuação e justificativa. O professor continua responsável por revisar, editar e concluir.</p></div>
      <div className={styles.actions}>
        <button type="button" className={styles.button} disabled={disabled || busy} onClick={() => void generate()}>{busy ? "Analisando..." : suggestion ? "Reanalisar" : "Gerar sugestão"}</button>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={disabled || busy || !suggestion || suggestion.fullyApplied} onClick={() => void apply()}>{suggestion?.fullyApplied ? "Sugestão aplicada" : "Aplicar à rubrica"}</button>
      </div>
    </div>

    {error && <div className={styles.error} role="alert">{error}</div>}

    {suggestion && <>
      <div className={styles.meta}>{suggestion.provider} · {suggestion.model} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(suggestion.createdAt))}</div>
      {suggestion.summaryFeedback && <div className={styles.summary}>{suggestion.summaryFeedback}</div>}
      <div className={styles.criteria}>
        {suggestion.criteria.map((criterion) => <article className={styles.criterion} key={criterion.criterionId}>
          <div className={styles.criterionHead}><strong>{criterion.title}</strong><span><b>{criterion.suggestedPoints}</b> / {criterion.maxPoints ?? "—"}</span></div>
          {criterion.suggestedComment && <div className={styles.comment}>{criterion.suggestedComment}</div>}
          {criterion.evidence && <div className={styles.evidence}><strong>Evidência:</strong> {criterion.evidence}</div>}
          <div className={styles.meta}>{criterion.confidence == null ? "Confiança não informada" : `Confiança ${(criterion.confidence * 100).toFixed(0)}%`}</div>
          {criterion.applied && <span className={styles.applied}>Aplicado ao rascunho do professor</span>}
        </article>)}
      </div>
    </>}

    {!suggestion && !error && <div className={styles.notice}>Nenhuma análise de IA foi gerada para esta entrega. A correção manual continua disponível normalmente.</div>}
    <div className={styles.notice}>Nada é publicado ao aluno e nenhuma nota é concluída automaticamente nesta etapa.</div>
  </section>;
}
