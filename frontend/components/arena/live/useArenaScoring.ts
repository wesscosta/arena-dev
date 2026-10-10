"use client";

import { useRef, useState } from "react";
import { secureId } from "@/lib/secure-id";
import { createScoreEvent, ScoreApiError } from "@/lib/score-api";
import type { ScoreCategory, ScoreEvent } from "@/lib/types";

type ArenaScoringContext = {
  classroomId: string;
  sessionId?: string;
  activityId?: string;
  questionId?: string;
  selectedStudentId?: string;
  onScoreEvent: (event: ScoreEvent) => void;
  notify: (message: string) => void;
};

type AddScoreOptions = {
  studentId?: string;
  source?: "ARENA" | "BUZZER";
  successMessage?: string;
  feedback?: boolean;
};

export function useArenaScoring({
  classroomId,
  sessionId,
  activityId,
  questionId,
  selectedStudentId,
  onScoreEvent,
  notify,
}: ArenaScoringContext) {
  const [reason, setReason] = useState("Resposta correta");
  const [customPoints, setCustomPoints] = useState(10);
  const [scoreFeedback, setScoreFeedback] = useState(false);
  const [scoreBusy, setScoreBusy] = useState(false);
  // Keep an unresolved command key on uncertain network failures. No automatic retry,
  // and no new payload can overwrite it before the teacher reconciles the outcome.
  const pendingRef = useRef<{ key: string; id: string } | null>(null);
  const inFlightRef = useRef(false);

  async function addScore(
    points: number,
    category: ScoreCategory,
    description: string,
    options: AddScoreOptions = {},
  ) {
    const studentId = options.studentId ?? selectedStudentId;
    if (!studentId || !sessionId || !Number.isSafeInteger(points) || points === 0) return false;
    if (inFlightRef.current) return false;
    const command = {
      classroomId, studentId, sessionId, points, category, description,
      source: options.source ?? "ARENA",
      activityId: options.source === "BUZZER" ? undefined : activityId,
      questionId: options.source === "BUZZER" ? undefined : questionId,
    };
    const key = JSON.stringify(command);
    if (pendingRef.current && pendingRef.current.key !== key) {
      notify("Há um XP com resultado incerto. Reenvie primeiro o mesmo lançamento ou atualize a página e confira o histórico antes de iniciar outro.");
      return false;
    }
    const requestId = pendingRef.current?.id ?? secureId();
    pendingRef.current = { key, id: requestId };
    inFlightRef.current = true;
    setScoreBusy(true);
    try {
      const event = await createScoreEvent({ ...command, requestId });
      // A replay can return an event already added to the local ledger.
      onScoreEvent(event);
      pendingRef.current = null;
      if (options.feedback !== false) {
        setScoreFeedback(true);
        window.setTimeout(() => setScoreFeedback(false), 900);
      }
      notify(options.successMessage ?? `${points >= 0 ? "+" : ""}${points} XP confirmado no servidor.`);
      return true;
    } catch (error) {
      // 4xx definitively rejects the command; transport/5xx could have committed it.
      if (error instanceof ScoreApiError && error.status >= 400 && error.status < 500) {
        pendingRef.current = null;
        notify(error.message);
      } else {
        notify("Resultado do XP incerto. Confira o histórico ou repita exatamente o mesmo lançamento: a chave evita duplicação.");
      }
      return false;
    } finally {
      inFlightRef.current = false;
      setScoreBusy(false);
    }
  }

  async function addBuzzerScore(studentId: string, points: number) {
    return addScore(points, "QUESTION", "Buzzer · resposta correta", {
      studentId,
      source: "BUZZER",
      successMessage: `+${points} XP do Buzzer registrado.`,
      feedback: false,
    });
  }

  return {
    reason,
    setReason,
    customPoints,
    setCustomPoints,
    scoreFeedback,
    scoreBusy,
    addScore,
    addBuzzerScore,
  };
}
