import type { CSSProperties } from "react";
import type { Classroom, ClassroomThemeColor, ClassroomThemeIcon } from "./types";

export const CLASSROOM_THEME_COLORS: { id: ClassroomThemeColor; label: string; value: string }[] = [
  { id: "emerald", label: "Esmeralda", value: "#49d49d" },
  { id: "teal", label: "Turquesa", value: "#2dd4bf" },
  { id: "blue", label: "Azul", value: "#60a5fa" },
  { id: "indigo", label: "Índigo", value: "#818cf8" },
  { id: "violet", label: "Violeta", value: "#a78bfa" },
  { id: "amber", label: "Âmbar", value: "#fbbf24" },
  { id: "orange", label: "Laranja", value: "#fb923c" },
  { id: "rose", label: "Rosa", value: "#fb7185" },
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
    style: { "--classroom-accent": color.value } as CSSProperties,
  };
}
