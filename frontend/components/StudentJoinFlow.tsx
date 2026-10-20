"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import StudentActivitiesPanel from "@/components/StudentActivitiesPanel";
import { recordSelfConfidence, type SelfConfidence } from "@/lib/learner-confidence-api";
import {
  connectSessionSocket,
  fetchPublicSession,
  joinRememberedDevice,
  joinSession,
  recognizeRememberedDevice,
  revokeRememberedDevice,
  type DeviceRecognition,
  type PublicSession,
  type SessionRealtimeEvent,
  type StudentJoinAccess,
} from "@/lib/realtime-api";
import { deviceClaimStorageKey, normalizeJoinCode, restoreStudentAccess, studentAccessStorageKey } from "@/lib/app-state";
import { emptyLiveStageState, type LiveStageState } from "@/lib/live-stage-api";
import {
  emptyWordCloudParticipantState,
  sendWordCloudSubmission,
  type WordCloudParticipantState,
  type WordCloudState,
} from "@/lib/word-cloud-api";
import wordStyles from "./student-join/word-cloud.module.css";
import pollStyles from "./student-join/poll.module.css";
import quizStyles from "./student-join/quiz.module.css";
import learningCheckStyles from "./student-join/learning-check.module.css";
import stepStyles from "./student-join/prepared-step.module.css";
import { emptyPollParticipantState, sendPollVote, type PollParticipantState, type PollState } from "@/lib/poll-api";
import { emptyQuizParticipantState, quizOptionMatchesAnswer, sendQuizAnswer, type QuizParticipantState, type QuizState } from "@/lib/quiz-api";
import { emptyLearningCheckParticipantState, fetchParticipantLearningCheck, submitLearningCheckAnswer, type LearningCheckParticipantSignal, type LearningCheckParticipantState } from "@/lib/learning-check-api";
import { reconnectDelayMs, type BuzzerParticipantState, type ParticipantRuntimeSnapshot, type PublicBossState, type PublicBuzzerState } from "@/lib/runtime-snapshot";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export default function StudentJoinFlow({ embedded = false, initialCode = "" }: { embedded?: boolean; initialCode?: string }) {
  const [code, setCode] = useState(() => normalizeJoinCode(initialCode));
  const [session, setSession] = useState<PublicSession | null>(null);
  const [identity, setIdentity] = useState("");
  const [access, setAccess] = useState<StudentJoinAccess | null>(null);
  const [recognizedDevice, setRecognizedDevice] = useState<DeviceRecognition | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [buzzer, setBuzzer] = useState<PublicBuzzerState>({ status: "IDLE", presses: [] });
  const [buzzerParticipant, setBuzzerParticipant] = useState<BuzzerParticipantState>({ roundId: null, position: null });
  const [boss, setBoss] = useState<PublicBossState | null>(null);
  const [wordCloud, setWordCloud] = useState<WordCloudState>({ round: null });
  const [poll, setPoll] = useState<PollState>({ round: null });
  const [quiz, setQuiz] = useState<QuizState>({ round: null });
  const [liveStage, setLiveStage] = useState<LiveStageState>(() => emptyLiveStageState());
  const [wordCloudParticipant, setWordCloudParticipant] = useState<WordCloudParticipantState>(emptyWordCloudParticipantState());
  const [pollParticipant, setPollParticipant] = useState<PollParticipantState>(emptyPollParticipantState());
  const [quizParticipant, setQuizParticipant] = useState<QuizParticipantState>(emptyQuizParticipantState());
  const [learningCheckParticipant, setLearningCheckParticipant] = useState<LearningCheckParticipantState>(emptyLearningCheckParticipantState());
  const [learningCheckSubmitting, setLearningCheckSubmitting] = useState(false);
  const [selfConfidenceSubmitting, setSelfConfidenceSubmitting] = useState(false);
  const [quizDraftAnswer, setQuizDraftAnswer] = useState<string | boolean | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [wordDraft, setWordDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [socketState, setSocketState] = useState<"offline" | "connecting" | "reconnecting" | "online">("offline");
  const [browserOnline, setBrowserOnline] = useState(true);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [reconnectVersion, setReconnectVersion] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);

  async function resolveCode(nextCode: string) {
    const normalized = normalizeJoinCode(nextCode);
    if (!normalized) return;
    if (normalized.startsWith("J-")) {
      window.location.assign(`/learn/journeys?redeem=${encodeURIComponent(normalized)}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await fetchPublicSession(normalized);
      setCode(result.code);
      setSession(result);
      const key = studentAccessStorageKey(result.code);
      const saved = window.sessionStorage.getItem(key);
      const restored = restoreStudentAccess(saved, result.sessionId);
      setAccess(restored);
      setRecognizedDevice(null);
      setDeviceToken(null);
      if (saved && !restored) window.sessionStorage.removeItem(key);
      if (!restored) {
        const claimKey = deviceClaimStorageKey(result.classroomId);
        const rememberedToken = window.localStorage.getItem(claimKey);
        if (rememberedToken) {
          try {
            const recognition = await recognizeRememberedDevice(result.code, rememberedToken);
            setRecognizedDevice(recognition);
            setDeviceToken(rememberedToken);
          } catch {
            window.localStorage.removeItem(claimKey);
          }
        }
      }
      if (!embedded) window.history.replaceState(null, "", `/join?code=${encodeURIComponent(result.code)}`);
    } catch (caught) {
      setSession(null);
      setAccess(null);
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }

  async function recoverParticipantAccess(message: string) {
    if (!session) {
      setAccess(null);
      setError(message);
      return;
    }
    window.sessionStorage.removeItem(studentAccessStorageKey(session.code));
    const rememberedToken = window.localStorage.getItem(deviceClaimStorageKey(session.classroomId));
    if (!rememberedToken) {
      setAccess(null);
      setError(`${message} Identifique-se novamente para continuar.`);
      return;
    }
    setSocketState("connecting");
    try {
      const nextAccess = await joinRememberedDevice(session.code, rememberedToken);
      window.sessionStorage.setItem(studentAccessStorageKey(session.code), JSON.stringify(nextAccess));
      setDeviceToken(rememberedToken);
      setAccess(nextAccess);
      setError("");
    } catch {
      window.localStorage.removeItem(deviceClaimStorageKey(session.classroomId));
      setDeviceToken(null);
      setAccess(null);
      setError(`${message} Identifique-se novamente para continuar.`);
    }
  }

  useEffect(() => {
    const onOffline = () => {
      setBrowserOnline(false);
      setSocketState("offline");
      // A formerly connected socket cannot be considered authoritative while offline.
      socketRef.current?.close();
    };
    const onOnline = () => {
      setBrowserOnline(true);
      reconnectAttemptRef.current = 0;
      setReconnectVersion((value) => value + 1);
    };
    setBrowserOnline(navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const queryCode = new URLSearchParams(window.location.search).get("code");
    const entryCode = queryCode || initialCode;
    if (entryCode) void resolveCode(entryCode);
  }, [initialCode]);

  useEffect(() => {
    if (!access || sessionFinished) return;
    let active = true;
    let authFailed = false;
    let reconnectTimer: number | undefined;
    setSocketState("connecting");
    const socket = connectSessionSocket(access.sessionId, (event: SessionRealtimeEvent) => {
      if (!active) return;
      if (event.type === "AUTH_OK") {
        reconnectAttemptRef.current = 0;
        setSocketState("online");
        setError("");
      }
      if (event.type === "RUNTIME_SNAPSHOT") {
        const runtime = event.payload as ParticipantRuntimeSnapshot;
        setLiveStage(runtime.stage);
        setBuzzer(runtime.buzzer);
        setBuzzerParticipant(runtime.buzzerParticipant);
        setWordCloud(runtime.wordCloud);
        setWordCloudParticipant(runtime.wordCloudParticipant);
        setPoll(runtime.poll);
        setPollParticipant(runtime.pollParticipant);
        setQuiz(runtime.quiz);
        setQuizParticipant(runtime.quizParticipant);
        setLearningCheckParticipant(runtime.learningCheckParticipant ?? emptyLearningCheckParticipantState());
        setBoss(runtime.boss ?? null);
      }
      if (event.type === "LIVE_STAGE_STATE") setLiveStage(event.payload as LiveStageState);
      if (event.type === "BUZZER_STATE") setBuzzer(event.payload as PublicBuzzerState);
      if (event.type === "BUZZER_PARTICIPANT_STATE") setBuzzerParticipant(event.payload as BuzzerParticipantState);
      if (event.type === "BOSS_STATE") setBoss(event.payload as PublicBossState);
      if (event.type === "WORD_CLOUD_STATE") {
        const state = event.payload as WordCloudState;
        setWordCloud(state);
        setWordCloudParticipant((current) => {
          const round = state.round;
          if (!round || current.roundId === round.id) return current;
          return {
            roundId: round.id,
            canSubmit: round.status === "COLLECTING",
            maxWords: round.maxWordsPerParticipant,
            remainingWords: round.status === "COLLECTING" ? round.maxWordsPerParticipant : 0,
            submittedWords: [],
          };
        });
      }
      if (event.type === "WORD_CLOUD_PARTICIPANT_STATE") {
        setWordCloudParticipant(event.payload as WordCloudParticipantState);
      }
      if (event.type === "POLL_STATE") {
        const state = event.payload as PollState;
        setPoll(state);
        setPollParticipant((current) => state.round && current.roundId !== state.round.id
          ? { roundId: state.round.id, canVote: state.round.status !== "CLOSED", selectedOptionId: null }
          : current);
      }
      if (event.type === "POLL_PARTICIPANT_STATE") {
        setPollParticipant(event.payload as PollParticipantState);
      }
      if (event.type === "LEARNING_CHECK_STATE") {
        const signal = event.payload as LearningCheckParticipantSignal;
        if (signal?.runId) {
          void fetchParticipantLearningCheck(access.code, access.token)
            .then(setLearningCheckParticipant)
            .catch((caught) => setError(messageOf(caught)));
        }
      }
      if (event.type === "QUIZ_STATE") {
        const state = event.payload as QuizState;
        setQuiz(state);
        setQuizParticipant((current) => {
          const round = state.round;
          if (!round) return emptyQuizParticipantState();
          if (current.roundId !== round.id) {
            return {
              ...emptyQuizParticipantState(),
              roundId: round.id,
              status: round.status,
              canAnswer: round.status === "OPEN",
              resultsVisible: round.publicResultsVisible,
              correctAnswer: round.publicResultsVisible ? round.correctAnswer : null,
            };
          }
          return {
            ...current,
            status: round.status,
            canAnswer: round.status === "OPEN",
            resultsVisible: round.publicResultsVisible,
            correctAnswer: round.publicResultsVisible ? round.correctAnswer : null,
          };
        });
      }
      if (event.type === "SESSION_FINISHED") {
        setSessionFinished(true);
        window.sessionStorage.removeItem(studentAccessStorageKey(access.code));
        setBuzzer({ status: "CLOSED", presses: [] });
        setPollParticipant(emptyPollParticipantState());
        setQuizParticipant(emptyQuizParticipantState());
        setLearningCheckParticipant(emptyLearningCheckParticipantState());
      }
      if (event.type === "AUTH_FAILED") {
        authFailed = true;
        setSocketState("offline");
        const payload = event.payload as { message?: string };
        void recoverParticipantAccess(payload?.message || "Sua identificação temporária expirou.");
      }
      if (event.type === "ERROR") {
        const payload = event.payload as { message?: string };
        setError(payload?.message || "Erro na conexão em tempo real.");
      }
    }, access.token);
    socketRef.current = socket;
    socket.onopen = () => { if (active) setSocketState("connecting"); };
    socket.onerror = () => { if (active && !authFailed) setSocketState("reconnecting"); };
    socket.onclose = (event) => {
      if (!active || authFailed) return;
      if (event.code === 1008) {
        authFailed = true;
        setSocketState("offline");
        void recoverParticipantAccess(event.reason || "Sua identificação temporária expirou.");
        return;
      }
      if (!navigator.onLine) {
        setSocketState("offline");
        return; // Wait for the online event; don't hammer the backend while disconnected.
      }
      setSocketState("reconnecting");
      const delay = reconnectDelayMs(reconnectAttemptRef.current);
      reconnectAttemptRef.current += 1;
      reconnectTimer = window.setTimeout(() => setReconnectVersion((value) => value + 1), delay);
    };
    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketRef.current = null;
      socket.close();
    };
  }, [access?.sessionId, access?.token, sessionFinished, reconnectVersion]);

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    await resolveCode(code);
  }

  async function submitIdentity(event: FormEvent) {
    event.preventDefault();
    if (!session || !identity.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await joinSession(session.code, identity.trim(), rememberDevice);
      window.sessionStorage.setItem(studentAccessStorageKey(session.code), JSON.stringify(result.access));
      if (result.deviceToken) {
        window.localStorage.setItem(deviceClaimStorageKey(session.classroomId), result.deviceToken);
        setDeviceToken(result.deviceToken);
      }
      setRecognizedDevice(null);
      setAccess(result.access);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }

  async function enterRememberedDevice() {
    if (!session || !deviceToken) return;
    setLoading(true);
    setError("");
    try {
      const result = await joinRememberedDevice(session.code, deviceToken);
      window.sessionStorage.setItem(studentAccessStorageKey(session.code), JSON.stringify(result));
      setAccess(result);
      setRecognizedDevice(null);
    } catch (caught) {
      window.localStorage.removeItem(deviceClaimStorageKey(session.classroomId));
      setRecognizedDevice(null);
      setDeviceToken(null);
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }

  function forgetRememberedDevice() {
    if (!session) return;
    const token = deviceToken;
    window.localStorage.removeItem(deviceClaimStorageKey(session.classroomId));
    setRecognizedDevice(null);
    setDeviceToken(null);
    if (token) void revokeRememberedDevice(token).catch(() => undefined);
  }

  function reconnectNow() {
    if (!access || sessionFinished || !navigator.onLine) return;
    reconnectAttemptRef.current = 0;
    setError("");
    setSocketState("connecting");
    setReconnectVersion((value) => value + 1);
  }

  function pressBuzzer() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || buzzer.status !== "OPEN") return;
    socket.send(JSON.stringify({ type: "BUZZER_PRESS" }));
  }

  function submitWord(event: FormEvent) {
    event.preventDefault();
    const socket = socketRef.current;
    const value = wordDraft.trim();
    if (!socket || !value || !wordCloud.round || wordCloud.round.status !== "COLLECTING") return;
    if (!sendWordCloudSubmission(socket, [value])) {
      setError("A conexão em tempo real ainda não está pronta.");
      return;
    }
    setWordDraft("");
  }

  function votePoll(optionId: string) {
    const socket = socketRef.current;
    if (!socket || !poll.round || !pollParticipant.canVote) return;
    if (!sendPollVote(socket, optionId)) {
      setError("A conexão em tempo real ainda não está pronta.");
    }
  }

  async function answerQuiz(answer: string | boolean) {
    if (!access || !quiz.round || !quizParticipant.canAnswer || quizSubmitting) return;
    const previousAnswer = quizParticipant.answer;
    setQuizDraftAnswer(answer);
    setQuizSubmitting(true);
    setError("");
    try {
      const participantState = await sendQuizAnswer(access.code, quiz.round.id, access.token, answer);
      setQuizParticipant(participantState);
      setQuizDraftAnswer(participantState.answer);
    } catch (caught) {
      setQuizDraftAnswer(previousAnswer);
      setError(messageOf(caught));
    } finally {
      setQuizSubmitting(false);
    }
  }

  async function submitSelfConfidence(level: SelfConfidence) {
    if (!access || !learningCheckParticipant.runId || !learningCheckParticipant.answered
        || !learningCheckParticipant.acceptsResponses || !browserOnline || selfConfidenceSubmitting) return;
    const runId = learningCheckParticipant.runId;
    setSelfConfidenceSubmitting(true);
    setError("");
    try {
      const recorded = await recordSelfConfidence(access.code, runId, access.token, level);
      setLearningCheckParticipant((current) => current.runId === runId
        ? { ...current, selfConfidence: recorded.level } : current);
    } catch (cause) { setError(messageOf(cause)); }
    finally { setSelfConfidenceSubmitting(false); }
  }

  async function answerLearningCheck(optionKey: string) {
    if (!access || !learningCheckParticipant.runId
        || !learningCheckParticipant.acceptsResponses || learningCheckSubmitting) return;
    setLearningCheckSubmitting(true);
    setError("");
    try {
      const next = await submitLearningCheckAnswer(
        access.code,
        learningCheckParticipant.runId,
        access.token,
        optionKey,
      );
      setLearningCheckParticipant(next);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLearningCheckSubmitting(false);
    }
  }

  const myPress = useMemo(
    () => buzzerParticipant.roundId && buzzerParticipant.roundId === buzzer.roundId && buzzerParticipant.position
      ? { position: buzzerParticipant.position }
      : undefined,
    [buzzer.roundId, buzzerParticipant.roundId, buzzerParticipant.position],
  );
  const winner = buzzer.presses[0];
  const activeQuizRound = quiz.round;
  const activeQuizQuestion = activeQuizRound?.question ?? null;

  useEffect(() => {
    setQuizDraftAnswer(null);
  }, [activeQuizRound?.id]);

  return (
    <main className="student-join-shell">
      <section className="student-join-card">
        {!embedded && <div className="student-brand"><span>A</span><div><strong>ARENA DEV</strong><small>Participação ao vivo</small></div></div>}

        {!session && (
          <form className="student-join-form" onSubmit={submitCode}>
            <div className="student-join-heading"><span>ENTRAR</span><h1>Código de acesso</h1><p>Use o código da aula ao vivo ou o código J-... de uma Jornada compartilhada pelo professor.</p></div>
            <input className="student-code-input" aria-label="Código da sessão" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={8} placeholder="ABC123" autoFocus />
            <button className="student-primary-button" disabled={loading || !code.trim()}>{loading ? "Validando..." : "Continuar"}</button>
          </form>
        )}

        {session && !access && recognizedDevice && (
          <div className="student-join-form">
            <button type="button" className="student-back-button" onClick={() => { setSession(null); setCode(""); setRecognizedDevice(null); setDeviceToken(null); }}>← trocar código</button>
            <div className="student-session-context"><span>{session.classroomName}</span><strong>{session.sessionTitle}</strong><small>Código {session.code}</small></div>
            <div className="student-join-heading"><span>DISPOSITIVO RECONHECIDO</span><h1>Entrar como {recognizedDevice.displayName}?</h1><p>Este dispositivo foi lembrado nesta turma. A aula atual ainda receberá um token temporário próprio.</p></div>
            <button type="button" className="student-primary-button" disabled={loading} onClick={() => void enterRememberedDevice()}>{loading ? "Entrando..." : `Entrar como ${recognizedDevice.displayName}`}</button>
            <button type="button" className="student-secondary-button" disabled={loading} onClick={forgetRememberedDevice}>Não sou {recognizedDevice.displayName}</button>
          </div>
        )}

        {session && !access && !recognizedDevice && (
          <form className="student-join-form" onSubmit={submitIdentity}>
            <button type="button" className="student-back-button" onClick={() => { setSession(null); setCode(""); setDeviceToken(null); }}>← trocar código</button>
            <div className="student-session-context"><span>{session.classroomName}</span><strong>{session.sessionTitle}</strong><small>Código {session.code}</small></div>
            <div className="student-join-heading"><span>IDENTIFICAÇÃO</span><h1>Quem é você?</h1><p>Use sua matrícula, nome completo ou nome de exibição cadastrado na turma.</p></div>
            <input className="student-identity-input" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="Matrícula ou nome" autoFocus />
            <label className="student-remember-device"><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} /><span><strong>Lembrar neste dispositivo</strong><small>Salva apenas um identificador opaco; seu nome continua no servidor.</small></span></label>
            <button className="student-primary-button" disabled={loading || !identity.trim()}>{loading ? "Entrando..." : "Entrar na sessão"}</button>
          </form>
        )}

        {session && access && (
          <div className="student-live-view">
            <div className="student-live-top">
              <div><span className="student-live-kicker">{access.classroomName}</span><h1>{access.displayName}</h1><p>{access.sessionTitle}</p></div>
              <span className={`student-connection ${socketState}`} role="status" aria-live="polite"><i aria-hidden="true" />{socketState === "online" ? "Conectado" : socketState === "connecting" ? "Conectando…" : socketState === "reconnecting" ? "Reconectando…" : "Offline"}</span>
            </div>

            {!browserOnline && (
              <div className="student-network-warning" role="status">
                <strong>Sem internet</strong>
                <span>
                  A interface continua disponível, mas respostas e o estado da aula dependem do servidor.
                </span>
              </div>
            )}

            {browserOnline && (socketState === "reconnecting" || socketState === "offline") && (
              <div className="public-live-reconnect" role="status">
                <span>
                  Conexão interrompida. Mantendo apenas a interface enquanto buscamos o estado autoritativo.
                </span>
                <button type="button" onClick={reconnectNow}>Tentar agora</button>
              </div>
            )}

            <StudentActivitiesPanel access={access} disabled={sessionFinished || !browserOnline} />

            {!sessionFinished && liveStage.primary.type === "QUESTION" && liveStage.primary.step?.question && (
              <section className={stepStyles.card}>
                <div className={stepStyles.heading}>
                  <span>QUESTÃO · ROTEIRO AO VIVO</span>
                  <h2>{liveStage.primary.step.question.statement}</h2>
                </div>
                {liveStage.primary.step.instructions && (
                  <p className={stepStyles.instructions}>{liveStage.primary.step.instructions}</p>
                )}
                {liveStage.primary.step.question.code && (
                  <pre className={stepStyles.code}><code>{liveStage.primary.step.question.code}</code></pre>
                )}
                {liveStage.primary.step.question.options.length > 0 && (
                  <div className={stepStyles.options}>
                    {liveStage.primary.step.question.options.map((option, index) => (
                      <div className={stepStyles.option} key={option.id}>
                        <b>{String.fromCharCode(65 + index)}</b>
                        <span>{option.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {!sessionFinished && liveStage.primary.type === "QUIZ" && activeQuizRound && activeQuizQuestion && (
              <section className={`${quizStyles.card} ${quizSubmitting ? quizStyles.submitting : ""}`}>
                <div className={quizStyles.heading}>
                  <div>
                    <span>QUIZ AO VIVO</span>
                    <h2>{activeQuizQuestion.statement}</h2>
                  </div>
                  <strong>
                    {activeQuizRound.status === "OPEN"
                      ? "RESPONDENDO"
                      : activeQuizRound.status === "LOCKED"
                        ? "BLOQUEADO"
                        : activeQuizRound.status === "REVEALED"
                          ? "REVELADO"
                          : activeQuizRound.status === "CLOSED"
                            ? "ENCERRADO"
                            : "PREPARADO"}
                  </strong>
                </div>

                {activeQuizQuestion.code && (
                  <pre className={quizStyles.code}><code>{activeQuizQuestion.code}</code></pre>
                )}

                <p className={quizStyles.hint}>
                  {activeQuizRound.status === "OPEN"
                    ? "Selecione sua resposta. Enquanto a rodada estiver aberta, você pode alterar sua escolha."
                    : quizParticipant.answered
                      ? "Sua resposta foi registrada. Aguarde a condução do professor."
                      : "As respostas desta rodada não estão mais abertas."}
                </p>

                {quizParticipant.answered && (
                  <div className={quizStyles.done}>
                    Resposta registrada
                    {activeQuizRound.status === "OPEN"
                      ? " · você ainda pode alterar sua escolha."
                      : " · sua escolha está bloqueada."}
                  </div>
                )}

                <div className={quizStyles.options} role="radiogroup" aria-label="Alternativas da questão">
                  {activeQuizQuestion.options.map((option, index) => {
                    const answer: string | boolean = activeQuizQuestion.type === "TRUE_FALSE"
                      ? option.id === "true"
                      : option.id;
                    const selected = quizOptionMatchesAnswer(option.id, quizDraftAnswer ?? quizParticipant.answer);
                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={`${quizStyles.option} ${selected ? quizStyles.selected : ""}`}
                        disabled={!quizParticipant.canAnswer || quizSubmitting || !browserOnline}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => void answerQuiz(answer)}
                      >
                        <span className={quizStyles.letter}>
                          {activeQuizQuestion.type === "TRUE_FALSE"
                            ? (option.id === "true" ? "V" : "F")
                            : String.fromCharCode(65 + index)}
                        </span>
                        <span>{option.text}</span>
                      </button>
                    );
                  })}
                </div>

                {!quizParticipant.resultsVisible && (
                  <div className={quizStyles.protected}>
                    A correção permanece protegida até o professor revelar o resultado.
                  </div>
                )}

                <div className={quizStyles.meta}>
                  <span>{activeQuizRound.totalAnswers} resposta(s) recebida(s)</span>
                  <span>{activeQuizQuestion.points} XP previsto(s) na questão</span>
                </div>
              </section>
            )}

            {!sessionFinished
              && liveStage.primary.type === "LEARNING_CHECK"
              && learningCheckParticipant.runId === liveStage.primary.sourceId
              && (
                <section className={`${learningCheckStyles.card} ${learningCheckSubmitting ? learningCheckStyles.submitting : ""}`}>
                  <div className={learningCheckStyles.heading}>
                    <div>
                      <span>VERIFICAR APRENDIZAGEM</span>
                      <h2>{learningCheckParticipant.prompt || "Verificação em andamento"}</h2>
                    </div>
                    <strong>
                      {learningCheckParticipant.resultsVisiblePublicly
                        ? "CORREÇÃO"
                        : learningCheckParticipant.acceptsResponses
                          ? "RESPONDENDO"
                          : learningCheckParticipant.status === "CLOSED"
                            ? "ENCERRADA"
                            : "BLOQUEADA"}
                    </strong>
                  </div>

                  {learningCheckParticipant.learningTargetTitle && (
                    <span className={learningCheckStyles.target}>
                      {learningCheckParticipant.learningTargetTitle}
                    </span>
                  )}

                  <p className={learningCheckStyles.hint}>
                    {learningCheckParticipant.acceptsResponses
                      ? "Escolha uma alternativa. Enquanto a verificação estiver aberta, você pode alterar sua resposta."
                      : learningCheckParticipant.answered
                        ? "Sua resposta está registrada. Aguarde a condução do professor."
                        : "As respostas não estão mais abertas."}
                  </p>

                  {learningCheckParticipant.answered && !learningCheckParticipant.resultsVisiblePublicly && (
                    <div className={learningCheckStyles.done}>
                      Resposta registrada
                      {learningCheckParticipant.acceptsResponses
                        ? " · você ainda pode alterar sua escolha."
                        : " · sua escolha está bloqueada."}
                    </div>
                  )}

                  <div className={learningCheckStyles.options} role="radiogroup" aria-label="Alternativas da verificação">
                    {learningCheckParticipant.options.map((option) => {
                      const selected = learningCheckParticipant.selectedOptionKey === option.key;
                      const correct = learningCheckParticipant.resultsVisiblePublicly
                        && learningCheckParticipant.correctOptionKey === option.key;
                      const incorrect = learningCheckParticipant.resultsVisiblePublicly
                        && selected
                        && !correct;
                      return (
                        <button
                          type="button"
                          key={option.key}
                          className={[
                            learningCheckStyles.option,
                            selected ? learningCheckStyles.selected : "",
                            correct ? learningCheckStyles.correct : "",
                            incorrect ? learningCheckStyles.incorrect : "",
                          ].filter(Boolean).join(" ")}
                          disabled={!learningCheckParticipant.acceptsResponses || learningCheckSubmitting || !browserOnline}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => void answerLearningCheck(option.key)}
                        >
                          <span className={learningCheckStyles.letter}>{option.key.toUpperCase()}</span>
                          <span>{option.label}</span>
                          {correct && <span className={learningCheckStyles.marker}>correta</span>}
                          {incorrect && <span className={learningCheckStyles.marker}>sua resposta</span>}
                        </button>
                      );
                    })}
                  </div>

                  {learningCheckParticipant.answered && (
                    <fieldset className={learningCheckStyles.confidence}>
                      <legend>Como você se sentiu ao responder? (opcional)</legend>
                      <p>Esta percepção é privada, não vale pontos e não substitui a correção.</p>
                      <div className={learningCheckStyles.confidenceOptions}>
                        {([
                          ["LOW", "Pouca confiança"],
                          ["MEDIUM", "Confiança média"],
                          ["HIGH", "Muita confiança"],
                          ["SKIPPED", "Prefiro não informar"],
                        ] as const).map(([value, label]) => (
                          <button key={value} type="button" aria-pressed={learningCheckParticipant.selfConfidence === value}
                            disabled={!learningCheckParticipant.acceptsResponses || selfConfidenceSubmitting || !browserOnline}
                            onClick={() => { void submitSelfConfidence(value); }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {learningCheckParticipant.selfConfidence && <p role="status">Percepção registrada. Nenhuma pontuação foi alterada.</p>}
                    </fieldset>
                  )}

                  {learningCheckParticipant.resultsVisiblePublicly ? (
                    <div className={`${learningCheckStyles.feedback} ${learningCheckParticipant.answered
                      && learningCheckParticipant.selectedOptionKey !== learningCheckParticipant.correctOptionKey
                      ? learningCheckStyles.wrong
                      : ""}`}>
                      {!learningCheckParticipant.answered
                        ? "A correção foi revelada. Você não registrou resposta nesta verificação."
                        : learningCheckParticipant.selectedOptionKey === learningCheckParticipant.correctOptionKey
                          ? "Resposta correta. Esta checagem foi registrada como evidência de aprendizagem."
                          : "Sua resposta não corresponde à alternativa correta. Use o resultado para revisar o conceito."}
                    </div>
                  ) : (
                    <div className={learningCheckStyles.protected}>
                      A correção permanece protegida até o professor revelar o resultado.
                    </div>
                  )}
                </section>
              )}

            {!sessionFinished
              && liveStage.primary.type === "LEARNING_CHECK"
              && learningCheckParticipant.runId !== liveStage.primary.sourceId
              && (
                <div className={wordStyles.waiting} role="status">
                  <span>VERIFICAR APRENDIZAGEM</span>
                  <strong>Sincronizando a verificação</strong>
                  <p>Carregando seu estado individual de resposta.</p>
                </div>
              )}

            {!sessionFinished && liveStage.primary.type === "WORD_CLOUD" && wordCloud.round && (
              <section className={wordStyles.card}>
                <div className={wordStyles.heading}>
                  <div>
                    <span>NUVEM DE PALAVRAS</span>
                    <h2>{wordCloud.round.prompt}</h2>
                  </div>
                  <strong>{wordCloud.round.status === "COLLECTING" ? "COLETANDO" : wordCloud.round.status === "REVEALED" ? "REVELADA" : "ENCERRADA"}</strong>
                </div>

                {wordCloud.round.status === "COLLECTING" ? (
                  <>
                    <p className={wordStyles.hint}>
                      Envie uma palavra ou expressão por vez. Você pode participar até {wordCloud.round.maxWordsPerParticipant} vez(es).
                    </p>
                    {wordCloudParticipant.roundId === wordCloud.round.id && wordCloudParticipant.submittedWords.length > 0 && (
                      <div className={wordStyles.sentWords}>
                        {wordCloudParticipant.submittedWords.map((word) => <span key={word}>{word}</span>)}
                      </div>
                    )}
                    {(wordCloudParticipant.roundId !== wordCloud.round.id || wordCloudParticipant.canSubmit) ? (
                      <form className={wordStyles.form} onSubmit={submitWord}>
                        <input
                          value={wordDraft}
                          onChange={(event) => setWordDraft(event.target.value)}
                          maxLength={60}
                          placeholder="Sua palavra ou expressão"
                          disabled={socketState !== "online"}
                        />
                        <button disabled={!wordDraft.trim() || socketState !== "online"}>Enviar</button>
                      </form>
                    ) : (
                      <div className={wordStyles.done}>Envio concluído. Aguarde o professor revelar ou encerrar a rodada.</div>
                    )}
                    <small className={wordStyles.remaining}>
                      {wordCloudParticipant.roundId === wordCloud.round.id
                        ? `${wordCloudParticipant.remainingWords} envio(s) restante(s)`
                        : `${wordCloud.round.maxWordsPerParticipant} envio(s) disponível(is)`}
                    </small>
                  </>
                ) : (
                  <>
                    <p className={wordStyles.hint}>
                      {wordCloud.round.status === "REVEALED" ? "As respostas da turma foram reveladas." : "Esta rodada foi encerrada."}
                    </p>
                    {wordCloud.round.terms.length > 0 && (
                      <div className={wordStyles.terms}>
                        {wordCloud.round.terms.slice(0, 12).map((term) => (
                          <span key={term.normalizedText}>{term.text}<b>×{term.count}</b></span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {!sessionFinished && liveStage.primary.type === "POLL" && poll.round && (
              <section className={pollStyles.card}>
                <div className={pollStyles.heading}>
                  <div><span>VOTAÇÃO</span><h2>{poll.round.prompt}</h2></div>
                  <strong>{poll.round.status === "OPEN" ? "ABERTA" : poll.round.status === "REVEALED" ? "REVELADA" : "ENCERRADA"}</strong>
                </div>
                {pollParticipant.selectedOptionId && <div className={pollStyles.done}>Seu voto foi registrado. Você pode acompanhar o estado desta rodada aqui.</div>}
                <div className={pollStyles.options}>
                  {poll.round.options.map((option) => {
                    const selected = pollParticipant.selectedOptionId === option.id;
                    const showResult = poll.round?.publicResultsVisible && option.voteCount !== null;
                    return <div className={pollStyles.result} key={option.id}>
                      <button type="button" className={`${pollStyles.option} ${selected ? pollStyles.selected : ""}`} disabled={!pollParticipant.canVote || socketState !== "online"} onClick={() => votePoll(option.id)}>
                        <span className={pollStyles.letter}>{String.fromCharCode(65 + option.position)}</span><span>{option.label}</span>
                      </button>
                      {showResult && <><div className={pollStyles.resultHead}><span>{option.voteCount} voto(s)</span><strong>{(option.percentage ?? 0).toFixed(0)}%</strong></div><div className={pollStyles.bar}><span style={{ width: `${option.percentage ?? 0}%` }}/></div></>}
                    </div>;
                  })}
                </div>
                {!poll.round.publicResultsVisible && <div className={pollStyles.protected}>A distribuição permanece protegida até o professor revelar os resultados.</div>}
                <small className={pollStyles.total}>{poll.round.totalVotes} voto(s) registrado(s)</small>
              </section>
            )}

            {sessionFinished ? (
              <div className="student-buzzer-state finished"><strong>Sessão encerrada</strong><p>O professor encerrou esta aula.</p></div>
            ) : liveStage.primary.type === "DRAW" ? (
              <div className="student-buzzer-state open">
                <span className="student-buzzer-label">SORTEIO</span>
                <h2>{liveStage.primary.displayName || "Aluno sorteado"}</h2>
                <p>Foi chamado(a) para participar agora. Acompanhe a orientação do professor.</p>
              </div>
            ) : liveStage.primary.type === "BUZZER" ? (
              <div className={`student-buzzer-state ${buzzer.status.toLowerCase()}`}>
                <span className="student-buzzer-label">BUZZER</span>
                {buzzer.status === "OPEN" ? (
                  <>
                    <h2>{myPress ? `Você é o ${myPress.position}º` : "Valendo!"}</h2>
                    <p>{myPress ? "Seu clique já foi registrado pelo servidor." : "Toque uma vez. A ordem é registrada no backend."}</p>
                    <button className={`student-buzzer-button ${myPress ? "pressed" : ""}`} onClick={pressBuzzer} disabled={Boolean(myPress) || socketState !== "online"}>{myPress ? `#${myPress.position}` : "APERTAR"}</button>
                    {winner && <small className="student-winner-note">1º clique: {winner.displayName}</small>}
                  </>
                ) : (
                  <><h2>Rodada encerrada</h2><p>Aguarde o professor liberar a próxima dinâmica.</p>{winner && <strong className="student-round-winner">Vencedor: {winner.displayName}</strong>}</>
                )}
              </div>
            ) : liveStage.primary.type === "BOSS_BATTLE" ? (
              <div className="student-buzzer-state open">
                <span className="student-buzzer-label">BOSS BATTLE</span>
                <h2>{boss?.name || "Desafio em andamento"}</h2>
                {boss ? (
                  <div className="public-live-boss">
                    <div className="public-live-boss__meta">
                      <strong>{boss.currentHp} HP</strong>
                      <span>de {boss.maxHp} HP</span>
                    </div>
                    <div className="public-live-boss__track" aria-label={`${boss.currentHp} de ${boss.maxHp} pontos de vida`}>
                      <span style={{ "--boss-progress": `${Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100))}%` } as React.CSSProperties} />
                    </div>
                    {boss.currentHp === 0 && <div className="public-live-boss__defeated">BOSS DERROTADO · objetivo coletivo concluído</div>}
                  </div>
                ) : (
                  <p>O professor está conduzindo o progresso do Boss na Arena.</p>
                )}
              </div>
            ) : liveStage.primary.type !== "WORD_CLOUD" && liveStage.primary.type !== "POLL" && liveStage.primary.type !== "QUESTION" && liveStage.primary.type !== "QUIZ" && liveStage.primary.type !== "LEARNING_CHECK" ? (
              <div className={wordStyles.waiting}>
                <span>{liveStage.primary.type === "IDLE" ? "ARENA DEV" : liveStage.primary.type.replaceAll("_", " ")}</span>
                <strong>Aguardando próxima dinâmica</strong>
                <p>O celular acompanha o mesmo estado da aula, exibindo apenas as ações destinadas aos participantes.</p>
              </div>
            ) : null}

            <div className="student-session-footer"><span>Sessão {access.code}</span><span>{access.present ? "Presença marcada" : "Presença sob controle do professor"}</span></div>
          </div>
        )}

        {error && <div className="student-error" role="alert">{error}</div>}
      </section>
    </main>
  );
}
