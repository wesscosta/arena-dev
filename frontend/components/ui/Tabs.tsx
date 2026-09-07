"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useMemo,
  useRef,
} from "react";
import styles from "./ui.module.css";

export type TabItem = {
  id: string;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
};

export default function Tabs({
  items,
  activeId,
  onChange,
  label,
  className = "",
}: {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabled = useMemo(
    () => items.filter((item) => !item.disabled),
    [items],
  );

  function moveFocus(
    event: KeyboardEvent<HTMLButtonElement>,
    currentId: string,
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const currentIndex = enabled.findIndex((item) => item.id === currentId);
    if (currentIndex < 0 || !enabled.length) return;

    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabled.length - 1;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % enabled.length;
    }
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;
    }

    const next = enabled[nextIndex];
    refs.current[next.id]?.focus();
    onChange(next.id);
  }

  return (
    <div className={[styles.tabsRoot, className].filter(Boolean).join(" ")}>
      <div className={styles.tabList} role="tablist" aria-label={label}>
        {items.map((item) => {
          const active = item.id === activeId;

          return (
            <button
              key={item.id}
              ref={(node) => {
                refs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={item.disabled || undefined}
              tabIndex={active ? 0 : -1}
              disabled={item.disabled}
              className={[
                styles.tab,
                active ? styles.tabActive : "",
              ].filter(Boolean).join(" ")}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => moveFocus(event, item.id)}
            >
              <span className={styles.tabLabel}>{item.label}</span>
              {item.description !== undefined && (
                <span className={styles.tabDescription}>
                  {item.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
