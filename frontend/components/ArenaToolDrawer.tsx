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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={`${styles.drawer} ${size === "wide" ? styles.wide : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="arena-tool-title"
        onMouseDown={(event) => event.stopPropagation()}
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
        <div className={styles.content}>{children}</div>
      </aside>
    </div>
  );
}
