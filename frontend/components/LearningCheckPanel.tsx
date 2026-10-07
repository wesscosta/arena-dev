"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  closeLearningCheck,
  createLearningTarget,
  fetchLearningTargets,
  lockLearningCheck,
  openLearningCheck,
  prepareLearningCheck,
  revealLearningCheck,
  type LearningCheckState,
  type LearningTarget,
} from "@/lib/learning-check-api";
import styles from "./LearningCheckPanel.module.css";

type Props = {
  sessionId: string;
  state: LearningCheckState;
  onStateChange: (state: LearningCheckState) => void;
  presentCount: number;
  notify: (message: string) => void;
};

type DraftOption = {
  id: string;
  label: string;
};

const OPTION_KEYS = ["a", "b", "c", "d", "e", "f"];

function initialOptions(): DraftOption[] {
  return [
    { id: "initial-a", label: "" },
    { id: "initial-b", label: "" },
    { id: "initial-c", label: "" },
    { id: "initial-d", label: "" },
  ];
}

function statusLabel(state: LearningCheckState) {
  const run = state.run;
  if (!run) return "PREPARAR";
  if (run.status === "CREATED") return "PREPARADA";
  if (run.status === "CLOSED") return "ENCERRADA";
  if (run.resultsVisiblePublicly) return "CORREÇÃO REVELADA";
  if (!run.acceptsResponses) return "RESPOSTAS BLOQUEADAS";
  return "AO VIVO";
}

