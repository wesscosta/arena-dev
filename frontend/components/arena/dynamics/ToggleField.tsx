import styles from "./ToggleField.module.css";

type Props = {
  label: string;
  description?: string;
  compact?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** Boolean setting with an optional helper description; compact mode fits dynamic headers. */
export default function ToggleField({ label, description, compact = false, checked, onChange, disabled = false }: Props) {
  return (
    <label className={[styles.field, compact ? styles.compact : ""].filter(Boolean).join(" ")}>
      <span className={styles.copy}>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className={styles.input}
        data-testid="dynamic-visibility-switch"
      />
      <span className={styles.track} aria-hidden="true"><span /></span>
    </label>
  );
}
