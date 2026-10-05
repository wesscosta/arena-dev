"use client";

import { useEffect, useState } from "react";
import { drawStudent } from "@/lib/mechanics-api";
import type { SessionRuntimeState } from "@/lib/types";
import type {
  ParticipantSelectionPhase,
  ParticipantSelectorMode,
} from "./selection.types";

type UseParticipantSelectionInput = {
  sessionId?: string;
  presentStudentIds: string[];
  initialSelectedStudentId?: string;
  mode: ParticipantSelectorMode;
  onRuntime: (runtime: SessionRuntimeState) => void;
  onAfterDraw?: () => void;
  onError: (error: unknown) => void;
};

export function useParticipantSelection({
  sessionId,
  presentStudentIds,
  initialSelectedStudentId,
  mode,
  onRuntime,
  onAfterDraw,
  onError,
}: UseParticipantSelectionInput) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(
    initialSelectedStudentId,
  );
  const [spotlightStudentId, setSpotlightStudentId] = useState<string | undefined>();
  const [phase, setPhase] = useState<ParticipantSelectionPhase>("ready");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelectedStudentId(initialSelectedStudentId);
    setSpotlightStudentId(undefined);
    setPhase("ready");
    setBusy(false);
  // A troca de sessão redefine o contexto. Mudanças no lastDrawn dentro da mesma
  // sessão são produzidas por draw() e não devem fechar o Spotlight recém-aberto.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function draw() {
    if (!sessionId || busy) return;
    if (presentStudentIds.length === 0) {
      onError(new Error("Nenhum aluno presente está disponível para o sorteio."));
      return;
    }

    setBusy(true);
    setSelectedStudentId(undefined);
    setSpotlightStudentId(undefined);
    setPhase(mode === "grid-spotlight" ? "selecting" : "ready");

    try {
      const result = await drawStudent(sessionId);
      const reducedMotion =
        typeof window !== "undefined"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      onRuntime(result.runtime);

      if (mode === "grid-spotlight") {
        if (!reducedMotion) {
          await new Promise((resolve) => window.setTimeout(resolve, 420));
        }
        setSelectedStudentId(result.studentId);
        setSpotlightStudentId(result.studentId);
        setPhase("revealed");
      } else if (reducedMotion) {
        setSelectedStudentId(result.studentId);
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        setSelectedStudentId(result.studentId);
        await new Promise((resolve) => window.setTimeout(resolve, 950));
      }

      onAfterDraw?.();
    } catch (error) {
      setPhase("ready");
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  function closeSpotlight() {
    setSpotlightStudentId(undefined);
    setPhase("ready");
  }

  return {
    busy,
    phase,
    selectedStudentId,
    spotlightStudentId,
    setSelectedStudentId,
    draw,
    closeSpotlight,
  };
}
