import type { ReactNode } from "react";
import { ArenaGlyph, type ArenaDynamic } from "@/components/arena/live/ArenaLiveChrome";
import styles from "./DynamicHeader.module.css";

type Props = {
  dynamic: Exclude<ArenaDynamic, "runbook">;
  category?: string;
  title: string;
  description?: string;
  status?: string;
  /** Short operational information, not a second summary card. */
  summary?: ReactNode;
  /** Buttons not changing the round's primary state. */
  secondaryActions?: ReactNode;
  /** One explicit primary action, if the dynamic can execute directly. */
  primaryAction?: ReactNode;
  /** Backward-compatible contextual action (e.g. reopen a closed round). */
  actions?: ReactNode;
  className?: string;
};

/** Visual contract only. Projection belongs to the session header, never a dynamic. */
export default function DynamicHeader({
  dynamic,
  category = "DINÂMICA AO VIVO",
  title,
  description,
  status,
  summary,
  secondaryActions,
  primaryAction,
  actions,
  className,
}: Props) {
  const hasActions = Boolean(secondaryActions || primaryAction || actions);
  const hasMeta = Boolean(status || summary || hasActions);
  return (
    <header
      className={[styles.header, className].filter(Boolean).join(" ")}
      data-testid="dynamic-header"
      data-dynamic={dynamic}
      data-has-actions={hasActions ? "true" : "false"}
    >
      <div className={styles.identity}>
        <span className={styles.icon} data-testid="dynamic-header-icon" aria-hidden="true">
          <ArenaGlyph name={dynamic} />
        </span>
        <div className={styles.copy}>
          <span className={styles.category}>{category}</span>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {hasMeta ? (
        <div className={styles.meta}>
          {status ? <span className={styles.status} data-testid="dynamic-status">{status}</span> : null}
          {summary ? <div className={styles.summary} data-testid="dynamic-summary">{summary}</div> : null}
          {hasActions ? (
            <div className={styles.actions}>
              {secondaryActions}
              {actions}
              {primaryAction}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
