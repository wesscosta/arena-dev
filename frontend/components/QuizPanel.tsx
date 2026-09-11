"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityQuestion } from "@/lib/types";
import type { JoinCode } from "@/lib/realtime-api";
import {
  closeQuiz,
  lockQuiz,
  openQuiz,
  prepareQuiz,
  quizOptionMatchesAnswer,
  revealQuiz,
  type QuizState,
} from "@/lib/quiz-api";
import styles from "./QuizPanel.module.css";

type Props = {
  sessionId: string;
  state: QuizState;
  onStateChange: (state: QuizState) => void;
  questions: ActivityQuestion[];
  presentCount: number;
  joinCode: JoinCode | null;
  notify: (message: string) => void;
};

function statusLabel(status: string) {
  if (status === "READY") return "Preparado";
  if (status === "OPEN") return "Respondendo";
  if (status === "LOCKED") return "Bloqueado";
  if (status === "REVEALED") return "Revelado";
  return "Encerrado";
}

function typeLabel(type: ActivityQuestion["type"]) {
  return type === "TRUE_FALSE" ? "Verdadeiro ou falso" : "Múltipla escolha";
}

export default function QuizPanel({
  sessionId,
  state,
  onStateChange,
  questions,
  presentCount,
  joinCode,
  notify,
}: Props) {
  const supported = useMemo(
    () => questions.filter((question) =>
      question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE"
    ),
    [questions],
  );
  const [questionId, setQuestionId] = useState(supported[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(!state.round);
  const round = state.round;

  useEffect(() => {
    if (!supported.some((question) => question.id === questionId)) {
      setQuestionId(supported[0]?.id ?? "");
    }
  }, [supported, questionId]);

  useEffect(() => {
    if (!round) setCreating(true);
  }, [round?.id]);

  const pending = Math.max(0, presentCount - (round?.totalAnswers ?? 0));

  async function run(
    action: () => Promise<QuizState>,
    successMessage: string,
    fallback: string,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      onStateChange(await action());
      notify(successMessage);
    } catch (error) {
      notify(error instanceof Error ? error.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  async function prepare() {
    if (!questionId) return;
    await run(
      () => prepareQuiz(sessionId, questionId),
      "Quiz preparado. Abra a rodada quando a turma estiver pronta.",
      "Não foi possível preparar o Quiz.",
    );
    setCreating(false);
  }

  async function close() {
    if (!round || busy) return;
    if (
      (round.status === "OPEN" || round.status === "LOCKED")
      && presentCount > 0
      && pending > 0
    ) {
      const confirmed = window.confirm(
        `${round.totalAnswers} de ${presentCount} aluno(s) presente(s) responderam. `
        + `${pending} ainda estão pendentes.\n\nDeseja encerrar mesmo assim?`,
      );
      if (!confirmed) return;
    }
    await run(
      () => closeQuiz(sessionId, round.id),
      round.publicResultsVisible
        ? "Quiz encerrado com resultado público preservado."
        : "Quiz encerrado sem revelar a correção.",
      "Não foi possível encerrar o Quiz.",
    );
  }

  function project() {
    if (!joinCode) {
      notify("Aguarde a geração do código da sessão.");
      return;
    }
    window.open(
      `/projector?code=${encodeURIComponent(joinCode.code)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (!round || creating) {
    return (
      <section className={styles.shell}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>QUIZ AO VIVO</span>
            <h3>Preparar questão estruturada</h3>
            <p>Escolha uma questão objetiva já autorada nesta atividade.</p>
          </div>
          {round?.status === "CLOSED" && (
            <button className={styles.secondary} onClick={() => setCreating(false)}>
              Voltar ao resultado anterior
            </button>
          )}
        </div>

        {supported.length ? (
          <>
            <label className={styles.field}>
              <span>Questão</span>
              <select value={questionId} onChange={(event) => setQuestionId(event.target.value)}>
                {supported.map((question) => (
                  <option key={question.id} value={question.id}>
                    {typeLabel(question.type)} · {question.statement}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={busy || !questionId}
                onClick={() => void prepare()}
              >
                {busy ? "Preparando..." : "Preparar Quiz"}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <strong>Nenhuma questão compatível</strong>
            <p>O Quiz v0.5 aceita múltipla escolha e verdadeiro/falso.</p>
          </div>
        )}
      </section>
    );
  }

  const question = round.question;
  const correctAnswer = round.correctAnswer;

  return (
    <section className={styles.shell}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>QUIZ AO VIVO</span>
          <h3>{question?.statement ?? "Questão preparada"}</h3>
          <p>
            {round.publicResultsVisible
              ? "Distribuição e correção liberadas para as audiências públicas."
              : "O professor acompanha os dados; a correção permanece protegida."}
          </p>
        </div>
        <span className={`${styles.status} ${styles[round.status.toLowerCase()]}`}>
          {statusLabel(round.status)}
        </span>
      </div>

      <div className={styles.stats}>
        <div><strong>{presentCount}</strong><span>presentes</span></div>
        <div><strong>{round.totalAnswers}</strong><span>respostas</span></div>
        <div><strong>{pending}</strong><span>pendentes</span></div>
      </div>

      {question && (
        <div className={styles.results}>
          {round.distribution.map((option, index) => {
            const correct = quizOptionMatchesAnswer(option.optionId, correctAnswer);
            return (
              <div className={`${styles.result} ${correct ? styles.correct : ""}`} key={option.optionId}>
                <div className={styles.resultHead}>
                  <span>
                    <b>{question.type === "TRUE_FALSE" ? (option.optionId === "true" ? "V" : "F") : String.fromCharCode(65 + index)}</b>
                    {option.label}
                    {correct && <em>correta</em>}
                  </span>
                  <strong>{option.answerCount ?? 0} · {(option.percentage ?? 0).toFixed(0)}%</strong>
                </div>
                <div className={styles.bar}>
                  <span style={{ width: `${option.percentage ?? 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.actions}>
        {round.status === "READY" && (
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => void run(
              () => openQuiz(sessionId, round.id),
              "Quiz aberto para respostas.",
              "Não foi possível abrir o Quiz.",
            )}
          >
            Abrir respostas
          </button>
        )}
        {round.status === "OPEN" && (
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => void run(
              () => lockQuiz(sessionId, round.id),
              "Respostas bloqueadas. Agora você pode revisar antes de revelar.",
              "Não foi possível bloquear as respostas.",
            )}
          >
            Bloquear respostas
          </button>
        )}
        {round.status === "LOCKED" && (
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => void run(
              () => revealQuiz(sessionId, round.id),
              "Resultado e correção revelados.",
              "Não foi possível revelar o Quiz.",
            )}
          >
            Revelar resultado
          </button>
        )}
        <button className={styles.secondary} onClick={project}>Abrir Projetor</button>
        {round.status !== "CLOSED" ? (
          <button className={styles.danger} disabled={busy} onClick={() => void close()}>
            Encerrar Quiz
          </button>
        ) : (
          <button className={styles.primary} onClick={() => setCreating(true)}>
            Novo Quiz
          </button>
        )}
      </div>
    </section>
  );
}
