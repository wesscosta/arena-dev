"use client";

import { useEffect, useState } from "react";
import { fetchSubmissionEvidence, type SubmissionEvidence } from "@/lib/submission-evidence-api";
import styles from "./SubmissionEvidencePanel.module.css";

function durationLabel(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function SubmissionEvidencePanel({
  activityId,
  submissionId,
}: {
  activityId: string;
  submissionId: string;
}) {
  const [evidence, setEvidence] = useState<SubmissionEvidence | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetchSubmissionEvidence(activityId, submissionId)
      .then((result) => { if (active) setEvidence(result); })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar evidências.");
      });
    return () => { active = false; };
  }, [activityId, submissionId]);

  if (error) return <section className={styles.shell}><div>{error}</div></section>;
  if (!evidence) return <section className={styles.shell}><div>Carregando evidências de processo...</div></section>;

  const tone = evidence.recommendation === "HIGH"
    ? styles.high
    : evidence.recommendation === "MEDIUM" ? styles.medium : styles.low;
  const label = evidence.recommendation === "HIGH"
    ? "Revisão prioritária"
    : evidence.recommendation === "MEDIUM" ? "Revisar contexto" : "Sem sinal relevante";

  return <section className={styles.shell} aria-label="Evidências de processo">
    <div className={styles.head}>
      <div>
        <strong>Evidências de processo</strong>
        <p>Sinais operacionais para orientar revisão. Não determinam fraude, autoria ou uso de IA.</p>
      </div>
      <span className={`${styles.badge} ${tone}`}>{label}</span>
    </div>

    <div className={styles.metrics}>
      <div className={styles.metric}><span>Tempo até envio</span><strong>{durationLabel(evidence.durationSeconds)}</strong></div>
      <div className={styles.metric}><span>Salvamentos</span><strong>{evidence.saveCount}</strong></div>
      <div className={styles.metric}><span>Colagens</span><strong>{evidence.pasteCount}</strong></div>
      <div className={styles.metric}><span>Maior similaridade</span><strong>{evidence.highestSimilarity ? `${Math.round(evidence.highestSimilarity.score * 100)}%` : "—"}</strong></div>
    </div>

    {evidence.reasons.length > 0 && <ul className={styles.reasons}>
      {evidence.reasons.map((reason) => <li key={reason}>{reason}</li>)}
    </ul>}

    <div className={styles.note}>
      Similaridade e eventos de processo são indícios de contexto para revisão humana; não são diagnóstico de plágio, fraude ou uso de IA.
    </div>
  </section>;
}
