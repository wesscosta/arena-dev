"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityQuestion } from "@/lib/types";
import type { JoinCode } from "@/lib/realtime-api";
import { deriveQuizFeedback } from "@/lib/quiz-feedback";
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
  canAdvanceFlow?: boolean;
  onContinue?: () => Promise<void>;
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
  canAdvanceFlow = false,
  onContinue,
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
  const [pedagogyMode, setPedagogyMode] = useState<"explain" | "discussion" | null>(null);
  const round = state.round;

  useEffect(() => {
    if (!supported.some((question) => question.id === questionId)) {
      setQuestionId(supported[0]?.id ?? "");
    }
  }, [supported, questionId]);

  useEffect(() => {
    if (!round) setCreating(true);
    setPedagogyMode(null);
  }, [round?.id]);

  const pending = Math.max(0, presentCount - (round?.totalAnswers ?? 0));
  const feedback = useMemo(() => deriveQuizFeedback(round), [round]);
  const authoredQuestion = useMemo(
    () => questions.find((question) => question.id === round?.question?.id),
    [questions, round?.question?.id],
  );
  const feedbackAvailable = Boolean(
    feedback && round
      && (round.status === "LOCKED" || round.status === "REVEALED" || round.status === "CLOSED"),
  );

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

  async function continueLesson() {
    if (!round || busy) return;
    setBusy(true);
    try {
      if (round.status !== "CLOSED") {
        onStateChange(await closeQuiz(sessionId, round.id));
      }
      if (canAdvanceFlow && onContinue) {
        await onContinue();
      } else {
        notify("Quiz encerrado. Escolha explicitamente a próxima ação da aula.");
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível continuar a condução.");
    } finally {
      setBusy(false);
    }
  }

  async function retryQuestion() {
    if (!round?.question || busy) return;
    setBusy(true);
    try {
      if (round.status !== "CLOSED") {
        await closeQuiz(sessionId, round.id);
      }
      const next = await prepareQuiz(sessionId, round.question.id);
      onStateChange(next);
      setCreating(false);
      setPedagogyMode(null);
      notify("Nova rodada preparada com a mesma questão. Abra as respostas quando decidir.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível preparar uma nova tentativa.");
    } finally {
      setBusy(false);
    }
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
  const correctOption = question
    ? round.distribution.find((option) =>
        quizOptionMatchesAnswer(option.optionId, correctAnswer)
      )
    : undefined;

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

      {feedbackAvailable && feedback && (
        <section className={styles.feedback} aria-labelledby="quiz-feedback-title">
          <div className={styles.feedbackHeader}>
            <div>
              <span className={styles.eyebrow}>LEITURA PEDAGÓGICA</span>
              <h4 id="quiz-feedback-title">Como a turma respondeu</h4>
            </div>
            <strong>{feedback.accuracyPercentage.toFixed(0)}% de acerto</strong>
          </div>

          <div className={styles.feedbackMetrics}>
            <div><strong>{feedback.correctAnswers}</strong><span>acertos</span></div>
            <div><strong>{feedback.incorrectAnswers}</strong><span>erros</span></div>
            <div><strong>{feedback.totalAnswers}</strong><span>respostas avaliadas</span></div>
          </div>

          <div className={styles.feedbackInsight}>
            {feedback.topDistractor ? (
              <>
                <span>Maior incidência de erro</span>
                <strong>{feedback.topDistractor.label}</strong>
                <p>{feedback.topDistractor.answerCount} resposta(s) · {feedback.topDistractor.percentage.toFixed(0)}% dos envios.</p>
              </>
            ) : feedback.totalAnswers > 0 ? (
              <><span>Distribuição dos erros</span><strong>Nenhum distrator recebeu resposta.</strong><p>As respostas enviadas convergiram para a alternativa correta.</p></>
            ) : (
              <><span>Sem amostra</span><strong>Nenhuma resposta foi enviada.</strong><p>Não há dados suficientes para leitura pedagógica desta rodada.</p></>
            )}
          </div>

          <div className={styles.pedagogyActions} aria-label="Decisões pedagógicas">
            <button className={styles.primary} disabled={busy} onClick={() => void continueLesson()}>Continuar</button>
            <button className={styles.secondary} disabled={busy} aria-pressed={pedagogyMode === "explain"} onClick={() => setPedagogyMode((mode) => mode === "explain" ? null : "explain")}>Reexplicar</button>
            <button className={styles.secondary} disabled={busy || !question} onClick={() => void retryQuestion()}>Refazer questão</button>
            <button className={styles.secondary} disabled={busy} aria-pressed={pedagogyMode === "discussion"} onClick={() => setPedagogyMode((mode) => mode === "discussion" ? null : "discussion")}>Abrir discussão</button>
          </div>

          <p className={styles.controlNote}>
            {canAdvanceFlow
              ? "Continuar avança o roteiro somente após clique explícito do professor."
              : "Nenhuma decisão avança o roteiro automaticamente."}
          </p>

          {pedagogyMode === "explain" && (
            <div className={styles.pedagogyCard}>
              <span>REEXPLICAÇÃO</span>
              <h5>Retome o conceito antes de decidir o próximo passo.</h5>
              {authoredQuestion?.explanation?.trim() ? (
                <p>{authoredQuestion.explanation}</p>
              ) : (
                <p>Esta questão não possui explicação autorada. Compare a resposta correta{correctOption ? ` (${correctOption.label})` : ""} com o erro mais frequente{feedback.topDistractor ? ` (${feedback.topDistractor.label})` : ""}.</p>
              )}
            </div>
          )}

          {pedagogyMode === "discussion" && (
            <div className={styles.pedagogyCard}>
              <span>DISCUSSÃO ORIENTADA</span>
              <h5>Transforme o resultado em argumento, não em avanço automático.</h5>
              {feedback.topDistractor ? (
                <p>Comece perguntando por que “{feedback.topDistractor.label}” pareceu plausível. Depois peça à turma que compare os critérios usados nessa escolha com a resposta correta{correctOption ? ` “${correctOption.label}”` : ""}.</p>
              ) : (
                <p>Peça a dois ou três alunos que justifiquem caminhos diferentes e explicitem qual evidência descarta as demais alternativas.</p>
              )}
            </div>
          )}
        </section>
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
