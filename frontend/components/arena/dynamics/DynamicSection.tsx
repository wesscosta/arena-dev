import type { ReactNode } from "react";
import styles from "./DynamicSection.module.css";

type Props = { eyebrow?: string; title?: string; children: ReactNode; className?: string; ariaLabel?: string };

export default function DynamicSection({ eyebrow, title, children, className, ariaLabel }: Props) {
  return (
    <section className={[styles.section, className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {eyebrow || title ? (
        <header className={styles.heading}>
          {eyebrow ? <span>{eyebrow}</span> : null}
          {title ? <h3>{title}</h3> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
