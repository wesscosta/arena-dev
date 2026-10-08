"use client";

import { useEffect, useMemo, useState } from "react";
import { repeatLearningCheck, type LearningCheckState } from "@/lib/learning-check-api";
import {
  fetchLearningCycles,
  diagnoseLearningCycle,
  interveneLearningCycle,
  verifyLearningCycle,
  compareLearningCycle,
  type LearningCycleView,
  type LearningCycleComparison,
} from "@/lib/learning-cycle-api";
import styles from "./LearningCyclePanel.module.css";

type Props = {
  sessionId: string;
  state: LearningCheckState;
  onStateChange: (state: LearningCheckState) => void;
  notify: (message: string) => void;
  onOpenGroups: () => void;
};

export default function LearningCyclePanel({
  sessionId,
  state,
  onStateChange,
  notify,
  onOpenGroups,
}: Props) {
  const [cycles, setCycles] = useState<LearningCycleView[]>([]);
  const [note, setNote] = useState("");
  const [comparison, setComparison] = useState<LearningCycleComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = state.run;
  const runId = run?.id;
  const targetId = state.definition?.learningTargetId;

  useEffect(() => {
    let active = true;
    setError(null);
    void fetchLearningCycles(sessionId)
      .then((rows) => {
        if (active) setCycles(rows);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Falha ao buscar o ciclo.");
      });
    return () => {
      active = false;
    };
  }, [sessionId, runId, run?.status]);

  const current = useMemo(
    () =>
      cycles.find((cycle) => cycle.baselineRunId === runId || cycle.followupRunId === runId) ??
      cycles.find((cycle) => cycle.status === "INTERVENED" && cycle.learningTargetId === targetId),
    [cycles, runId, targetId],
  );

  useEffect(() => {
    let active = true;
    setComparison(null);
    if (current?.status !== "VERIFIED") return;
    void compareLearningCycle(sessionId, current.id)
      .then((result) => {
        if (active) setComparison(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Falha na comparação.");
      });
    return () => {
      active = false;
    };
  }, [sessionId, current?.id, current?.status]);

  async function action(
    task: () => Promise<LearningCycleView | LearningCheckState>,
    message: string,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await task();
      if ("baselineRunId" in result) {
        setCycles((items) => [result, ...items.filter((item) => item.id !== result.id)]);
      } else onStateChange(result);
      notify(message);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Ação indisponível.";
      setError(message);
      notify(message);
    } finally {
      setBusy(false);
    }
  }

  if (!run || !targetId) return null;
  const firstRun = current?.baselineRunId === run.id;
  const canCompare = current?.status === "INTERVENED" && !firstRun && run.status === "CLOSED";
  return (
    <section className={styles.panel} aria-label="Antes e Depois da aprendizagem">
      <header>
        <strong>Antes e Depois</strong>
        <p>Registre a intervenção e compare duas verificações da mesma questão.</p>
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {!current && run.status === "CLOSED" && state.evidenceCount > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void action(() => diagnoseLearningCycle(sessionId, run.id), "Diagnóstico registrado.")
          }
        >
          Iniciar ciclo com esta verificação
        </button>
      )}
      {!current && run.status !== "CLOSED" && <p>Encerre a primeira verificação para começar.</p>}
      {current?.status === "DIAGNOSED" && (
        <div className={styles.intervention}>
          <label>
            Intervenção docente
            <textarea
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: discussão em pares, exemplos e explicação de alternativas"
            />
          </label>
          <div className={styles.actions}>
            <button type="button" disabled={busy} onClick={onOpenGroups}>
              Formar grupos
            </button>
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() =>
                void action(
                  () => interveneLearningCycle(sessionId, current.id, note),
                  "Intervenção registrada; nova verificação disponível.",
                )
              }
            >
              Registrar intervenção
            </button>
          </div>
        </div>
      )}
      {current?.status === "INTERVENED" && (
        <div className={styles.actions}>
          {firstRun && run.status === "CLOSED" && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void action(
                  () => repeatLearningCheck(sessionId, run.id),
                  "Nova verificação aberta; encerre depois das respostas.",
                )
              }
            >
              Verificar novamente
            </button>
          )}
          {canCompare && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void action(
                  () => verifyLearningCycle(sessionId, current.id, run.id),
                  "Nova verificação vinculada ao diagnóstico.",
                )
              }
            >
              Comparar com o diagnóstico
            </button>
          )}
          {!firstRun && !canCompare && <p>Encerre a segunda aplicação antes de comparar.</p>}
        </div>
      )}
      {comparison && (
        <div className={styles.compare}>
          <div>
            <strong>{comparison.baseline.responses}</strong>
            <span>Antes</span>
          </div>
          <div>
            <strong>{comparison.followup.responses}</strong>
            <span>Depois</span>
          </div>
          <div>
            <strong>{comparison.paired}</strong>
            <span>Comparáveis</span>
          </div>
          <div>
            <strong>{comparison.transitions.incorrectToCorrect}</strong>
            <span>Passaram de erro a acerto</span>
          </div>
          <div>
            <strong>{comparison.transitions.correctToIncorrect}</strong>
            <span>Passaram de acerto a erro</span>
          </div>
          <p className={styles.note}>
            {comparison.disclaimer} Exclusivos do primeiro momento: {comparison.baselineOnly}; do
            segundo: {comparison.followupOnly}.
          </p>
        </div>
      )}
    </section>
  );
}
