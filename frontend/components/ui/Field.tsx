import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import styles from "./ui.module.css";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export default function Field({
  label,
  children,
  hint,
  error,
  optional = false,
  id,
}: {
  label: ReactNode;
  children: ReactElement<FieldControlProps>;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error) || undefined,
      })
    : children;

  return (
    <div className={styles.field}>
      <div className={styles.fieldLabelRow}>
        <label className={styles.fieldLabel} htmlFor={controlId}>
          {label}
        </label>
        {optional && <span className={styles.fieldOptional}>Opcional</span>}
      </div>

      {control}

      {hint && (
        <div id={hintId} className={styles.fieldHint}>
          {hint}
        </div>
      )}

      {error && (
        <div id={errorId} className={styles.fieldError} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
