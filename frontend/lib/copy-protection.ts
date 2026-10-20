/**
 * Copy protection in the student reader (v0.11.0-rc.6). It discourages copying,
 * it does not prevent it: screenshots and browser tools still work. Fields the
 * student types into keep copy, cut and paste.
 */
type MaybeElement = { closest?: (selector: string) => unknown } | null;

const EDITABLE = "input, textarea, select, [contenteditable=''], [contenteditable='true']";

export function isEditableTarget(target: unknown): boolean {
  const element = target as MaybeElement;
  return typeof element?.closest === "function" && element.closest(EDITABLE) != null;
}

/** Event handler that blocks the default action outside editable fields. */
export function blockOutsideEditable(event: { target: unknown; preventDefault: () => void }): void {
  if (!isEditableTarget(event.target)) event.preventDefault();
}
