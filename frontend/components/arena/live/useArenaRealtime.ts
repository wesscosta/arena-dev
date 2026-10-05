"use client";

import { useEffect, useRef, useState } from "react";
import {
  connectSessionSocket,
  fetchBuzzerState,
  fetchJoinCode,
  type BuzzerState,
  type JoinCode,
  type SessionRealtimeEvent,
} from "@/lib/realtime-api";
import type { TimerState } from "@/lib/timer-api";
import { fetchWordCloudState, type WordCloudState } from "@/lib/word-cloud-api";
import { fetchPollState, type PollState } from "@/lib/poll-api";
import { fetchQuizState, type QuizState } from "@/lib/quiz-api";
import { fetchSessionRanking, type SessionRankingState } from "@/lib/ranking-api";

type ArenaRealtimeStatus = "offline" | "connecting" | "online";

type UseArenaRealtimeInput = {
  sessionId?: string;
  notify: (message: string) => void;
  onSelectedStudent: (studentId: string) => void;
  onParticipantsChanged: (sessionId: string) => void;
};

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível sincronizar a Arena.";
}

export function useArenaRealtime({
  sessionId,
  notify,
  onSelectedStudent,
  onParticipantsChanged,
}: UseArenaRealtimeInput) {
  const [joinCode, setJoinCode] = useState<JoinCode | null>(null);
  const [buzzerState, setBuzzerState] = useState<BuzzerState>({ status: "IDLE", presses: [] });
  const [timerState, setTimerState] = useState<TimerState>({ timer: null });
  const [wordCloudState, setWordCloudState] = useState<WordCloudState>({ round: null });
  const [pollState, setPollState] = useState<PollState>({ round: null });
  const [quizState, setQuizState] = useState<QuizState>({ round: null });
  const [rankingState, setRankingState] = useState<SessionRankingState | null>(null);
  const [status, setStatus] = useState<ArenaRealtimeStatus>("offline");
  const [reconnectVersion, setReconnectVersion] = useState(0);
  const notifyRef = useRef(notify);
  const selectedStudentRef = useRef(onSelectedStudent);
  const participantsChangedRef = useRef(onParticipantsChanged);

  useEffect(() => {
    notifyRef.current = notify;
    selectedStudentRef.current = onSelectedStudent;
    participantsChangedRef.current = onParticipantsChanged;
  }, [notify, onSelectedStudent, onParticipantsChanged]);

  useEffect(() => {
    if (!sessionId) {
      setJoinCode(null);
      setBuzzerState({ status: "IDLE", presses: [] });
      setTimerState({ timer: null });
      setWordCloudState({ round: null });
      setPollState({ round: null });
      setQuizState({ round: null });
      setRankingState(null);
      setStatus("offline");
      return;
    }

    let active = true;
    let reconnectTimer: number | undefined;
    setStatus("connecting");

    void Promise.all([
      fetchJoinCode(sessionId),
      fetchBuzzerState(sessionId),
      fetchWordCloudState(sessionId),
      fetchPollState(sessionId),
      fetchQuizState(sessionId),
    ])
      .then(([code, buzzer, wordCloud, poll, quiz]) => {
        if (!active) return;
        setJoinCode(code);
        setBuzzerState(buzzer);
        setWordCloudState(wordCloud);
        setPollState(poll);
        setQuizState(quiz);
        if (buzzer.presses[0]) selectedStudentRef.current(buzzer.presses[0].studentId);
      })
      .catch((error) => {
        if (active) notifyRef.current(messageOf(error));
      });

    void fetchSessionRanking(sessionId)
      .then((ranking) => {
        if (active) setRankingState(ranking);
      })
      .catch((error) => {
        if (active) notifyRef.current(messageOf(error));
      });

    const socket = connectSessionSocket(sessionId, (event: SessionRealtimeEvent) => {
      if (!active) return;

      if (event.type === "BUZZER_STATE") {
        const state = event.payload as BuzzerState;
        setBuzzerState(state);
        if (state.presses[0]) selectedStudentRef.current(state.presses[0].studentId);
      }
      if (event.type === "TIMER_STATE") {
        setTimerState({
          ...(event.payload as TimerState),
          serverOccurredAt: event.occurredAt,
          receivedAtMs: Date.now(),
        });
      }
      if (event.type === "WORD_CLOUD_STATE") setWordCloudState(event.payload as WordCloudState);
      if (event.type === "POLL_STATE") setPollState(event.payload as PollState);
      if (event.type === "QUIZ_STATE") setQuizState(event.payload as QuizState);
      if (event.type === "SESSION_RANKING_STATE") setRankingState(event.payload as SessionRankingState);
      if (event.type === "PARTICIPANT_CONNECTED" || event.type === "PARTICIPANT_DISCONNECTED") {
        participantsChangedRef.current(sessionId);
      }
      if (event.type === "SESSION_FINISHED") setStatus("offline");
    });

    socket.onopen = () => setStatus("online");
    socket.onerror = () => setStatus("offline");
    socket.onclose = () => {
      if (!active) return;
      setStatus("offline");
      reconnectTimer = window.setTimeout(
        () => setReconnectVersion((value) => value + 1),
        1500,
      );
    };

    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket.close();
    };
  }, [sessionId, reconnectVersion]);

  return {
    joinCode,
    setJoinCode,
    buzzerState,
    setBuzzerState,
    timerState,
    setTimerState,
    wordCloudState,
    setWordCloudState,
    pollState,
    setPollState,
    quizState,
    setQuizState,
    rankingState,
    setRankingState,
    realtimeStatus: status,
  };
}
