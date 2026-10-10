"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import styles from "./DialogCloseButton.module.css";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-label"> & {
  label: string;
};

/** One accessible, consistently sized dismiss control for dialogs and drawers. */
const DialogCloseButton = forwardRef<HTMLButtonElement, Props>(function DialogCloseButton(
  { label, className, title, ...props }, ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      className={[styles.close, className].filter(Boolean).join(" ")}
      aria-label={label}
      title={title ?? label}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
});

export default DialogCloseButton;
