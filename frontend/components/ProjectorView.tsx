"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeJoinCode } from "@/lib/app-state";
import {
  connectProjectorSocket,
  fetchProjectorSnapshot,
  type ProjectorSnapshot,
} from "@/lib/projector-api";
import type { SessionRealtimeEvent } from "@/lib/realtime-api";
import { emptyLiveStageState, type LiveStageState } from "@/lib/live-stage-api";
import type { TimerState } from "@/lib/timer-api";
import type { WordCloudState } from "@/lib/word-cloud-api";
import type { PollState } from "@/lib/poll-api";
import { quizOptionMatchesAnswer, type QuizState } from "@/lib/quiz-api";
import { reconnectDelayMs, type PublicBossState, type PublicBuzzerState, type PublicRuntimeSnapshot } from "@/lib/runtime-snapshot";
import {
  wordCloudFontSize,
  wordCloudStatusLabel,
} from "@/lib/word-cloud-visual";
import {
  effectiveTimerStatus,
  formatTimer,
  timerRemainingSeconds,
  timerStatusLabel,
} from "@/lib/timer-clock";
import styles from "@/app/projector/projector.module.css";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível abrir o modo projetor.";
}

function slideLines(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ProjectorView() {
  const [code, setCode] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [snapshot, setSnapshot] = useState<ProjectorSnapshot | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({ timer: null });
  const [wordCloudState, setWordCloudState] = useState<WordCloudState>({ round: null });
  const [pollState, setPollState] = useState<PollState>({ round: null });
  const [quizState, setQuizState] = useState<QuizState>({ round: null });
  const [liveStage, setLiveStage] = useState<LiveStageState>(() => emptyLiveStageState());
  const [buzzerState, setBuzzerState] = useState<PublicBuzzerState>({ status: "IDLE", presses: [] });
  const [bossState, setBossState] = useState<PublicBossState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [connection, setConnection] = useState<"offline" | "connecting" | "reconnecting" | "online">("offline");
  const [realtimeVersion, setRealtimeVersion] = useState(0);
  const [error, setError] = useState("");
  const [sessionFinished, setSessionFinished] = useState(false);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    const initial = normalizeJoinCode(
      new URLSearchParams(window.location.search).get("code") ?? "",
    );
    setCode(initial);
    setDraftCode(initial);
  }, []);

  useEffect(() => {
    if (!code) {
      setSnapshot(null);
      setTimerState({ timer: null });
      setWordCloudState({ round: null });
      setPollState({ round: null });
      setQuizState({ round: null });
      setLiveStage(emptyLiveStageState());
      setBuzzerState({ status: "IDLE", presses: [] });
      setBossState(null);
      setConnection("offline");
      return;
    }

    let active = true;
    setError("");
    setSessionFinished(false);
    setConnection("connecting");

    void fetchProjectorSnapshot(code)
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setTimerState({
          ...next.runtime.timer,
          serverOccurredAt: next.serverTime,
          receivedAtMs: Date.now(),
        });
        setLiveStage(next.runtime.stage ?? emptyLiveStageState(next.sessionId));
        setBuzzerState(next.runtime.buzzer ?? { status: "IDLE", presses: [] });
        setWordCloudState(next.runtime.wordCloud ?? { round: null });
        setPollState(next.runtime.poll ?? { round: null });
        setQuizState(next.runtime.quiz ?? { round: null });
        setBossState(next.runtime.boss ?? null);
      })
      .catch((failure) => {
        if (!active) return;
        setSnapshot(null);
        setConnection("offline");
        setError(errorMessage(failure));
      });

    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    if (!snapshot || !code || sessionFinished) return;

    let active = true;
    let finished = false;
    let authFailed = false;
    let reconnectTimer: number | undefined;

    const socket = connectProjectorSocket(
      snapshot.sessionId,
      code,
      (event: SessionRealtimeEvent) => {
        if (!active) return;

        if (event.type === "AUTH_OK") {
          reconnectAttemptRef.current = 0;
          setConnection("online");
          setError("");
          return;
        }

        if (event.type === "RUNTIME_SNAPSHOT") {
          const runtime = event.payload as PublicRuntimeSnapshot;
          setLiveStage(runtime.stage);
          setBuzzerState(runtime.buzzer);
          setTimerState({
            ...runtime.timer,
            serverOccurredAt: event.occurredAt,
            receivedAtMs: Date.now(),
          });
          setWordCloudState(runtime.wordCloud);
          setPollState(runtime.poll);
          setQuizState(runtime.quiz);
          setBossState(runtime.boss ?? null);
          return;
        }

        if (event.type === "LIVE_STAGE_STATE") {
          setLiveStage(event.payload as LiveStageState);
          return;
        }

        if (event.type === "BUZZER_STATE") {
          setBuzzerState(event.payload as PublicBuzzerState);
          return;
        }

        if (event.type === "TIMER_STATE") {
          setTimerState({
            ...(event.payload as TimerState),
            serverOccurredAt: event.occurredAt,
            receivedAtMs: Date.now(),
          });
          return;
        }

        if (event.type === "WORD_CLOUD_STATE") {
          setWordCloudState(event.payload as WordCloudState);
          return;
        }

        if (event.type === "POLL_STATE") {
          setPollState(event.payload as PollState);
          return;
        }

        if (event.type === "QUIZ_STATE") {
          setQuizState(event.payload as QuizState);
          return;
        }

        if (event.type === "BOSS_STATE") {
          setBossState(event.payload as PublicBossState);
          return;
        }

        if (event.type === "AUTH_FAILED") {
          authFailed = true;
          setConnection("offline");
          const payload = event.payload as { message?: string };
          setError(payload.message || "O código do projetor não é mais válido.");
          return;
        }

        if (event.type === "SESSION_FINISHED") {
          finished = true;
          setSessionFinished(true);
          setConnection("offline");
          socket.close();
          return;
        }

        if (event.type === "ERROR") {
          const payload = event.payload as { message?: string };
          setError(payload.message || "Falha no canal público da sessão.");
          socket.close();
        }
      },
    );

    socket.onerror = () => {
      if (active) setConnection("offline");
    };

    socket.onclose = () => {
      if (!active || finished || authFailed) return;
      setConnection("reconnecting");
      const delay = reconnectDelayMs(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;
      reconnectTimer = window.setTimeout(
        () => setRealtimeVersion((value) => value + 1),
        delay,
      );
    };

    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket.close();
    };
  }, [snapshot?.sessionId, code, realtimeVersion, sessionFinished]);

  useEffect(() => {
    if (timerState.timer?.status !== "RUNNING") return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [timerState.timer?.id, timerState.timer?.status]);

  const timer = timerState.timer;
  const remaining = useMemo(
    () => timerRemainingSeconds(timerState, nowMs),
    [timerState, nowMs],
  );
  const status = timer
    ? effectiveTimerStatus(timer, remaining)
    : undefined;
  const progress = timer?.durationSeconds
    ? Math.max(0, Math.min(100, (remaining / timer.durationSeconds) * 100))
    : 0;

  const wordCloudRound = wordCloudState.round;
  const primaryType = liveStage.primary.type;
  const timerCanTakeFocus = Boolean(
    timer
      && status
      && !["FINISHED", "CANCELLED"].includes(status),
  );
  const showWordCloud = primaryType === "WORD_CLOUD" && Boolean(wordCloudRound);
  const pollRound = pollState.round;
  const showPoll = primaryType === "POLL" && Boolean(pollRound);
  const quizRound = quizState.round;
  const showQuiz = primaryType === "QUIZ" && Boolean(quizRound?.question);
  const preparedStep = liveStage.primary.step;
  const showSlide = primaryType === "SLIDE" && Boolean(preparedStep?.slideContent);
  const showQuestion = primaryType === "QUESTION" && Boolean(preparedStep?.question);
  const showBoss = primaryType === "BOSS_BATTLE";
  const showBuzzer = primaryType === "BUZZER";
  const showDraw = primaryType === "DRAW" && Boolean(liveStage.primary.displayName);
  const showTimerPrimary = primaryType === "TIMER" || (primaryType === "IDLE" && timerCanTakeFocus);
  const showTimerOverlay = liveStage.overlays.timer && Boolean(
    timer && status && ["RUNNING", "PAUSED"].includes(status),
  );
  const maxWordCount = wordCloudRound?.terms.reduce(
    (current, term) => Math.max(current, term.count),
    1,
  ) ?? 1;

  function openCode(nextCode: string) {
    const normalized = normalizeJoinCode(nextCode);
    if (!normalized) return;
    window.history.replaceState(
      null,
      "",
      `/projector?code=${encodeURIComponent(normalized)}`,
    );
    setCode(normalized);
    setDraftCode(normalized);
  }

  async function requestFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setError("O navegador não permitiu alternar para tela cheia.");
    }
  }

  if (!code || (!snapshot && error)) {
    return (
      <main className={styles.accessPage}>
        <section className={styles.accessCard}>
          <div className={styles.brandMark}>A</div>
          <span className={styles.eyebrow}>ARENA DEV · MODO PROJETOR</span>
          <h1>Abra a sessão no projetor</h1>
          <p>
            Informe o mesmo código temporário exibido pelo professor.
            Nenhum controle administrativo fica disponível nesta tela.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              openCode(draftCode);
            }}
          >
            <input
              autoFocus
              value={draftCode}
              onChange={(event) => setDraftCode(event.target.value.toUpperCase())}
              maxLength={8}
              placeholder="ABC123"
              aria-label="Código da sessão"
            />
            <button type="submit">Abrir projetor</button>
          </form>
          {error && <div className={styles.error}>{error}</div>}
        </section>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className={styles.accessPage}>
        <div className={styles.loading}>Preparando modo projetor...</div>
      </main>
    );
  }

  return (
    <main className={styles.projector}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>A</div>
          <div>
            <strong>ARENA DEV</strong>
            <span>Modo Projetor</span>
          </div>
        </div>

        <div className={styles.sessionMeta}>
          <span>{snapshot.classroomName}</span>
          <strong>{snapshot.sessionTitle}</strong>
        </div>

        <div className={styles.headerActions}>
          <span className={`${styles.connection} ${styles[connection]}`}>
            <i />
            {connection === "online"
              ? "Sincronizado"
              : connection === "connecting"
                ? "Conectando"
                : connection === "reconnecting"
                  ? "Reconectando"
                  : "Offline"}
          </span>
          <button onClick={() => void requestFullscreen()} title="Alternar tela cheia">
            ⛶
          </button>
        </div>
      </header>

      {connection === "reconnecting" && (
        <div className="public-live-reconnect" role="status">
          Conexão interrompida. Mantendo o último palco enquanto reconectamos.
        </div>
      )}

      <section className={`${styles.stage} ${showWordCloud ? styles.wordCloudFocus : ""} ${showPoll ? styles.pollFocus : ""} ${showQuiz ? styles.quizFocus : ""}`}>
        {sessionFinished ? (
          <div className={styles.waiting}>
            <span className={styles.eyebrow}>SESSÃO ENCERRADA</span>
            <h1>A aula foi finalizada</h1>
            <p>O modo projetor pode ser fechado com segurança.</p>
          </div>
        ) : showDraw ? (
          <div className={styles.drawStage}>
            <span className={styles.eyebrow}>SORTEIO</span>
            <p>Aluno sorteado</p>
            <h1>{liveStage.primary.displayName}</h1>
            {showTimerOverlay && timer && status && (
              <div className={styles.miniTimer}>
                <span>{timer.title}</span>
                <strong>{formatTimer(remaining)}</strong>
              </div>
            )}
          </div>
        ) : showSlide && preparedStep?.slideContent ? (
          <div className={styles.preparedStage}>
            <div className={styles.preparedHeading}>
              <div>
                <span className={styles.eyebrow}>ROTEIRO AO VIVO · SLIDE</span>
                <h1>{preparedStep.title || "Conteúdo da aula"}</h1>
                {preparedStep.instructions && <p>{preparedStep.instructions}</p>}
              </div>
              {showTimerOverlay && timer && status && (
                <div className={styles.miniTimer}>
                  <span>{timer.title}</span>
                  <strong>{formatTimer(remaining)}</strong>
                </div>
              )}
            </div>
            <div className={styles.slideContent}>
              {slideLines(preparedStep.slideContent).map((line, index) => {
                if (line.startsWith("### ")) return <h3 key={`${index}-${line}`}>{line.slice(4)}</h3>;
                if (line.startsWith("## ")) return <h2 key={`${index}-${line}`}>{line.slice(3)}</h2>;
                if (line.startsWith("# ")) return <h2 key={`${index}-${line}`}>{line.slice(2)}</h2>;
                if (line.startsWith("- ")) return <p className={styles.slideBullet} key={`${index}-${line}`}>• {line.slice(2)}</p>;
                return <p key={`${index}-${line}`}>{line}</p>;
              })}
            </div>
          </div>
        ) : showQuestion && preparedStep?.question ? (
          <div className={styles.preparedStage}>
            <div className={styles.preparedHeading}>
              <div>
                <span className={styles.eyebrow}>ROTEIRO AO VIVO · QUESTÃO</span>
                <h1>{preparedStep.question.statement}</h1>
                {preparedStep.instructions && <p>{preparedStep.instructions}</p>}
              </div>
              {showTimerOverlay && timer && status && (
                <div className={styles.miniTimer}>
                  <span>{timer.title}</span>
                  <strong>{formatTimer(remaining)}</strong>
                </div>
              )}
            </div>
            {preparedStep.question.code && (
              <pre className={styles.questionCode}><code>{preparedStep.question.code}</code></pre>
            )}
            {preparedStep.question.options.length > 0 && (
              <div className={styles.questionOptions}>
                {preparedStep.question.options.map((option, index) => (
                  <div key={option.id}>
                    <b>{String.fromCharCode(65 + index)}</b>
                    <span>{option.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : showQuiz && quizRound?.question ? (
          <div className={styles.quizStage}>
            <div className={styles.quizTop}>
              <div>
                <span className={styles.eyebrow}>QUIZ AO VIVO</span>
                <h1>{quizRound.question.statement}</h1>
              </div>
              <div className={styles.quizMeta}>
                <strong>{quizRound.totalAnswers} resposta(s)</strong>
                <span>
                  {quizRound.status === "OPEN"
                    ? "RESPONDENDO"
                    : quizRound.status === "LOCKED"
                      ? "BLOQUEADO"
                      : quizRound.status === "REVEALED"
                        ? "REVELADO"
                        : "ENCERRADO"}
                </span>
              </div>
            </div>

            {showTimerOverlay && timer && status && (
              <div className={styles.miniTimer}>
                <span>{timer.title}</span>
                <strong>{formatTimer(remaining)}</strong>
              </div>
            )}

            {quizRound.question.code && (
              <pre className={styles.questionCode}><code>{quizRound.question.code}</code></pre>
            )}

            {quizRound.publicResultsVisible ? (
              <div className={styles.quizResults}>
                {quizRound.distribution.map((option, index) => {
                  const correct = quizOptionMatchesAnswer(option.optionId, quizRound.correctAnswer);
                  return (
                    <div
                      className={`${styles.quizOption} ${correct ? styles.quizCorrect : ""}`}
                      key={option.optionId}
                    >
                      <div className={styles.quizOptionHead}>
                        <span>
                          <b>
                            {quizRound.question?.type === "TRUE_FALSE"
                              ? (option.optionId === "true" ? "V" : "F")
                              : String.fromCharCode(65 + index)}
                          </b>
                          {option.label}
                          {correct && <em>RESPOSTA CORRETA</em>}
                        </span>
                        <strong>{option.answerCount ?? 0} · {(option.percentage ?? 0).toFixed(0)}%</strong>
                      </div>
                      <div className={styles.quizBar}>
                        <span style={{ width: `${option.percentage ?? 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.quizProtected}>
                <div className={styles.quizChoices}>
                  {quizRound.question.options.map((option, index) => (
                    <div key={option.id}>
                      <b>
                        {quizRound.question?.type === "TRUE_FALSE"
                          ? (option.id === "true" ? "V" : "F")
                          : String.fromCharCode(65 + index)}
                      </b>
                      <span>{option.text}</span>
                    </div>
                  ))}
                </div>
                <strong>Resultados protegidos</strong>
                <p>O professor ainda não revelou a distribuição nem a resposta correta.</p>
                <span>{quizRound.totalAnswers} resposta(s) recebida(s)</span>
              </div>
            )}
          </div>
        ) : showBoss ? (
          <div className={styles.bossStage}>
            <span className={styles.eyebrow}>BOSS BATTLE</span>
            <h1>{bossState?.name || "Desafio em andamento"}</h1>
            {bossState ? (
              <div className="public-live-boss">
                <div className="public-live-boss__meta">
                  <strong>{bossState.currentHp} HP</strong>
                  <span>de {bossState.maxHp} HP</span>
                </div>
                <div className="public-live-boss__track" aria-label={`${bossState.currentHp} de ${bossState.maxHp} pontos de vida`}>
                  <span style={{ "--boss-progress": `${Math.max(0, Math.min(100, (bossState.currentHp / bossState.maxHp) * 100))}%` } as React.CSSProperties} />
                </div>
                {bossState.currentHp === 0 && <div className="public-live-boss__defeated">BOSS DERROTADO · objetivo coletivo concluído</div>}
              </div>
            ) : (
              <p>O Boss está ativo na Arena. O professor controla o progresso e a pontuação.</p>
            )}
            {showTimerOverlay && timer && status && (
              <div className={styles.miniTimer}>
                <span>{timer.title}</span>
                <strong>{formatTimer(remaining)}</strong>
              </div>
            )}
          </div>
        ) : showBuzzer ? (
          <div className={styles.buzzerStage}>
            <div className={styles.buzzerHeading}>
              <div>
                <span className={styles.eyebrow}>BUZZER</span>
                <h1>{buzzerState.status === "OPEN" ? "Valendo!" : buzzerState.status === "CLOSED" ? "Rodada encerrada" : "Aguardando rodada"}</h1>
              </div>
              {showTimerOverlay && timer && status && (
                <div className={styles.miniTimer}>
                  <span>{timer.title}</span>
                  <strong>{formatTimer(remaining)}</strong>
                </div>
              )}
            </div>
            {buzzerState.presses.length > 0 ? (
              <div className={styles.buzzerRanking}>
                {buzzerState.presses.slice(0, 8).map((press) => (
                  <div key={`${press.position}-${press.receivedAt}`} className={press.position === 1 ? styles.buzzerWinner : undefined}>
                    <b>#{press.position}</b>
                    <strong>{press.displayName}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.buzzerWaiting}>
                <strong>{buzzerState.status === "OPEN" ? "Aguardando o primeiro clique" : "O professor abrirá a próxima rodada."}</strong>
              </div>
            )}
          </div>
        ) : showWordCloud && wordCloudRound ? (
          <div className={styles.wordCloudStage}>
            <div className={styles.wordCloudTop}>
              <div>
                <span className={styles.eyebrow}>NUVEM DE PALAVRAS</span>
                <h1>{wordCloudRound.prompt}</h1>
              </div>
              <div className={styles.wordCloudTopMeta}>
                <span className={`${styles.wordCloudStatus} ${styles[wordCloudRound.status.toLowerCase()]}`}>
                  {wordCloudStatusLabel(wordCloudRound.status)}
                </span>
                <small>
                  {wordCloudRound.participantCount} responderam · {wordCloudRound.submissionCount} respostas
                </small>
              </div>
            </div>

            {showTimerOverlay && timer && status && (
              <div className={styles.miniTimer}>
                <span>{timer.title}</span>
                <strong>{formatTimer(remaining)}</strong>
              </div>
            )}

            <div className={styles.wordCloudCanvas}>
              {wordCloudRound.terms.length > 0 ? (
                wordCloudRound.terms.map((term) => (
                  <span
                    key={term.normalizedText}
                    className={styles.wordCloudTerm}
                    style={{
                      fontSize: `${wordCloudFontSize(term.count, maxWordCount)}px`,
                      fontWeight: term.count === maxWordCount ? 900 : 720,
                    }}
                    title={`${term.count} ocorrência(s)`}
                  >
                    {term.text}
                  </span>
                ))
              ) : wordCloudRound.status === "COLLECTING" && !wordCloudRound.liveReveal ? (
                <div className={styles.wordCloudCollecting}>
                  <strong>Respostas sendo coletadas</strong>
                  <p>As palavras permanecem protegidas até o professor revelar a nuvem.</p>
                  <span>{wordCloudRound.participantCount} aluno(s) já participaram</span>
                </div>
              ) : (
                <div className={styles.wordCloudCollecting}>
                  <strong>Aguardando respostas</strong>
                  <p>As palavras aparecerão aqui conforme a turma participar.</p>
                </div>
              )}
            </div>

            <div className={styles.wordCloudLegend}>
              <span>Quanto maior a repetição, maior o destaque da palavra.</span>
              {wordCloudRound.status === "CLOSED" && <strong>Rodada encerrada</strong>}
            </div>
          </div>
        ) : showPoll && pollRound ? (
          <div className={styles.pollStage}>
            <div className={styles.pollTop}>
              <div><span className={styles.eyebrow}>VOTAÇÃO</span><h1>{pollRound.prompt}</h1></div>
              <div className={styles.pollMeta}><strong>{pollRound.totalVotes} voto(s)</strong><span>{pollRound.status === "OPEN" ? "ABERTA" : pollRound.status === "REVEALED" ? "REVELADA" : "ENCERRADA"}</span></div>
            </div>
            {showTimerOverlay && timer && status && <div className={styles.miniTimer}><span>{timer.title}</span><strong>{formatTimer(remaining)}</strong></div>}
            {pollRound.publicResultsVisible ? (
              <div className={styles.pollResults}>
                {pollRound.options.map((option) => <div className={styles.pollOption} key={option.id}>
                  <div><span>{String.fromCharCode(65 + option.position)}. {option.label}</span><strong>{option.voteCount ?? 0} · {(option.percentage ?? 0).toFixed(0)}%</strong></div>
                  <div className={styles.pollBar}><span style={{ width: `${option.percentage ?? 0}%` }}/></div>
                </div>)}
              </div>
            ) : (
              <div className={styles.pollProtected}><strong>Votação em andamento</strong><p>Os resultados serão revelados pelo professor.</p><span>{pollRound.totalVotes} voto(s) recebido(s)</span></div>
            )}
          </div>
        ) : showTimerPrimary && timer ? (
          <div className={styles.timerStage}>
            <span className={`${styles.status} ${styles[status?.toLowerCase() ?? "ready"]}`}>
              <i />
              {status ? timerStatusLabel(status) : "Pronto"}
            </span>
            <div className={styles.clock}>{formatTimer(remaining)}</div>
            <h1>{timer.title}</h1>
            {timer.instructions && <p>{timer.instructions}</p>}
            <div className={styles.progress} aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className={styles.waiting}>
            <span className={styles.eyebrow}>AULA AO VIVO</span>
            <h1>Aguardando próxima dinâmica</h1>
            <p>Slides, questões, Sorteio, Nuvem, Poll, Buzzer e outras dinâmicas aparecerão aqui quando o professor as colocar no palco.</p>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <div>
          <span>Código da sessão</span>
          <strong>{snapshot.code}</strong>
        </div>
        <p>Alunos podem usar este código em <b>/join</b>.</p>
        <small>Visualização pública · somente leitura</small>
      </footer>

      {error && <div className={styles.floatingError}>{error}</div>}
    </main>
  );
}
