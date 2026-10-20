"use client";

import { useEffect } from "react";
import DialogCloseButton from "./DialogCloseButton";
import LiveRegion from "./LiveRegion";

export type ToastTone = "info" | "error";
export type ToastMessage = { id: number; text: string; tone: ToastTone };
export type Notify = (message: string, tone?: ToastTone) => void;

const INFO_DURATION_MS = 2500;

/**
 * Confirmations fade on their own; errors stay until the teacher dismisses
 * them or another message replaces them, so a failed save is never missed.
 * Both live regions stay mounted so screen readers announce every change.
 */
export default function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const timer = window.setTimeout(onDismiss, INFO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <>
      <LiveRegion>{toast?.tone === "info" ? toast.text : ""}</LiveRegion>
      <LiveRegion politeness="assertive">{toast?.tone === "error" ? toast.text : ""}</LiveRegion>
      {toast && (
        <div className={`toast toast-${toast.tone}`} data-testid="toast">
          <span>{toast.text}</span>
          {toast.tone === "error" && <DialogCloseButton label="Fechar aviso" onClick={onDismiss} />}
        </div>
      )}
    </>
  );
}
