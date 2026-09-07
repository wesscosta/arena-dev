import type { ReactNode } from "react";
import styles from "./ui.module.css";

export default function EmptyState({
  icon = "◇",
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.emptyState, className].filter(Boolean).join(" ")}>
      <div className={styles.emptyStateIcon} aria-hidden="true">{icon}</div>
      <div className={styles.emptyStateTitle}>{title}</div>
      {description !== undefined && (
        <p className={styles.emptyStateDescription}>{description}</p>
      )}
      {action}
    </div>
  );
}
