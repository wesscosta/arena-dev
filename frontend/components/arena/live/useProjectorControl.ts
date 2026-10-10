"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROJECTOR_HEARTBEAT_MS,
  projectorPresenceKey,
  readProjectorPresence,
  requestProjectorClose,
} from "@/lib/projector-window-control";

type ProjectorControl = {
  projecting: boolean;
  pending: boolean;
  toggle: () => void;
};

/** A session-scoped toggle for projector tabs opened in this browser/origin.
 * The teacher's control reflects a live acknowledgement from the projector,
 * never the unverified result of window.open() with noopener. */
export function useProjectorControl(code: string | undefined, notify: (message: string) => void): ProjectorControl {
  const [projecting, setProjecting] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingSinceRef = useRef<number | null>(null);
  const notifyRef = useRef(notify);

  useEffect(() => { notifyRef.current = notify; }, [notify]);

  useEffect(() => {
    pendingSinceRef.current = null;
    const sync = () => {
      const alive = Boolean(code && readProjectorPresence(code));
      setProjecting(alive);
      if (pendingSinceRef.current === null) return;
      if (alive) {
        pendingSinceRef.current = null;
        setPending(false);
      } else if (Date.now() - pendingSinceRef.current > 6000) {
        pendingSinceRef.current = null;
        setPending(false);
        notifyRef.current("Não foi possível confirmar a janela do projetor. Verifique se o navegador bloqueou a abertura.");
      }
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === projectorPresenceKey(code ?? "")) sync();
    };
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(sync, PROJECTOR_HEARTBEAT_MS);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }, [code]);

  const toggle = useCallback(() => {
    if (!code || pending) return;
    if (readProjectorPresence(code)) {
      try {
        requestProjectorClose(code);
        // Do not report "off" until the projector tab has actually closed.
        notifyRef.current("Solicitação de fechamento enviada ao projetor.");
      } catch {
        notifyRef.current("Não foi possível enviar o comando. Feche a janela do projetor manualmente.");
      }
      return;
    }
    pendingSinceRef.current = Date.now();
    setPending(true);
    window.open(`/projector?code=${encodeURIComponent(code)}`, "_blank", "noopener,noreferrer");
  }, [code, pending]);

  return { projecting, pending, toggle };
}
