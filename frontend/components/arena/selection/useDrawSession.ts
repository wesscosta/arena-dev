"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDrawState,
  selectDrawParticipant,
  resolveDrawParticipant,
  updateDrawPolicy,
  startNextDrawRound,
  type DrawPolicy,
  type DrawState,
} from "@/lib/draw-api";
import { HttpApiError } from "@/lib/http/errors";

/** A failed transport cannot tell whether an idempotent server command committed. */
function uncertainTransport(error: unknown) {
  return !(error instanceof HttpApiError);
}

export function useDrawSession(sessionId?: string) {
  const [state, setState] = useState<DrawState | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [needsReconciliation, setNeedsReconciliation] = useState(false);
  const commandInFlightRef = useRef(false);
  const needsReconciliationRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const authoritative = await getDrawState(sessionId);
    setState(authoritative);
    setError(null);
    needsReconciliationRef.current = false;
    setNeedsReconciliation(false);
  }, [sessionId]);

  useEffect(() => {
    let active = true;
    setState(null);
    setError(null);
    setNeedsReconciliation(false);
    needsReconciliationRef.current = false;
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
    return () => { active = false; };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    // Connectivity recovery performs a GET only. Never silently replay a POST:
    // a timed-out selection or score award may already exist on the server.
    const onOnline = () => {
      if (needsReconciliationRef.current) {
        void refresh().catch(() => undefined);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sessionId, refresh]);

  async function mutate<T>(action: (id: string) => Promise<T>): Promise<T | undefined> {
    // The ref closes the rapid double-click window before React re-renders.
    if (!sessionId || commandInFlightRef.current || needsReconciliationRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      needsReconciliationRef.current = true;
      setNeedsReconciliation(true);
      throw new Error("Sem internet. Nenhum novo comando será enviado; sincronize o sorteio após reconectar.");
    }
    commandInFlightRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await action(sessionId);
      await refresh();
      return result;
    } catch (reason) {
      setError(reason);
      if (uncertainTransport(reason)) {
        // Do not assume failure, and never generate another request UUID
        // until the snapshot is refreshed from the authoritative server.
        needsReconciliationRef.current = true;
        setNeedsReconciliation(true);
      }
      throw reason;
    } finally {
      commandInFlightRef.current = false;
      setBusy(false);
    }
  }

  return {
    state,
    busy,
    loading,
    error,
    needsReconciliation,
    refresh,
    draw: () => mutate((id) => selectDrawParticipant(id, crypto.randomUUID())),
    resolve: (attemptId: string, outcome: "CONFIRMED" | "PASSED" | "VOIDED", points?: number) =>
      mutate((id) => resolveDrawParticipant(
        id, attemptId, crypto.randomUUID(), outcome,
        points == null ? undefined : { points, category: "COLLABORATION", reason: "Participação" },
      )),
    changePolicy: (policy: DrawPolicy) => mutate((id) => updateDrawPolicy(id, policy)),
    nextRound: () => mutate((id) => startNextDrawRound(id, crypto.randomUUID())),
  };
}
