"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  connectSessionSocket,
  fetchPublicSession,
  joinRememberedDevice,
  joinSession,
  recognizeRememberedDevice,
  revokeRememberedDevice,
  type BuzzerState,
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
import wordStyles from "./word-cloud.module.css";
import pollStyles from "./poll.module.css";
import { emptyPollParticipantState, sendPollVote, type PollParticipantState, type PollState } from "@/lib/poll-api";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [session, setSession] = useState<PublicSession | null>(null);
  const [identity, setIdentity] = useState("");
  const [access, setAccess] = useState<StudentJoinAccess | null>(null);
  const [recognizedDevice, setRecognizedDevice] = useState<DeviceRecognition | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [buzzer, setBuzzer] = useState<BuzzerState>({ status: "IDLE", presses: [] });
  const [wordCloud, setWordCloud] = useState<WordCloudState>({ round: null });
  const [poll, setPoll] = useState<PollState>({ round: null });
  const [liveStage, setLiveStage] = useState<LiveStageState>(() => emptyLiveStageState());
  const [wordCloudParticipant, setWordCloudParticipant] = useState<WordCloudParticipantState>(emptyWordCloudParticipantState());
  const [pollParticipant, setPollParticipant] = useState<PollParticipantState>(emptyPollParticipantState());
  const [wordDraft, setWordDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [socketState, setSocketState] = useState<"offline" | "connecting" | "online">("offline");
  const [sessionFinished, setSessionFinished] = useState(false);
  const [reconnectVersion, setReconnectVersion] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  async function resolveCode(nextCode: string) {
    const normalized = normalizeJoinCode(nextCode);
    if (!normalized) return;
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
      window.history.replaceState(null, "", `/join?code=${encodeURIComponent(result.code)}`);
    } catch (caught) {
      setSession(null);
      setAccess(null);
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const queryCode = new URLSearchParams(window.location.search).get("code");
    if (queryCode) void resolveCode(queryCode);
  }, []);

  useEffect(() => {
    if (!access || sessionFinished) return;
    let active = true;
    let reconnectTimer: number | undefined;
    setSocketState("connecting");
    const socket = connectSessionSocket(access.sessionId, (event: SessionRealtimeEvent) => {
      if (!active) return;
      if (event.type === "LIVE_STAGE_STATE") setLiveStage(event.payload as LiveStageState);
      if (event.type === "BUZZER_STATE") setBuzzer(event.payload as BuzzerState);
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
      if (event.type === "SESSION_FINISHED") {
        setSessionFinished(true);
        window.sessionStorage.removeItem(studentAccessStorageKey(access.code));
        setBuzzer({ status: "CLOSED", presses: [] });
        setPollParticipant(emptyPollParticipantState());
      }
      if (event.type === "ERROR") {
        const payload = event.payload as { message?: string };
        setError(payload?.message || "Erro na conexão em tempo real.");
      }
    }, access.token);
    socketRef.current = socket;
    socket.onopen = () => { if (active) setSocketState("online"); };
    socket.onerror = () => { if (active) setSocketState("offline"); };
    socket.onclose = (event) => {
      if (!active) return;
      setSocketState("offline");
      if (event.code === 1008) {
        window.sessionStorage.removeItem(studentAccessStorageKey(access.code));
        setAccess(null);
        setError(event.reason || "Sua identificação expirou. Entre novamente.");
        return;
      }
      reconnectTimer = window.setTimeout(() => setReconnectVersion((value) => value + 1), 1500);
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

  const myPress = useMemo(
    () => access ? buzzer.presses.find((press) => press.studentId === access.studentId) : undefined,
    [buzzer.presses, access?.studentId],
  );
  const winner = buzzer.presses[0];

  return (
    <main className="student-join-shell">
      <section className="student-join-card">
        <div className="student-brand"><span>A</span><div><strong>ARENA DEV</strong><small>Participação ao vivo</small></div></div>

        {!session && (
          <form className="student-join-form" onSubmit={submitCode}>
            <div className="student-join-heading"><span>ENTRAR NA AULA</span><h1>Código da sessão</h1><p>Digite o código exibido pelo professor.</p></div>
            <input className="student-code-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={8} placeholder="ABC123" autoFocus />
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
              <span className={`student-connection ${socketState}`}><i />{socketState === "online" ? "Conectado" : socketState === "connecting" ? "Conectando" : "Offline"}</span>
            </div>

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
                <p>O resultado foi definido pelo backend e está sincronizado com o palco da aula.</p>
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
            ) : liveStage.primary.type !== "WORD_CLOUD" && liveStage.primary.type !== "POLL" ? (
              <div className={wordStyles.waiting}>
                <span>{liveStage.primary.type === "IDLE" ? "ARENA DEV" : liveStage.primary.type.replaceAll("_", " ")}</span>
                <strong>Aguardando próxima dinâmica</strong>
                <p>O celular acompanha o mesmo estado da aula, exibindo apenas as ações destinadas aos participantes.</p>
              </div>
            ) : null}

            <div className="student-session-footer"><span>Sessão {access.code}</span><span>{access.present ? "Presença marcada" : "Presença sob controle do professor"}</span></div>
          </div>
        )}

        {error && <div className="student-error">{error}</div>}
      </section>
    </main>
  );
}
