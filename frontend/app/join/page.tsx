"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  connectSessionSocket,
  fetchPublicSession,
  joinSession,
  type BuzzerState,
  type PublicSession,
  type SessionRealtimeEvent,
  type StudentJoinAccess,
} from "@/lib/realtime-api";
import { normalizeJoinCode, restoreStudentAccess, studentAccessStorageKey } from "@/lib/app-state";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [session, setSession] = useState<PublicSession | null>(null);
  const [identity, setIdentity] = useState("");
  const [access, setAccess] = useState<StudentJoinAccess | null>(null);
  const [buzzer, setBuzzer] = useState<BuzzerState>({ status: "IDLE", presses: [] });
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
      const saved = window.localStorage.getItem(key);
      const restored = restoreStudentAccess(saved, result.sessionId);
      setAccess(restored);
      if (saved && !restored) window.localStorage.removeItem(key);
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
      if (event.type === "BUZZER_STATE") setBuzzer(event.payload as BuzzerState);
      if (event.type === "SESSION_FINISHED") {
        setSessionFinished(true);
        setBuzzer({ status: "CLOSED", presses: [] });
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
        window.localStorage.removeItem(studentAccessStorageKey(access.code));
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
      const result = await joinSession(session.code, identity.trim());
      window.localStorage.setItem(studentAccessStorageKey(session.code), JSON.stringify(result));
      setAccess(result);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }

  function pressBuzzer() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || buzzer.status !== "OPEN") return;
    socket.send(JSON.stringify({ type: "BUZZER_PRESS" }));
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

        {session && !access && (
          <form className="student-join-form" onSubmit={submitIdentity}>
            <button type="button" className="student-back-button" onClick={() => { setSession(null); setCode(""); }}>← trocar código</button>
            <div className="student-session-context"><span>{session.classroomName}</span><strong>{session.sessionTitle}</strong><small>Código {session.code}</small></div>
            <div className="student-join-heading"><span>IDENTIFICAÇÃO</span><h1>Quem é você?</h1><p>Use sua matrícula ou seu nome completo exatamente como está na turma.</p></div>
            <input className="student-identity-input" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="Matrícula ou nome completo" autoFocus />
            <button className="student-primary-button" disabled={loading || !identity.trim()}>{loading ? "Entrando..." : "Entrar na sessão"}</button>
          </form>
        )}

        {session && access && (
          <div className="student-live-view">
            <div className="student-live-top">
              <div><span className="student-live-kicker">{access.classroomName}</span><h1>{access.nickname || access.name}</h1><p>{access.sessionTitle}</p></div>
              <span className={`student-connection ${socketState}`}><i />{socketState === "online" ? "Conectado" : socketState === "connecting" ? "Conectando" : "Offline"}</span>
            </div>

            {sessionFinished ? (
              <div className="student-buzzer-state finished"><strong>Sessão encerrada</strong><p>O professor encerrou esta aula.</p></div>
            ) : (
              <div className={`student-buzzer-state ${buzzer.status.toLowerCase()}`}>
                <span className="student-buzzer-label">BUZZER</span>
                {buzzer.status === "OPEN" ? (
                  <>
                    <h2>{myPress ? `Você é o ${myPress.position}º` : "Valendo!"}</h2>
                    <p>{myPress ? "Seu clique já foi registrado pelo servidor." : "Toque uma vez. A ordem é registrada no backend."}</p>
                    <button className={`student-buzzer-button ${myPress ? "pressed" : ""}`} onClick={pressBuzzer} disabled={Boolean(myPress) || socketState !== "online"}>{myPress ? `#${myPress.position}` : "APERTAR"}</button>
                    {winner && <small className="student-winner-note">1º clique: {winner.nickname || winner.name}</small>}
                  </>
                ) : buzzer.status === "CLOSED" ? (
                  <><h2>Rodada encerrada</h2><p>Aguarde o professor abrir uma nova rodada.</p>{winner && <strong className="student-round-winner">Vencedor: {winner.nickname || winner.name}</strong>}</>
                ) : (
                  <><h2>Aguardando rodada</h2><p>Quando o professor abrir o Buzzer, o botão será liberado automaticamente.</p></>
                )}
              </div>
            )}

            <div className="student-session-footer"><span>Sessão {access.code}</span><span>{access.present ? "Presença marcada" : "Presença sob controle do professor"}</span></div>
          </div>
        )}

        {error && <div className="student-error">{error}</div>}
      </section>
    </main>
  );
}
