"use client";

import { useEffect, useState } from "react";
import {
  getDrawState,
  selectDrawParticipant,
  resolveDrawParticipant,
  updateDrawPolicy,
  startNextDrawRound,
  type DrawPolicy,
  type DrawState,
} from "@/lib/draw-api";

export function useDrawSession(sessionId?: string) {
  const [state, setState] = useState<DrawState | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    setState(null);
    setError(null);
    if (!sessionId) return;
    setLoading(true);
    void getDrawState(sessionId)
      .then((value) => {
        if (active) setState(value);
      })
      .catch((reason) => {
        if (active) setError(reason);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  async function refresh() {
    if (!sessionId) return;
    setState(await getDrawState(sessionId));
  }
  async function mutate<T>(action: (id: string) => Promise<T>): Promise<T | undefined> {
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await action(sessionId);
      await refresh();
      return result;
    } catch (reason) {
      setError(reason);
      throw reason;
    } finally {
      setBusy(false);
    }
  }
  return {
    state,
    busy,
    loading,
    error,
    refresh,
    draw: () => mutate((id) => selectDrawParticipant(id, crypto.randomUUID())),
    resolve: (attemptId: string, outcome: "CONFIRMED" | "PASSED" | "VOIDED", points?: number) =>
      mutate((id) =>
        resolveDrawParticipant(
          id,
          attemptId,
          crypto.randomUUID(),
          outcome,
          points == null
            ? undefined
            : { points, category: "COLLABORATION", reason: "Participação" },
        ),
      ),
    changePolicy: (policy: DrawPolicy) => mutate((id) => updateDrawPolicy(id, policy)),
    nextRound: () => mutate((id) => startNextDrawRound(id, crypto.randomUUID())),
  };
}
