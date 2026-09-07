"use client";

import type { ReactNode } from "react";
import styles from "./ui.module.css";

export type BreadcrumbItem = {
  id: string;
  label: ReactNode;
  onClick?: () => void;
  current?: boolean;
};

export default function Breadcrumb({
  items,
  label = "Navegação contextual",
  className = "",
}: {
  items: BreadcrumbItem[];
  label?: string;
  className?: string;
}) {
  return (
    <nav
      className={[styles.breadcrumb, className].filter(Boolean).join(" ")}
      aria-label={label}
    >
      {items.map((item, index) => (
        <span key={item.id} style={{ display: "contents" }}>
          {index > 0 && (
            <span
              className={styles.breadcrumbSeparator}
              aria-hidden="true"
            >
              ›
            </span>
          )}

          {item.onClick && !item.current ? (
            <button
              type="button"
              className={styles.breadcrumbLink}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ) : (
            <span
              className={styles.breadcrumbItem}
              aria-current={item.current ? "page" : undefined}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
