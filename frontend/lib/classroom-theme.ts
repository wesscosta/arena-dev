import type { CSSProperties } from "react";
import type { Classroom, ClassroomThemeColor, ClassroomThemeIcon } from "./types";

// `value` is tuned for dark surfaces; `lightValue` keeps >= 4.5:1 on light
// surfaces, because the accent is also used as text (session kicker).
export const CLASSROOM_THEME_COLORS: { id: ClassroomThemeColor; label: string; value: string; lightValue: string }[] = [
  { id: "emerald", label: "Esmeralda", value: "#49d49d", lightValue: "#047857" },
  { id: "teal", label: "Turquesa", value: "#2dd4bf", lightValue: "#0f766e" },
  { id: "blue", label: "Azul", value: "#60a5fa", lightValue: "#1d4ed8" },
  { id: "indigo", label: "Índigo", value: "#818cf8", lightValue: "#4338ca" },
  { id: "violet", label: "Violeta", value: "#a78bfa", lightValue: "#6d28d9" },
  { id: "amber", label: "Âmbar", value: "#fbbf24", lightValue: "#92400e" },
  { id: "orange", label: "Laranja", value: "#fb923c", lightValue: "#9a3412" },
  { id: "rose", label: "Rosa", value: "#fb7185", lightValue: "#be123c" },
];

export const CLASSROOM_THEME_ICONS: { id: ClassroomThemeIcon; label: string; glyph: string }[] = [
  { id: "code", label: "Código", glyph: "</>" },
  { id: "terminal", label: "Terminal", glyph: ">_" },
  { id: "database", label: "Dados", glyph: "DB" },
  { id: "network", label: "Redes", glyph: "⌁" },
  { id: "computer", label: "Computador", glyph: "▣" },
  { id: "project", label: "Projetos", glyph: "◇" },
  { id: "business", label: "Gestão", glyph: "▤" },
  { id: "math", label: "Matemática", glyph: "∑" },
];

export const CLASSROOM_ACCENT_SCOPE_CLASS = "classroom-accent-scope";

export function classroomThemePresentation(classroom: Classroom): {
  color: string;
  glyph: string;
  style: CSSProperties;
} {
  const color = CLASSROOM_THEME_COLORS.find((option) => option.id === (classroom.themeColor ?? "emerald")) ?? CLASSROOM_THEME_COLORS[0];
  const icon = CLASSROOM_THEME_ICONS.find((option) => option.id === (classroom.themeIcon ?? "code")) ?? CLASSROOM_THEME_ICONS[0];
  return {
    color: color.value,
    glyph: icon.glyph,
    // Inline custom properties outrank selectors, so the theme switch lives in
    // CSS (.classroom-accent-scope) and resolves --classroom-accent per theme.
    style: {
      "--classroom-accent-dark": color.value,
      "--classroom-accent-light": color.lightValue,
    } as CSSProperties,
  };
}
