"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  decodeStudentPreferences, nextStudentScale, readStudentPreferences,
  studentPreferencesSnapshot, subscribeStudentPreferences, updateStudentPreferences,
  STUDENT_TEXT_LEVELS,
} from "@/lib/student-preferences";
import { applyThemePreference } from "@/lib/theme-preference";
import styles from "./student-accessibility.module.css";

const DEFAULT = "1|system|0";

export function useStudentPreferences() {
  const snapshot = useSyncExternalStore(subscribeStudentPreferences, studentPreferencesSnapshot, () => DEFAULT);
  const [scale, theme, motion] = snapshot.split("|");
  const preferences = decodeStudentPreferences(scale, theme, motion);
  useEffect(() => { applyThemePreference(readStudentPreferences().theme); }, [snapshot]);
  return preferences;
}

export default function StudentAccessibilityControls({ compact = false }: { compact?: boolean }) {
  const { scale, theme, reducedMotion } = useStudentPreferences();
  return <section className={compact ? styles.controls + " " + styles.compact : styles.controls} aria-label="Preferências de acessibilidade">
    <div className={styles.scale} role="group" aria-label="Tamanho do conteúdo">
      <button type="button" aria-label="Diminuir conteúdo" title="Diminuir conteúdo" disabled={scale === STUDENT_TEXT_LEVELS[0]} onClick={() => updateStudentPreferences({ scale: nextStudentScale(scale, -1) })}>A−</button>
      <button type="button" title="Restaurar tamanho padrão" aria-label={"Restaurar tamanho padrão, atual " + Math.round(scale * 100) + "%"} onClick={() => updateStudentPreferences({ scale: 1 })}>{Math.round(scale * 100)}%</button>
      <button type="button" aria-label="Ampliar conteúdo" title="Ampliar conteúdo" disabled={scale === STUDENT_TEXT_LEVELS[STUDENT_TEXT_LEVELS.length - 1]} onClick={() => updateStudentPreferences({ scale: nextStudentScale(scale, 1) })}>A+</button>
    </div>
    <label className={styles.field}>
      <span>Tema</span>
      <select aria-label="Tema da interface" value={theme} onChange={(event) => updateStudentPreferences({ theme: event.target.value as "dark" | "light" | "system" })}>
        <option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option>
      </select>
    </label>
    <label className={styles.motion}><input type="checkbox" checked={reducedMotion} onChange={(event) => updateStudentPreferences({ reducedMotion: event.target.checked })}/><span>Reduzir movimento</span></label>
  </section>;
}
