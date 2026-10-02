"use client";

import { useState } from "react";
import { createScoreEvent } from "@/lib/score-api";
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

  async function addScore(
    points: number,
    category: ScoreCategory,
    description: string,
    options: AddScoreOptions = {},
  ) {
    const studentId = options.studentId ?? selectedStudentId;
    if (!studentId || !sessionId) return false;

    try {
      const event = await createScoreEvent({
        classroomId,
        studentId,
        sessionId,
        points,
        category,
        description,
        source: options.source ?? "ARENA",
        activityId: options.source === "BUZZER" ? undefined : activityId,
        questionId: options.source === "BUZZER" ? undefined : questionId,
      });
      onScoreEvent(event);

      if (options.feedback !== false) {
        setScoreFeedback(true);
        window.setTimeout(() => setScoreFeedback(false), 900);
      }

      notify(
        options.successMessage
          ?? `${points >= 0 ? "+" : ""}${points} XP registrado no PostgreSQL.`,
      );
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível registrar a pontuação.");
      return false;
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
    addScore,
    addBuzzerScore,
  };
}
