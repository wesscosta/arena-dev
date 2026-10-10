"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./QuestionComposer.module.css";

type Props = {
  label: string;
  labelAccessory?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder: string;
  hint?: string;
  rows?: number;
  className?: string;
};

export default function QuestionComposer({
  label,
  labelAccessory,
  value,
  onChange,
  maxLength,
  placeholder,
  hint,
  rows = 2,
  className,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 240 ? "auto" : "hidden";
  }, [value]);

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <div className={styles.heading}>
        <label className={styles.label} htmlFor={inputId}>{label}</label>
        {labelAccessory ? <div className={styles.labelAccessory}>{labelAccessory}</div> : null}
      </div>
      <textarea
        id={inputId}
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        data-testid="dynamic-question-input"
      />
      <span className={styles.footer}>
        {hint ? <small>{hint}</small> : <span />}
        <output aria-label={`${value.length} de ${maxLength} caracteres`}>{value.length}/{maxLength}</output>
      </span>
    </div>
  );
}
