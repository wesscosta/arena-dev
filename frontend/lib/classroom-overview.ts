export type ClassroomSortMode =
  | "RECENT"
  | "NAME_ASC"
  | "NAME_DESC"
  | "CODE_ASC"
  | "CODE_DESC";

export type OverviewClassroom = {
  id: string;
  name: string;
  code?: string | null;
  active?: boolean;
};

type OrderOptions = {
  query: string;
  sortMode: ClassroomSortMode;
  selectedClassroomId?: string;
  activeSessionClassroomIds: string[];
  recentClassroomIds: string[];
};

const RECENT_KEY = "arena-dev:classroom-recent:v1";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
}

function recentIndex(recentIds: string[], id: string) {
  const index = recentIds.indexOf(id);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

export function orderOverviewClassrooms<T extends OverviewClassroom>(
  classrooms: T[],
  options: OrderOptions,
) {
  const query = normalizeSearch(options.query);
  const activeSessions = new Set(options.activeSessionClassroomIds);

  const filtered = classrooms.filter((classroom) => {
    if (!query) return true;
    const haystack = normalizeSearch(`${classroom.name} ${classroom.code ?? ""}`);
    return haystack.includes(query);
  });

  if (options.sortMode === "NAME_ASC") {
    return [...filtered].sort((a, b) => compareText(a.name, b.name));
  }
  if (options.sortMode === "NAME_DESC") {
    return [...filtered].sort((a, b) => compareText(b.name, a.name));
  }
  if (options.sortMode === "CODE_ASC" || options.sortMode === "CODE_DESC") {
    const direction = options.sortMode === "CODE_ASC" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const aCode = a.code?.trim() ?? "";
      const bCode = b.code?.trim() ?? "";
      if (!aCode && !bCode) return compareText(a.name, b.name);
      if (!aCode) return 1;
      if (!bCode) return -1;
      const byCode = compareText(aCode, bCode) * direction;
      return byCode || compareText(a.name, b.name);
    });
  }

  const originalIndex = new Map(classrooms.map((item, index) => [item.id, index]));

  function tier(classroom: T) {
    const selected = classroom.id === options.selectedClassroomId;
    const live = activeSessions.has(classroom.id);
    if (selected && live) return 0;
    if (live) return 1;
    if (selected) return 2;
    if (options.recentClassroomIds.includes(classroom.id)) return 3;
    return 4;
  }

  return [...filtered].sort((a, b) => {
    const byTier = tier(a) - tier(b);
    if (byTier) return byTier;

    const byRecent =
      recentIndex(options.recentClassroomIds, a.id)
      - recentIndex(options.recentClassroomIds, b.id);
    if (byRecent) return byRecent;

    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  });
}

export function loadRecentClassroomIds() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function rememberClassroomAccess(classroomId: string) {
  if (typeof window === "undefined" || !classroomId) return;

  const current = loadRecentClassroomIds();
  const next = [
    classroomId,
    ...current.filter((id) => id !== classroomId),
  ].slice(0, 30);

  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
