"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Escape, bounded Tab navigation, and focus restoration for application dialogs. */
export function useModalKeyboard(
  open: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const items = () => [...(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      .filter((element) => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"]'));

    (initialFocusRef?.current ?? items()[0] ?? dialog)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialog || !dialog.contains(document.activeElement)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = items();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [open, dialogRef, initialFocusRef]);
}
