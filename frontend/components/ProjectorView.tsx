"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeJoinCode } from "@/lib/app-state";
import {
  connectProjectorSocket,
  fetchProjectorSnapshot,
  type ProjectorSnapshot,
} from "@/lib/projector-api";
import type { SessionRealtimeEvent } from "@/lib/realtime-api";
import type { TimerState } from "@/lib/timer-api";
import type { WordCloudState } from "@/lib/word-cloud-api";
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

export default function ProjectorView() {
  const [code, setCode] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [snapshot, setSnapshot] = useState<ProjectorSnapshot | null>(null);
  const [timerState, setTimerState] = useState<TimerState>({ timer: null });
  const [wordCloudState, setWordCloudState] = useState<WordCloudState>({ round: null });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [connection, setConnection] = useState<"offline" | "connecting" | "online">("offline");
  const [realtimeVersion, setRealtimeVersion] = useState(0);
  const [error, setError] = useState("");
  const [sessionFinished, setSessionFinished] = useState(false);

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
          timer: next.timer,
          serverOccurredAt: next.serverTime,
          receivedAtMs: Date.now(),
        });
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
    let reconnectTimer: number | undefined;

    const socket = connectProjectorSocket(
      snapshot.sessionId,
      code,
      (event: SessionRealtimeEvent) => {
        if (!active) return;

        if (event.type === "AUTH_OK") {
          setConnection("online");
          setError("");
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
      if (!active || finished) return;
      setConnection("offline");
      reconnectTimer = window.setTimeout(
        () => setRealtimeVersion((value) => value + 1),
        1500,
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
  const timerCanTakeFocus = Boolean(
    timer
      && status
      && !["FINISHED", "CANCELLED"].includes(status),
  );
  const showWordCloud = Boolean(
    wordCloudRound
      && (
        wordCloudRound.status !== "CLOSED"
        || !timerCanTakeFocus
      ),
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
                : "Offline"}
          </span>
          <button onClick={() => void requestFullscreen()} title="Alternar tela cheia">
            ⛶
          </button>
        </div>
      </header>

      <section className={`${styles.stage} ${showWordCloud ? styles.wordCloudFocus : ""}`}>
        {sessionFinished ? (
          <div className={styles.waiting}>
            <span className={styles.eyebrow}>SESSÃO ENCERRADA</span>
            <h1>A aula foi finalizada</h1>
            <p>O modo projetor pode ser fechado com segurança.</p>
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

            {timer && status && ["RUNNING", "PAUSED"].includes(status) && (
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
        ) : timer ? (
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
            <p>Timer, Nuvem de Palavras e outras dinâmicas aparecerão aqui automaticamente.</p>
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
