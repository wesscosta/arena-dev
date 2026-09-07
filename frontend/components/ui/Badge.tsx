import type { ReactNode } from "react";
import styles from "./ui.module.css";

type Variant = "neutral" | "live" | "success" | "warning" | "danger";

export default function Badge({
  children,
  variant = "neutral",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}) {
  const variantClass =
    variant === "live"
      ? styles.badgeLive
      : variant === "success"
        ? styles.badgeSuccess
        : variant === "warning"
          ? styles.badgeWarning
          : variant === "danger"
            ? styles.badgeDanger
            : "";

  return (
    <span
      className={[
        styles.badge,
        dot ? styles.badgeDot : "",
        variantClass,
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </span>
  );
}
