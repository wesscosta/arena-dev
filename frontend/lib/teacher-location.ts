// The teacher area is one page ("/"); the open screen lives in React state.
// Mirroring it in the query string gives the browser (and the installed PWA)
// history entries, so "back" returns to the previous screen instead of leaving
// the app, and a reload keeps the teacher where they were.

export type TeacherView =
  | "dashboard"
  | "library"
  | "classroom"
  | "classroom-settings"
  | "arena"
  | "integrations"
  | "settings";

export type ClassroomTab = "home" | "students" | "activities" | "journeys" | "ranking" | "history";

export type TeacherLocation = {
  view: TeacherView;
  tab: ClassroomTab;
  classroomId?: string;
  /** The Journey creation screen, opened from the classroom's Journeys tab. */
  journeyCreation?: boolean;
};

const VIEW_SLUG: Record<TeacherView, string> = {
  dashboard: "turmas",
  library: "biblioteca",
  classroom: "turma",
  "classroom-settings": "gerenciar-turma",
  arena: "arena",
  integrations: "integracoes",
  settings: "configuracoes",
};

const TAB_SLUG: Record<ClassroomTab, string> = {
  home: "inicio",
  students: "alunos",
  activities: "atividades",
  journeys: "jornadas",
  ranking: "ranking",
  history: "historico",
};

const CLASSROOM_VIEWS = new Set<TeacherView>(["classroom", "classroom-settings", "arena"]);

function bySlug<T extends string>(slugs: Record<T, string>, slug: string | null): T | undefined {
  if (!slug) return undefined;
  return (Object.keys(slugs) as T[]).find((key) => slugs[key] === slug);
}

/** Only the parameters this module owns; anything else in the query is preserved. */
const OWNED_PARAMS = ["tela", "turma", "aba", "jornada"] as const;

function isJourneysTab(view: TeacherView, tab: ClassroomTab) {
  return view === "classroom" && tab === "journeys";
}

export function parseTeacherLocation(search: string): TeacherLocation {
  const params = new URLSearchParams(search);
  const view = bySlug(VIEW_SLUG, params.get("tela")) ?? "dashboard";
  const tab = bySlug(TAB_SLUG, params.get("aba")) ?? "home";
  const classroomId = CLASSROOM_VIEWS.has(view) ? params.get("turma") || undefined : undefined;
  const journeyCreation = isJourneysTab(view, tab) && params.get("jornada") === "nova";
  return journeyCreation ? { view, tab, classroomId, journeyCreation } : { view, tab, classroomId };
}

export function teacherLocationSearch(location: TeacherLocation, currentSearch = ""): string {
  const params = new URLSearchParams(currentSearch);
  OWNED_PARAMS.forEach((name) => params.delete(name));
  if (location.view !== "dashboard") params.set("tela", VIEW_SLUG[location.view]);
  if (CLASSROOM_VIEWS.has(location.view) && location.classroomId) params.set("turma", location.classroomId);
  if (location.view === "classroom" && location.tab !== "home") params.set("aba", TAB_SLUG[location.tab]);
  if (location.journeyCreation && isJourneysTab(location.view, location.tab)) params.set("jornada", "nova");
  const query = params.toString();
  return query ? `?${query}` : "";
}
