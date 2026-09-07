"use client";

import {
  createContext,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./ui.module.css";

type TriggerProps = {
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  onKeyDown: KeyboardEventHandler<HTMLButtonElement>;
};

type MenuContextValue = {
  close: () => void;
  firstItemRef: RefObject<HTMLButtonElement | null>;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export function Menu({
  trigger,
  children,
  align = "end",
}: {
  trigger: (props: TriggerProps) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const outside = (event: PointerEvent) => {
      if (
        rootRef.current
        && !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);

    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  const triggerProps: TriggerProps = {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: () => setOpen((value) => !value),
    onKeyDown: (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        queueMicrotask(() => firstItemRef.current?.focus());
      }
    },
  };

  return (
    <div className={styles.menuRoot} ref={rootRef}>
      {trigger(triggerProps)}

      {open && (
        <div
          className={styles.menuPopover}
          role="menu"
          style={align === "start" ? { right: "auto", left: 0 } : undefined}
        >
          <MenuContext.Provider
            value={{
              close: () => setOpen(false),
              firstItemRef,
            }}
          >
            {children}
          </MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  description,
  danger = false,
  disabled = false,
  onSelect,
}: {
  icon?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const context = useContext(MenuContext);

  return (
    <button
      ref={context?.firstItemRef}
      type="button"
      role="menuitem"
      disabled={disabled}
      className={[
        styles.menuItem,
        danger ? styles.menuItemDanger : "",
      ].filter(Boolean).join(" ")}
      onClick={() => {
        onSelect();
        context?.close();
      }}
    >
      <span className={styles.menuItemIcon}>{icon ?? "·"}</span>
      <span className={styles.menuItemCopy}>
        <strong>{children}</strong>
        {description !== undefined && <small>{description}</small>}
      </span>
    </button>
  );
}