function percentage(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

export default function LearningCheckPanel({
  sessionId,
  state,
  onStateChange,
  presentCount,
  notify,
}: Props) {
  const [targets, setTargets] = useState<LearningTarget[]>([]);
  const [targetId, setTargetId] = useState("");
  const [targetBusy, setTargetBusy] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<DraftOption[]>(initialOptions);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const notifyRef = useRef(notify);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  useEffect(() => {
    let active = true;
    void fetchLearningTargets()
      .then((items) => {
        if (!active) return;
        setTargets(items);
        setTargetId((current) => current || items[0]?.id || "");
      })
      .catch((error) => {
        if (active) notifyRef.current(error instanceof Error ? error.message : "Não foi possível carregar os objetivos de aprendizagem.");
      });
    return () => {
      active = false;
    };
  }, []);

  const result = state.result;
  const responseCount = result?.participation.responseCount ?? 0;
  const participantCount = result?.participation.participantCount ?? presentCount;
  const progress = participantCount > 0
    ? Math.min(100, Math.round((responseCount / participantCount) * 100))
    : 0;

  const validOptions = useMemo(
    () => options.map((option) => option.label.trim()).filter(Boolean),
    [options],
  );

  async function createTarget() {
    const title = newTargetTitle.trim();
    if (!title || targetBusy) return;
    setTargetBusy(true);
    try {
      const created = await createLearningTarget(title, "OBJECTIVE");
      setTargets((current) => [...current, created].sort((a, b) => a.title.localeCompare(b.title)));
      setTargetId(created.id);
      setNewTargetTitle("");
      notify("Objetivo de aprendizagem criado e selecionado.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível criar o objetivo de aprendizagem.");
    } finally {
      setTargetBusy(false);
    }
  }

  async function prepare() {
    if (busy) return;
    if (!targetId) {
      notify("Selecione ou crie um objetivo de aprendizagem.");
      return;
    }
    if (!prompt.trim()) {
      notify("Escreva a pergunta da verificação.");
      return;
    }
    if (validOptions.length < 2 || validOptions.length !== options.length) {
      notify("Preencha todas as alternativas ou remova as que não serão usadas.");
      return;
    }
    if (!options[correctIndex]) {
      notify("Selecione a alternativa correta.");
      return;
    }

    setBusy(true);
    try {
      const next = await prepareLearningCheck(sessionId, {
        learningTargetId: targetId,
        prompt: prompt.trim(),
        options: options.map((option, index) => ({
          key: OPTION_KEYS[index],
          label: option.label.trim(),
        })),
        correctOptionKey: OPTION_KEYS[correctIndex],
      });
      onStateChange(next);
      setCreating(false);
      notify("Verificação preparada. Abra as respostas quando a turma estiver pronta.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível preparar a verificação.");
    } finally {
      setBusy(false);
    }
  }

  async function transition(
    action: () => Promise<LearningCheckState>,
    success: string,
    fallback: string,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const next = await action();
      onStateChange(next);
      notify(success);
    } catch (error) {
      notify(error instanceof Error ? error.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function resetBuilder() {
    setPrompt("");
    setOptions(initialOptions());
    setCorrectIndex(0);
    setCreating(true);
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((current) => [...current, { id: crypto.randomUUID(), label: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setCorrectIndex((current) => {
      if (current === index) return 0;
      if (current > index) return current - 1;
      return current;
    });
  }

  function updateOption(index: number, label: string) {
    setOptions((current) => current.map((option, itemIndex) =>
      itemIndex === index ? { ...option, label } : option
    ));
  }

  if (!state.run || creating) {
    return (
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>EVIDÊNCIA DE APRENDIZAGEM</span>
            <h2>Verificar aprendizagem</h2>
            <p>Faça uma checagem objetiva vinculada ao que você quer observar na aprendizagem da turma.</p>
          </div>
          <span className={styles.status}>PREPARAR</span>
        </header>

        <div className={styles.prepareGrid}>
          <section className={styles.builderCard}>
            <span className={styles.label}>1 · O QUE SERÁ VERIFICADO</span>
            <label className={styles.field}>
              <span>Objetivo de aprendizagem</span>
              <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                <option value="">Selecione um objetivo</option>
                {targets.map((target) => (
                  <option value={target.id} key={target.id}>{target.title}</option>
                ))}
              </select>
            </label>

            <details className={styles.inlineCreate}>
              <summary>Criar um novo objetivo</summary>
              <div className={styles.inlineCreateBody}>
                <input
                  value={newTargetTitle}
                  onChange={(event) => setNewTargetTitle(event.target.value)}
                  maxLength={180}
                  placeholder="Ex.: Identificar quando usar LEFT JOIN"
                />
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={targetBusy || !newTargetTitle.trim()}
                  onClick={() => void createTarget()}
                >
                  {targetBusy ? "Criando..." : "Criar"}
                </button>
              </div>
            </details>

            <label className={styles.field}>
              <span>Pergunta</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={1200}
                placeholder="Ex.: Qual JOIN preserva todas as linhas da tabela da esquerda?"
              />
            </label>

            <div className={styles.field}>
              <span>Alternativas · marque a correta</span>
              <div className={styles.options}>
                {options.map((option, index) => (
                  <div className={styles.optionRow} key={option.id}>
                    <span className={styles.optionKey}>{OPTION_KEYS[index].toUpperCase()}</span>
                    <input
                      type="radio"
                      name="learning-check-correct"
                      checked={correctIndex === index}
                      aria-label={`Marcar alternativa ${OPTION_KEYS[index].toUpperCase()} como correta`}
                      onChange={() => setCorrectIndex(index)}
                    />
                    <input
                      value={option.label}
                      onChange={(event) => updateOption(index, event.target.value)}
                      maxLength={300}
                      placeholder={`Alternativa ${OPTION_KEYS[index].toUpperCase()}`}
                    />
                    <button
                      type="button"
                      className={styles.remove}
                      disabled={options.length <= 2}
                      onClick={() => removeOption(index)}
                      aria-label={`Remover alternativa ${OPTION_KEYS[index].toUpperCase()}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.optionActions}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={options.length >= 6}
                  onClick={addOption}
                >
                  + Alternativa
                </button>
              </div>
            </div>
          </section>

          <aside className={styles.sideCard}>
            <div>
              <span className={styles.label}>ANTES DE ABRIR</span>
              <strong>A checagem gera evidência; não XP.</strong>
              <p>O aluno responde pelo mesmo acesso da Arena. A correção permanece protegida até você revelar.</p>
            </div>
            <div className={styles.sideMetric}>
              <b>{presentCount}</b>
              <span>aluno(s) presente(s) na sessão</span>
            </div>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || !targetId || !prompt.trim() || validOptions.length < 2}
              onClick={() => void prepare()}
            >
              {busy ? "Preparando..." : "Preparar verificação"}
            </button>
          </aside>
        </div>
      </section>
    );
  }

  const run = state.run;
  const definition = state.definition;

  if (!definition) {
    return (
      <section className={styles.shell}>
        <div className={styles.resultCard}>
          <strong>Não foi possível carregar a definição desta verificação.</strong>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>EVIDÊNCIA DE APRENDIZAGEM</span>
          <h2>Verificar aprendizagem</h2>
          <p>{definition.learningTargetTitle}</p>
        </div>
        <span className={styles.status}>{statusLabel(state)}</span>
      </header>

      <div className={styles.liveGrid}>
        <section className={styles.questionCard}>
          <span className={styles.target}>{definition.learningTargetTitle}</span>
          <h3 className={styles.prompt}>{definition.prompt}</h3>
          <div className={styles.liveOptions}>
            {definition.options.map((option) => {
              const count = result?.choiceDistribution?.[option.key] ?? 0;
              return (
                <div className={styles.liveOption} key={option.key}>
                  <span className={styles.optionKey}>{option.key.toUpperCase()}</span>
                  <span>{option.label}</span>
                  <small>{count} resposta(s)</small>
                </div>
              );
            })}
          </div>
          {!run.resultsVisiblePublicly && (
            <p className={styles.helper}>
              A correção está protegida para os participantes. A distribuição acima é visível apenas ao professor.
            </p>
          )}
        </section>

        <aside className={styles.metricsCard}>
          <div className={styles.metric}>
            <strong>{responseCount}/{participantCount}</strong>
            <span>respostas recebidas</span>
          </div>
          <div className={styles.progress} aria-label={`${progress}% da turma respondeu`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.metric}>
            <strong>{run.resultsVisiblePublicly ? percentage(result?.evaluation.accuracy) : "—"}</strong>
            <span>acerto após correção</span>
          </div>
          <div className={styles.metric}>
            <strong>{state.evidenceCount}</strong>
            <span>evidência(s) registrada(s)</span>
          </div>
        </aside>
      </div>

      {run.resultsVisiblePublicly && result && (
        <section className={styles.resultCard}>
          <span className={styles.label}>LEITURA PEDAGÓGICA</span>
          <h3>Resultado da verificação</h3>
          <div className={styles.resultGrid}>
            <div className={styles.resultMetric}>
              <strong>{result.evaluation.correctCount}</strong>
              <span>acertos</span>
            </div>
            <div className={styles.resultMetric}>
              <strong>{result.evaluation.incorrectCount}</strong>
              <span>erros</span>
            </div>
            <div className={styles.resultMetric}>
              <strong>{percentage(result.evaluation.accuracy)}</strong>
              <span>taxa de acerto</span>
            </div>
          </div>
          <div className={styles.evidence}>
            {state.evidenceCount} evidência(s) de aprendizagem persistida(s) para este objetivo.
          </div>
        </section>
      )}

      <div className={styles.actions}>
        {run.status === "CREATED" && (
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() => void transition(
              () => openLearningCheck(sessionId, run.id),
              "Verificação aberta para respostas.",
              "Não foi possível abrir a verificação.",
            )}
          >
            Abrir respostas
          </button>
        )}

        {run.status === "ACTIVE" && run.acceptsResponses && (
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() => void transition(
              () => lockLearningCheck(sessionId, run.id),
              "Respostas bloqueadas. Revise a distribuição antes de revelar.",
              "Não foi possível bloquear as respostas.",
            )}
          >
            Bloquear respostas
          </button>
        )}

        {run.status === "ACTIVE" && !run.acceptsResponses && !run.resultsVisiblePublicly && (
          <>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => void transition(
                () => revealLearningCheck(sessionId, run.id),
                "Correção revelada e evidências registradas.",
                "Não foi possível revelar a correção.",
              )}
            >
              Revelar correção
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => void transition(
                () => closeLearningCheck(sessionId, run.id),
                "Verificação encerrada sem revelar a correção aos alunos.",
                "Não foi possível encerrar a verificação.",
              )}
            >
              Encerrar sem revelar
            </button>
          </>
        )}

        {run.status === "ACTIVE" && run.resultsVisiblePublicly && (
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() => void transition(
              () => closeLearningCheck(sessionId, run.id),
              "Verificação encerrada. As evidências permanecem registradas.",
              "Não foi possível encerrar a verificação.",
            )}
          >
            Encerrar verificação
          </button>
        )}

        {run.status === "CLOSED" && (
          <button type="button" className={styles.primary} onClick={resetBuilder}>
            Nova verificação
          </button>
        )}
      </div>
    </section>
  );
}
