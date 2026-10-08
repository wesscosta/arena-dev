"use client";

import { useEffect, useState } from "react";
import { annotateErrorClinic, fetchErrorClinic, type ErrorClinicView } from "@/lib/learning-error-clinic-api";
import styles from "./LearningErrorClinicPanel.module.css";

type Props = {
  sessionId: string;
  runId: string;
  notify: (message: string) => void;
};

export default function LearningErrorClinicPanel({ sessionId, runId, notify }: Props) {
  const [clinic, setClinic] = useState<ErrorClinicView | null>(null);
  const [option, setOption] = useState("");
  const [note, setNote] = useState("");
  const [commandId, setCommandId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setClinic(null);
    setOption("");
    setNote("");
    setCommandId(crypto.randomUUID());
    setError(null);
    void fetchErrorClinic(sessionId, runId)
      .then((next) => { if (active) setClinic(next); })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível consultar as respostas.");
      });
    return () => { active = false; };
  }, [sessionId, runId]);

  async function save() {
    if (!option || !note.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await annotateErrorClinic(sessionId, runId, commandId, option, note.trim());
      setClinic(next);
      setNote("");
      setCommandId(crypto.randomUUID());
      notify("Análise docente registrada. O histórico anterior foi preservado.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível registrar a análise.";
      setError(message);
      notify(message);
    } finally { setBusy(false); }
  }

  return (
    <section className={styles.shell} aria-label="Clínica do Erro">
      <details>
        <summary>Clínica do Erro <span>· análise docente de alternativas</span></summary>
        <div className={styles.body}>
          <p>Observe as alternativas escolhidas e registre uma hipótese ou explicação. O sistema não identifica automaticamente por que um estudante errou.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!clinic && !error && <p role="status">Carregando distribuição de respostas…</p>}
          {clinic && (
            <>
              <p className={styles.meta}>{clinic.responseCount} resposta(s) neste instrumento. Selecione uma alternativa incorreta que tenha sido escolhida.</p>
              <fieldset className={styles.options}>
                <legend>Alternativas observadas</legend>
                {clinic.options.map((item) => (
                  <label key={item.key} className={styles.option}>
                    <input type="radio" name={`clinic-${runId}`} value={item.key}
                      checked={option === item.key} disabled={!item.incorrect || item.count === 0 || busy}
                      onChange={() => setOption(item.key)} />
                    <strong>{item.key.toUpperCase()}</strong>
                    <span>{item.label}</span>
                    <small>{item.count} resposta(s){!item.incorrect ? " · correta" : ""}</small>
                  </label>
                ))}
              </fieldset>
              {clinic.options.some((item) => item.incorrect && item.count > 0) ? (
                <div className={styles.compose}>
                  <label htmlFor={`clinic-note-${runId}`}>Interpretação ou orientação do professor</label>
                  <textarea id={`clinic-note-${runId}`} rows={3} maxLength={1200}
                    disabled={!option || busy} value={note} onChange={(event) => setNote(event.target.value)}
                    placeholder="Ex.: a alternativa confunde a ordenação com o filtro; retomar um exemplo contrastivo." />
                  <button type="button" disabled={!option || !note.trim() || busy} onClick={() => void save()}>
                    {busy ? "Registrando…" : "Registrar análise"}
                  </button>
                </div>
              ) : <p>Nenhuma alternativa incorreta recebeu respostas nesta verificação.</p>}
              {clinic.notes.length > 0 && (
                <div className={styles.history}>
                  <strong>Histórico docente ({clinic.notes.length})</strong>
                  {clinic.notes.map((entry) => (
                    <p key={entry.id}><b>Alternativa {entry.optionKey.toUpperCase()}:</b> {entry.note}</p>
                  ))}
                </div>
              )}
              <p className={styles.meta}>{clinic.disclaimer} Para revisar o conteúdo, utilize o roteiro ou reaplique a questão; nenhuma etapa avança automaticamente.</p>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
