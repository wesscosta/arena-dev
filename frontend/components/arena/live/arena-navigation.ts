import type { ArenaDynamic, ArenaTool, ArenaGlyphName } from "./ArenaLiveChrome";

export type ArenaNavEntry = {
  id: string;
  label: string;
  icon: ArenaGlyphName;
} & (
  | { kind: "dynamic"; target: ArenaDynamic }
  | { kind: "tool"; target: Exclude<ArenaTool, null> }
);

/** One set of identifiers and labels for both persistent desktop and mobile navigation. */
export const ARENA_DYNAMICS: readonly ArenaNavEntry[] = [
  { id: "draw", label: "Sorteio", icon: "draw", kind: "dynamic", target: "draw" },
  { id: "quiz", label: "Quiz", icon: "quiz", kind: "dynamic", target: "quiz" },
  { id: "learning-check", label: "Verificar aprendizagem", icon: "learning-check", kind: "dynamic", target: "learning-check" },
  { id: "poll", label: "Votação", icon: "poll", kind: "dynamic", target: "poll" },
  { id: "wordcloud", label: "Nuvem de Palavras", icon: "wordcloud", kind: "dynamic", target: "wordcloud" },
  { id: "buzzer", label: "Buzzer", icon: "buzzer", kind: "dynamic", target: "buzzer" },
  { id: "boss", label: "Boss Battle", icon: "boss", kind: "dynamic", target: "boss" },
];

export const ARENA_TOOLS: readonly ArenaNavEntry[] = [
  { id: "attendance", label: "Presença e acesso", icon: "attendance", kind: "tool", target: "attendance" },
  { id: "timer", label: "Timer", icon: "timer", kind: "tool", target: "timer" },
  { id: "groups", label: "Organizar turma", icon: "groups", kind: "tool", target: "groups" },
  { id: "ranking", label: "Ranking", icon: "ranking", kind: "tool", target: "ranking" },
  { id: "score", label: "Pontuação rápida", icon: "score", kind: "tool", target: "score" },
];
