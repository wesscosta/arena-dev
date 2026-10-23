import { applyThemePreference, saveThemePreference, THEME_STORAGE_KEY, type ThemePreference } from "./theme-preference";

export const STUDENT_SCALE_KEY = "arena-dev:study-text-scale";
export const STUDENT_MOTION_KEY = "arena-dev:student-reduced-motion";
export const STUDENT_PREFERENCES_EVENT = "arena:student-preferences";
export const STUDENT_TEXT_LEVELS = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;
export type StudentPreferences = { scale: number; theme: ThemePreference; reducedMotion: boolean };

export function decodeStudentPreferences(scale: string | null, theme: string | null, motion: string | null): StudentPreferences {
  const numeric = scale === null ? 1 : Number(scale);
  return {
    scale: STUDENT_TEXT_LEVELS.some((level) => level === numeric) ? numeric : 1,
    theme: theme === "dark" || theme === "light" || theme === "system" ? theme : "system",
    reducedMotion: motion === "1",
  };
}

export function readStudentPreferences(): StudentPreferences {
  if (typeof window === "undefined") return decodeStudentPreferences(null, null, null);
  return decodeStudentPreferences(
    window.localStorage.getItem(STUDENT_SCALE_KEY),
    window.localStorage.getItem(THEME_STORAGE_KEY),
    window.localStorage.getItem(STUDENT_MOTION_KEY),
  );
}

export function studentPreferencesSnapshot(): string {
  const { scale, theme, reducedMotion } = readStudentPreferences();
  return [scale, theme, reducedMotion ? "1" : "0"].join("|");
}

export function updateStudentPreferences(patch: Partial<StudentPreferences>): void {
  if (typeof window === "undefined") return;
  if (patch.scale !== undefined) {
    if (!STUDENT_TEXT_LEVELS.some((level) => level === patch.scale)) throw new Error("Escala de leitura inválida.");
    window.localStorage.setItem(STUDENT_SCALE_KEY, String(patch.scale));
  }
  if (patch.reducedMotion !== undefined) window.localStorage.setItem(STUDENT_MOTION_KEY, patch.reducedMotion ? "1" : "0");
  if (patch.theme !== undefined) saveThemePreference(patch.theme);
  else applyThemePreference(readStudentPreferences().theme);
  window.dispatchEvent(new Event(STUDENT_PREFERENCES_EVENT));
}

export function subscribeStudentPreferences(notify: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || [STUDENT_SCALE_KEY, THEME_STORAGE_KEY, STUDENT_MOTION_KEY].includes(event.key)) {
      applyThemePreference(readStudentPreferences().theme);
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(STUDENT_PREFERENCES_EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STUDENT_PREFERENCES_EVENT, notify);
  };
}

export function nextStudentScale(current: number, direction: -1 | 1): number {
  const index = STUDENT_TEXT_LEVELS.findIndex((level) => level === current);
  return STUDENT_TEXT_LEVELS[Math.min(STUDENT_TEXT_LEVELS.length - 1, Math.max(0, (index < 0 ? 2 : index) + direction))];
}
