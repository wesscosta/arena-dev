"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./ArenaToolDrawer.module.css";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: "default" | "wide";
  onClose: () => void;
  children: ReactNode;
};

export default function ArenaToolDrawer({ open, title, subtitle, size = "default", onClose, children }: Props) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");

      if (focusable.length === 0) {
        event.preventDefault();
        closeButtonRef.current?.focus();
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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      openerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        className={`${styles.drawer} ${size === "wide" ? styles.wide : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="arena-tool-title"
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>FERRAMENTA DA ARENA</span>
            <h2 id="arena-tool-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar ferramenta"
            title="Fechar"
          >
            ×
          </button>
        </header>
        <div className={styles.content} data-testid="arena-tool-drawer-content">{children}</div>
      </aside>
    </div>
  );
}
