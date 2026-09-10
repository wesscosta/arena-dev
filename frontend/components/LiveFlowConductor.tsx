"use client";

import {
  QUESTION_DIFFICULTY_LABEL,
  QUESTION_TYPE_LABEL,
} from "@/lib/activity-questions";
import type { LiveFlowState } from "@/lib/mechanics-api";
import type { ActivityQuestion } from "@/lib/types";
import styles from "./LiveFlowConductor.module.css";

const STEP_LABEL = {
  SLIDE: "Slide",
  QUESTION: "Questão",
  WORD_CLOUD: "Nuvem de Palavras",
  POLL: "Votação",
} as const;

export default function LiveFlowConductor({
  flow,
  currentQuestion,
  busy,
  onStart,
  onPrevious,
  onNext,
  onOpenWordCloud,
}: {
  flow: LiveFlowState;
  currentQuestion?: ActivityQuestion;
  busy: boolean;
  onStart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenWordCloud: () => void;
}) {
  const current =
    flow.currentIndex === undefined
      ? undefined
      : flow.steps[flow.currentIndex];

  return (
    <section className={styles.shell}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ROTEIRO AO VIVO</span>
          <h3>{flow.activityTitle ?? "Roteiro da aula"}</h3>
          <p>
            O professor controla a progressão. Nenhum bloco avança
            automaticamente.
          </p>
        </div>

        <div className={styles.progress}>
          <strong>
            {current ? String(flow.currentIndex! + 1).padStart(2, "0") : "00"}
          </strong>
          <span>/ {String(flow.steps.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div className={styles.timeline}>
        {flow.steps.map((step, index) => {
          const state =
            flow.currentIndex === undefined
              ? "future"
              : index === flow.currentIndex
                ? "current"
                : index < flow.currentIndex
                  ? "past"
                  : "future";

          return (
            <div
              key={step.id}
              className={`${styles.timelineItem} ${styles[state]}`}
              title={step.title || STEP_LABEL[step.type]}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{STEP_LABEL[step.type]}</strong>
                <small>{step.title || `Bloco ${index + 1}`}</small>
              </div>
            </div>
          );
        })}
      </div>

      {!current ? (
        <div className={styles.ready}>
          <span>◇</span>
          <strong>Roteiro pronto para iniciar</strong>
          <p>
            {flow.steps.length} bloco(s) preparado(s). O primeiro só será
            ativado quando você iniciar a condução.
          </p>
          <button
            type="button"
            className="button primary large"
            disabled={busy || !flow.steps.length}
            onClick={onStart}
          >
            {busy ? "Iniciando..." : "Iniciar roteiro"}
          </button>
        </div>
      ) : (
        <div className={styles.currentCard}>
          <div className={styles.currentHead}>
            <div>
              <span>{STEP_LABEL[current.type]}</span>
              <h3>{current.title || `Bloco ${flow.currentIndex! + 1}`}</h3>
            </div>
            <strong>
              {String(flow.currentIndex! + 1).padStart(2, "0")}
              <small> / {String(flow.steps.length).padStart(2, "0")}</small>
            </strong>
          </div>

          {current.instructions && (
            <div className={styles.teacherNote}>
              <strong>Nota do professor</strong>
              <p>{current.instructions}</p>
            </div>
          )}

          {current.type === "SLIDE" && (
            <div className={styles.slideContent}>
              {current.slideContent}
            </div>
          )}

          {current.type === "QUESTION" && (
            currentQuestion ? (
              <div className={styles.question}>
                <div className={styles.meta}>
                  <span>{QUESTION_TYPE_LABEL[currentQuestion.type]}</span>
                  <span>
                    {QUESTION_DIFFICULTY_LABEL[currentQuestion.difficulty]}
                  </span>
                  <span>{currentQuestion.points} XP sugeridos</span>
                </div>
                <h4>{currentQuestion.statement}</h4>
                {currentQuestion.code && <pre>{currentQuestion.code}</pre>}
                {currentQuestion.options && (
                  <div className={styles.options}>
                    {currentQuestion.options.map((option) => (
                      <div key={option.id}>
                        <b>{option.id}</b>
                        <span>{option.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.notice}>
                A questão vinculada não está disponível no estado atual da
                atividade.
              </div>
            )
          )}

          {current.type === "WORD_CLOUD" && current.wordCloud && (
            <div className={styles.interactionPreview}>
              <span>PERGUNTA PREPARADA</span>
              <h4>{current.wordCloud.prompt}</h4>
              <div className={styles.previewMeta}>
                <span>
                  até {current.wordCloud.maxWordsPerParticipant} resposta(s) por aluno
                </span>
                <span>
                  {current.wordCloud.liveReveal
                    ? "frequência ao vivo"
                    : "coletar e revelar"}
                </span>
              </div>
              <button
                type="button"
                className="button"
                onClick={onOpenWordCloud}
              >
                Abrir Nuvem em Interações
              </button>
            </div>
          )}

          {current.type === "POLL" && current.poll && (
            <div className={styles.interactionPreview}>
              <span>VOTAÇÃO PREPARADA</span>
              <h4>{current.poll.prompt}</h4>
              <div className={styles.pollOptions}>
                {current.poll.options.map((option) => (
                  <div key={option.id}>
                    <b>{option.id}</b>
                    <span>{option.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.controls}>
            <button
              type="button"
              className="button ghost"
              disabled={busy || !flow.hasPrevious}
              onClick={onPrevious}
            >
              ← Anterior
            </button>

            <div>
              <span>
                {flow.hasNext ? "Próximo bloco disponível" : "Último bloco"}
              </span>
            </div>

            <button
              type="button"
              className="button primary"
              disabled={busy || !flow.hasNext}
              onClick={onNext}
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
