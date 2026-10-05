"use client";

import styles from "./ui.module.css";

type RadioCardProps = {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
  onChange: () => void;
};

export default function RadioCard({
  name,
  value,
  checked,
  label,
  description,
  disabled = false,
  onChange,
}: RadioCardProps) {
  return (
    <label className={checked ? `${styles.radioCard} ${styles.radioCardActive}` : styles.radioCard}>
      <input
        className={styles.radioCardInput}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className={styles.radioCardIndicator} aria-hidden="true" />
      <span className={styles.radioCardCopy}>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}
