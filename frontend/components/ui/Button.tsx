"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export default function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  loading = false,
  loadingLabel = "Carregando...",
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}) {
  const classes = [
    styles.button,
    styles[variant],
    size !== "md" ? styles[size] : "",
    fullWidth ? styles.fullWidth : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
