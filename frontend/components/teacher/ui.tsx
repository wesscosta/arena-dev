import { useId, useRef } from "react";
import { DialogCloseButton } from "@/components/ui";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useModalKeyboard } from "@/lib/use-modal-keyboard";
import type { Student } from "@/lib/types";

// Small building blocks shared by the teacher screens (moved out of ArenaApp.tsx).

export function Modal({ open, title, subtitle, size = "medium", bodyClassName, onClose, children }: {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: "medium" | "large";
  bodyClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const modalRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useBodyScrollLock(open);
  useModalKeyboard(open, onClose, modalRef, closeRef);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section ref={modalRef} className={`modal-card ${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="modal-header">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <DialogCloseButton ref={closeRef} label={`Fechar ${title.toLocaleLowerCase("pt-BR")}`} onClick={onClose} />
        </header>
        <div className={bodyClassName ? `modal-body ${bodyClassName}` : "modal-body"}>{children}</div>
      </section>
    </div>
  );
}

export function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></div>{children}</div>;
}
export function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
export function Avatar({ student, large = false }: { student: Student; large?: boolean }) { const initials = student.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return <div className={large ? "avatar large" : "avatar"}>{initials}</div>; }
export function MiniEmpty({ text }: { text: string }) { return <div className="mini-empty">{text}</div>; }
export function EmptyState({ title, text, actionLabel, onAction }: { title: string; text: string; actionLabel: string; onAction: () => void }) { return <div className="empty-state"><div className="target-mark">A</div><h2>{title}</h2><p>{text}</p><button className="button primary large" onClick={onAction}>{actionLabel}</button></div>; }
export function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div className="step"><span>{n}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
