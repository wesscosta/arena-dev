"use client";

import styles from "./ActivityStepEditor.module.css";
import {
  ACTIVITY_STEP_DESCRIPTION,
  ACTIVITY_STEP_LABEL,
  createActivityStep,
  moveActivityStep,
  nextPollOptionId,
  normalizeActivityStepPositions,
} from "@/lib/activity-steps";
import type {
  ActivityQuestion,
  ActivityStep,
  ActivityStepType,
} from "@/lib/types";

const STEP_TYPES: ActivityStepType[] = [
  "SLIDE",
  "QUESTION",
  "WORD_CLOUD",
  "POLL",
];

export default function ActivityStepEditor({
  steps,
  questions,
  onChange,
  disabled = false,
}: {
  steps: ActivityStep[];
  questions: ActivityQuestion[];
  onChange: (steps: ActivityStep[]) => void;
  disabled?: boolean;
}) {
  function patchStep(index: number, patch: Partial<ActivityStep>) {
    onChange(
      normalizeActivityStepPositions(
        steps.map((step, stepIndex) =>
          stepIndex === index ? { ...step, ...patch } : step,
        ),
      ),
    );
  }

  function addStep(type: ActivityStepType) {
    onChange(
      normalizeActivityStepPositions([
        ...steps,
        createActivityStep(type, questions),
      ]),
    );
  }

  function removeStep(index: number) {
    onChange(
      normalizeActivityStepPositions(
        steps.filter((_, stepIndex) => stepIndex !== index),
      ),
    );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.intro}>
        <div>
          <span>ROTEIRO AO VIVO</span>
          <strong>Monte a sequência pedagógica da aula</strong>
          <p>
            Organize conteúdo, interação e diagnóstico. A execução real será
            criada somente quando o professor conduzir a Arena.
          </p>
        </div>
        <div className={styles.counter}>
          <strong>{steps.length}</strong>
          <span>{steps.length === 1 ? "bloco" : "blocos"}</span>
        </div>
      </div>

      <div className={styles.palette}>
        {STEP_TYPES.map((type) => {
          const questionBlocked = type === "QUESTION" && !questions.length;
          return (
            <button
              type="button"
              key={type}
              disabled={disabled || questionBlocked}
              onClick={() => addStep(type)}
            >
              <span>
                {type === "SLIDE"
                  ? "▣"
                  : type === "QUESTION"
                    ? "?"
                    : type === "WORD_CLOUD"
                      ? "☁"
                      : "◉"}
              </span>
              <div>
                <strong>+ {ACTIVITY_STEP_LABEL[type]}</strong>
                <small>
                  {questionBlocked
                    ? "Cadastre uma questão primeiro."
                    : ACTIVITY_STEP_DESCRIPTION[type]}
                </small>
              </div>
            </button>
          );
        })}
      </div>

      {!steps.length ? (
        <div className={styles.empty}>
          <span>◇</span>
          <strong>Nenhum bloco no roteiro</strong>
          <p>
            Comece por um Slide, uma Questão, uma Nuvem de Palavras ou uma
            Votação.
          </p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {steps.map((step, index) => (
            <article
              className={styles.step}
              key={`${step.id ?? "new"}-${index}-${step.type}`}
            >
              <div className={styles.rail}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {index < steps.length - 1 && <i />}
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.type}>
                      {ACTIVITY_STEP_LABEL[step.type]}
                    </span>
                    <strong>
                      {step.title?.trim() || `Bloco ${index + 1}`}
                    </strong>
                  </div>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      title="Mover para cima"
                      disabled={disabled || index === 0}
                      onClick={() => onChange(moveActivityStep(steps, index, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Mover para baixo"
                      disabled={disabled || index === steps.length - 1}
                      onClick={() => onChange(moveActivityStep(steps, index, 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.remove}
                      title="Remover bloco"
                      disabled={disabled}
                      onClick={() => removeStep(index)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className={styles.commonFields}>
                  <label>
                    Título do bloco
                    <input
                      className="input"
                      value={step.title ?? ""}
                      maxLength={180}
                      disabled={disabled}
                      onChange={(event) =>
                        patchStep(index, { title: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Instruções ao professor <small>opcional</small>
                    <textarea
                      className="input textarea"
                      rows={2}
                      maxLength={2000}
                      value={step.instructions ?? ""}
                      disabled={disabled}
                      onChange={(event) =>
                        patchStep(index, { instructions: event.target.value })
                      }
                    />
                  </label>
                </div>

                {step.type === "SLIDE" && (
                  <label className={styles.fullField}>
                    Conteúdo do slide
                    <textarea
                      className="input textarea"
                      rows={7}
                      maxLength={12000}
                      value={step.slideContent ?? ""}
                      disabled={disabled}
                      placeholder={"# Título\n\nTexto, tópicos ou instrução projetável."}
                      onChange={(event) =>
                        patchStep(index, { slideContent: event.target.value })
                      }
                    />
                  </label>
                )}

                {step.type === "QUESTION" && (
                  <label className={styles.fullField}>
                    Questão da atividade
                    <select
                      className="select full"
                      value={step.questionId ?? ""}
                      disabled={disabled || !questions.length}
                      onChange={(event) =>
                        patchStep(index, {
                          questionId: event.target.value || undefined,
                        })
                      }
                    >
                      <option value="">Selecione uma questão</option>
                      {questions.map((question, questionIndex) => (
                        <option key={question.id} value={question.id}>
                          {String(questionIndex + 1).padStart(2, "0")} ·{" "}
                          {question.statement}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {step.type === "WORD_CLOUD" && (
                  <div className={styles.configGrid}>
                    <label className={styles.spanTwo}>
                      Pergunta da Nuvem
                      <input
                        className="input"
                        maxLength={280}
                        value={step.wordCloud?.prompt ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                          patchStep(index, {
                            wordCloud: {
                              prompt: event.target.value,
                              maxWordsPerParticipant:
                                step.wordCloud?.maxWordsPerParticipant ?? 1,
                              liveReveal: step.wordCloud?.liveReveal ?? false,
                            },
                          })
                        }
                      />
                    </label>

                    <label>
                      Máx. por participante
                      <select
                        className="select full"
                        value={step.wordCloud?.maxWordsPerParticipant ?? 1}
                        disabled={disabled}
                        onChange={(event) =>
                          patchStep(index, {
                            wordCloud: {
                              prompt: step.wordCloud?.prompt ?? "",
                              maxWordsPerParticipant: Number(event.target.value),
                              liveReveal: step.wordCloud?.liveReveal ?? false,
                            },
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.toggleField}>
                      <input
                        type="checkbox"
                        checked={step.wordCloud?.liveReveal ?? false}
                        disabled={disabled}
                        onChange={(event) =>
                          patchStep(index, {
                            wordCloud: {
                              prompt: step.wordCloud?.prompt ?? "",
                              maxWordsPerParticipant:
                                step.wordCloud?.maxWordsPerParticipant ?? 1,
                              liveReveal: event.target.checked,
                            },
                          })
                        }
                      />
                      <span>
                        <strong>Revelação ao vivo</strong>
                        <small>Desligada = coletar primeiro e revelar depois.</small>
                      </span>
                    </label>
                  </div>
                )}

                {step.type === "POLL" && (
                  <div className={styles.pollConfig}>
                    <label>
                      Pergunta da votação
                      <input
                        className="input"
                        maxLength={280}
                        value={step.poll?.prompt ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                          patchStep(index, {
                            poll: {
                              prompt: event.target.value,
                              options: step.poll?.options ?? [],
                              liveResults: step.poll?.liveResults ?? false,
                            },
                          })
                        }
                      />
                    </label>

                    <div className={styles.pollOptions}>
                      <div className={styles.pollOptionsHead}>
                        <strong>Opções</strong>
                        <button
                          type="button"
                          disabled={disabled || (step.poll?.options.length ?? 0) >= 8}
                          onClick={() => {
                            const options = step.poll?.options ?? [];
                            const id = nextPollOptionId(options);
                            patchStep(index, {
                              poll: {
                                prompt: step.poll?.prompt ?? "",
                                liveResults: step.poll?.liveResults ?? false,
                                options: [...options, { id, text: "" }],
                              },
                            });
                          }}
                        >
                          + opção
                        </button>
                      </div>

                      {(step.poll?.options ?? []).map((option, optionIndex) => (
                        <div
                          className={styles.pollOption}
                          key={`${option.id}-${optionIndex}`}
                        >
                          <span>{option.id}</span>
                          <input
                            className="input"
                            maxLength={160}
                            value={option.text}
                            disabled={disabled}
                            onChange={(event) => {
                              const options = [...(step.poll?.options ?? [])];
                              options[optionIndex] = {
                                ...option,
                                text: event.target.value,
                              };
                              patchStep(index, {
                                poll: {
                                  prompt: step.poll?.prompt ?? "",
                                  liveResults: step.poll?.liveResults ?? false,
                                  options,
                                },
                              });
                            }}
                          />
                          <button
                            type="button"
                            title="Remover opção"
                            disabled={disabled || (step.poll?.options.length ?? 0) <= 2}
                            onClick={() => {
                              const options = (step.poll?.options ?? []).filter(
                                (_, current) => current !== optionIndex,
                              );
                              patchStep(index, {
                                poll: {
                                  prompt: step.poll?.prompt ?? "",
                                  liveResults: step.poll?.liveResults ?? false,
                                  options,
                                },
                              });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <label className={styles.toggleField}>
                      <input
                        type="checkbox"
                        checked={step.poll?.liveResults ?? false}
                        disabled={disabled}
                        onChange={(event) =>
                          patchStep(index, {
                            poll: {
                              prompt: step.poll?.prompt ?? "",
                              options: step.poll?.options ?? [],
                              liveResults: event.target.checked,
                            },
                          })
                        }
                      />
                      <span>
                        <strong>Resultados ao vivo</strong>
                        <small>Desligado = resultado oculto até revelar.</small>
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
