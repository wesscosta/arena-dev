"use client";

import {
  createContext,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
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
  ref: Ref<HTMLButtonElement>;
};

type MenuContextValue = {
  close: (returnFocus?: boolean) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

function enabledMenuItems(root: HTMLElement | null): HTMLButtonElement[] {
  if (!root) return [];

  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)'
    )
  );
}

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
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }

  function focusFirst() {
    queueMicrotask(() => enabledMenuItems(rootRef.current)[0]?.focus());
  }

  function focusLast() {
    queueMicrotask(() => {
      const items = enabledMenuItems(rootRef.current);
      items.at(-1)?.focus();
    });
  }

  useEffect(() => {
    if (!open) return;

    const outside = (event: PointerEvent) => {
      if (
        rootRef.current
        && !rootRef.current.contains(event.target as Node)
      ) {
        close(false);
      }
    };

    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };

    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);

    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  const triggerProps: TriggerProps = {
    ref: triggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: () => setOpen((value) => !value),
    onKeyDown: (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        focusFirst();
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
        focusLast();
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
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              close(false);
            }
          }}
        >
          <MenuContext.Provider value={{ close }}>
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

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const menu = event.currentTarget.closest<HTMLElement>('[role="menu"]');
    const items = enabledMenuItems(menu);
    const current = items.indexOf(event.currentTarget);

    if (current < 0 || !items.length) return;

    if (event.key === "Home") {
      items[0]?.focus();
      return;
    }

    if (event.key === "End") {
      items.at(-1)?.focus();
      return;
    }

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const next = (current + direction + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={[
        styles.menuItem,
        danger ? styles.menuItemDanger : "",
      ].filter(Boolean).join(" ")}
      onKeyDown={navigate}
      onClick={() => {
        onSelect();
        context?.close(true);
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
