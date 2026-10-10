import styles from "./ToggleField.module.css";

type Props = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** A single boolean setting; its unchecked meaning is described by the helper copy. */
export default function ToggleField({ label, description, checked, onChange, disabled = false }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.copy}>
        <strong>{label}</strong>
        <small>{description}</small>
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
