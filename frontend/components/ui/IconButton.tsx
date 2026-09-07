"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

export default function IconButton({
  label,
  children,
  danger = false,
  className = "",
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      className={[
        styles.iconButton,
        danger ? styles.iconButtonDanger : "",
        className,
      ].filter(Boolean).join(" ")}
      aria-label={label}
      title={props.title ?? label}
    >
      {children}
    </button>
  );
}
