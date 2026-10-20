"use client";

import { useEffect, useMemo, useState } from "react";
import { repeatLearningCheck, type LearningCheckState } from "@/lib/learning-check-api";
import { fetchConfidenceSummary, type ConfidenceSummary } from "@/lib/learner-confidence-api";
import LearningRecoveryPanel from "./LearningRecoveryPanel";
import {
  fetchLearningCycles,
  diagnoseLearningCycle,
  interveneLearningCycle,
  verifyLearningCycle,
  compareLearningCycle,
  type LearningCycleView,
  type LearningCycleComparison,
  type InterventionType,
} from "@/lib/learning-cycle-api";
import styles from "./LearningCyclePanel.module.css";
import type { Notify } from "@/components/ui";

type Props = {
  sessionId: string;
  state: LearningCheckState;
  onStateChange: (state: LearningCheckState) => void;
  notify: Notify;
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
  const [strategy, setStrategy] = useState<InterventionType>("EXPLANATION");
  const [comparison, setComparison] = useState<LearningCycleComparison | null>(null);
  const [confidenceSummary, setConfidenceSummary] = useState<ConfidenceSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = state.run;
  const runId = run?.id;
  const targetId = state.definition?.learningTargetId;
  useEffect(() => {
    let active = true;
    setConfidenceSummary(null);
    if (!runId || run?.acceptsResponses || run?.status === "CREATED") return;
    void fetchConfidenceSummary(sessionId, runId)
      .then((value) => { if (active) setConfidenceSummary(value); })
      .catch(() => { if (active) setConfidenceSummary(null); });
    return () => { active = false; };
  }, [sessionId, runId, run?.acceptsResponses, run?.status]);

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
      notify(message, "error");
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
      {!current && run.status !== "CLOSED" && (
        <p>
          Para usar discussão em pares: receba as respostas individuais, bloqueie e encerre sem
          revelar a correção. Só depois organize a discussão e aplique novamente.
        </p>
      )}
      {current?.status === "DIAGNOSED" && (
        <div className={styles.intervention}>
          <fieldset className={styles.strategies}>
            <legend>Estratégia de intervenção</legend>
            <label>
              <input
                type="radio"
                name={`intervention-${current.id}`}
                value="EXPLANATION"
                checked={strategy === "EXPLANATION"}
                onChange={() => setStrategy("EXPLANATION")}
              />
              Explicação ou revisão orientada
            </label>
            <label>
              <input
                type="radio"
                name={`intervention-${current.id}`}
                value="PEER_DISCUSSION"
                checked={strategy === "PEER_DISCUSSION"}
                disabled={current.baselineResultsRevealed || current.baselineResponseCount < 2}
                onChange={() => setStrategy("PEER_DISCUSSION")}
              />
              Discussão em pares (Peer Instruction)
            </label>
          </fieldset>
          {current.baselineResultsRevealed && (
            <p className={styles.guidance}>
              A correção já foi revelada nesta primeira aplicação. Para preservar a discussão entre
              pares, a estratégia de Peer Instruction só pode começar com uma questão ainda não
              revelada.
            </p>
          )}
          {current.baselineResponseCount < 2 && (
            <p className={styles.guidance}>
              Foram registradas {current.baselineResponseCount} resposta(s) individuais. Para
              discussão em pares, são necessárias pelo menos duas.
            </p>
          )}
          {strategy === "PEER_DISCUSSION" && !current.baselineResultsRevealed && (
            <p className={styles.guidance}>
              1. A turma já respondeu individualmente. 2. Organize a discussão sem mostrar o
              gabarito. 3. Registre o que foi discutido. 4. Reaplique a mesma questão e compare as
              respostas dos mesmos alunos.
            </p>
          )}
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
                  () => interveneLearningCycle(sessionId, current.id, note, strategy),
                  "Intervenção registrada; a mesma questão pode ser aplicada novamente.",
                )
              }
            >
              Registrar intervenção
            </button>
          </div>
        </div>
      )}
      {(current?.status === "INTERVENED" || current?.status === "VERIFIED") && (
        <p className={styles.guidance}>
          Estratégia registrada:{" "}
          {current.interventionType === "PEER_DISCUSSION"
            ? "discussão em pares"
            : "explicação / revisão"}
          . Respostas individuais permanecem privadas; a comparação é agregada.
        </p>
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
      {confidenceSummary && (
        <section className={styles.guidance} aria-label="Autoconfiança agregada">
          <strong>Autopercepção declarada (opcional)</strong>
          {confidenceSummary.available ? (
            <p>Baixa: {confidenceSummary.counts.LOW ?? 0} · Média: {confidenceSummary.counts.MEDIUM ?? 0} · Alta: {confidenceSummary.counts.HIGH ?? 0} · Não informou: {confidenceSummary.counts.SKIPPED ?? 0}.</p>
          ) : <p>{confidenceSummary.reason}</p>}
          <small>Distribuição agregada apenas com três ou mais declarações e respostas bloqueadas. Nunca representa confiança técnica, nota ou mastery.</small>
        </section>
      )}
      {comparison && (
        <LearningRecoveryPanel sessionId={sessionId}
          targetTitle={state.definition?.learningTargetTitle ?? ""}
          comparison={comparison} notify={notify} />
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
