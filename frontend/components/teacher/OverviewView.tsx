import { useEffect, useState } from "react";
import { Badge, type Notify } from "@/components/ui";
import { updateClassroom as updateClassroomApi } from "@/lib/classroom-api";
import { errorMessage } from "./format";
import { EmptyState, Metric } from "./ui";
import { ClassroomCreateModal } from "./ClassroomCreateModal";
import { loadRecentClassroomIds, orderOverviewClassrooms, type ClassroomSortMode } from "@/lib/classroom-overview";
import type { ArenaData, Classroom } from "@/lib/types";
import { CLASSROOM_ACCENT_SCOPE_CLASS, classroomThemePresentation } from "@/lib/classroom-theme";

export function OverviewView({ data, onSelectClassroom, onManageClassroom, notify, refreshClassroomDomain }: {
  data: ArenaData;
  onSelectClassroom: (classroomId: string) => void;
  onManageClassroom: (classroomId: string, intent: "general" | "delete") => void;
  notify: Notify;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<ClassroomSortMode>("RECENT");
  const [recentClassroomIds] = useState<string[]>(() => loadRecentClassroomIds());
  const [createOpen, setCreateOpen] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [platformsByClassroomId, setPlatformsByClassroomId] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let active = true;
    import("@/lib/classroom-integrations")
      .then(({ fetchClassroomIntegrationState }) => fetchClassroomIntegrationState())
      .then((state) => {
        if (active) setPlatformsByClassroomId(state.platformsByClassroomId);
      })
      .catch(() => {
        if (active) setPlatformsByClassroomId({});
      });
    return () => {
      active = false;
    };
  }, []);

  const activeSessions = data.sessions.filter((session) => session.status === "ACTIVE" && !session.endedAt);
  const activeCount = data.classrooms.filter((classroom) => classroom.active).length;
  const inactiveCount = data.classrooms.length - activeCount;
  const filteredClassrooms = data.classrooms.filter((classroom) => {
    if (filter === "ACTIVE") return classroom.active;
    if (filter === "INACTIVE") return !classroom.active;
    return true;
  });
  const visibleClassrooms = orderOverviewClassrooms(filteredClassrooms, {
    query,
    sortMode,
    selectedClassroomId: data.activeClassroomId,
    activeSessionClassroomIds: activeSessions.map((session) => session.classroomId),
    recentClassroomIds,
  });
  const activeClassroomIds = new Set(data.classrooms.filter((classroom) => classroom.active).map((classroom) => classroom.id));
  const activeEnrollments = data.enrollments.filter((enrollment) => enrollment.active && activeClassroomIds.has(enrollment.classroomId));
  const hasActiveFilters = Boolean(query.trim()) || filter !== "ALL";

  async function toggleClassroomActive(classroom: Classroom) {
    const hasActiveSession = activeSessions.some(
      (session) => session.classroomId === classroom.id,
    );

    if (classroom.active && hasActiveSession) {
      notify("Encerre a sessão ativa antes de desativar esta turma.");
      setOpenCardMenuId(null);
      return;
    }

    try {
      await updateClassroomApi({
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        active: !classroom.active,
        studentStudyAccessEnabled: classroom.studentStudyAccessEnabled ?? false,
      });
      await refreshClassroomDomain(classroom.id);
      notify(classroom.active ? "Turma desativada." : "Turma reativada.");
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setOpenCardMenuId(null);
    }
  }

  function clearOverviewFilters() {
    setQuery("");
    setFilter("ALL");
  }

  return (
    <div className="stack-lg overview-page">
      <header className="overview-page-header">
        <div>
          <span className="eyebrow accent">TURMAS</span>
          <h1>Suas turmas</h1>
          <p>Encontre rapidamente uma turma e continue o trabalho no contexto certo.</p>
        </div>
        <button className="button primary overview-new-classroom" onClick={() => setCreateOpen(true)}>
          + Nova turma
        </button>
      </header>

      <div className="metrics-grid overview-metrics" aria-label="Resumo das turmas">
        <Metric label="Turmas ativas" value={activeCount.toString()} hint={`${data.classrooms.length} cadastradas`} />
        <Metric label="Matrículas ativas" value={activeEnrollments.length.toString()} hint="vínculos em todas as turmas" />
        <Metric label="Atividades" value={data.activities.length.toString()} hint="conteúdo preparado" />
        <Metric label="Sessões agora" value={activeSessions.length.toString()} hint="sessões em andamento" />
      </div>

      <div className="overview-toolbar">
        <div className="overview-toolbar-main">
          <div className="segmented-control" aria-label="Filtrar turmas">
            <button className={filter === "ALL" ? "active" : ""} aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")}>Todas <span>{data.classrooms.length}</span></button>
            <button className={filter === "ACTIVE" ? "active" : ""} aria-pressed={filter === "ACTIVE"} onClick={() => setFilter("ACTIVE")}>Ativas <span>{activeCount}</span></button>
            <button className={filter === "INACTIVE" ? "active" : ""} aria-pressed={filter === "INACTIVE"} onClick={() => setFilter("INACTIVE")}>Inativas <span>{inactiveCount}</span></button>
          </div>

          <label className="overview-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome ou código"
              aria-label="Buscar turma por nome ou código"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                title="Limpar busca"
              >
                ×
              </button>
            )}
          </label>

          <select
            className="select overview-sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as ClassroomSortMode)}
            aria-label="Ordenar cards das turmas"
          >
            <option value="RECENT">Acesso recente</option>
            <option value="NAME_ASC">Nome A–Z</option>
            <option value="NAME_DESC">Nome Z–A</option>
            <option value="CODE_ASC">Código A–Z</option>
            <option value="CODE_DESC">Código Z–A</option>
          </select>
        </div>
      </div>

      {data.classrooms.length > 0 && (
        <div className="overview-results-meta" aria-live="polite">
          <span>{visibleClassrooms.length} {visibleClassrooms.length === 1 ? "turma" : "turmas"}</span>
          {hasActiveFilters && (
            <button type="button" onClick={clearOverviewFilters}>Limpar filtros</button>
          )}
        </div>
      )}

      {!data.classrooms.length ? (
        <EmptyState
          title="Crie sua primeira turma"
          text="Turmas é o ponto de entrada do Arena Dev. Crie a turma e, na etapa seguinte, inclua os alunos."
          actionLabel="+ Nova turma"
          onAction={() => setCreateOpen(true)}
        />
      ) : !visibleClassrooms.length ? (
        <div className="overview-empty-filter">
          <strong>{query ? `Nenhuma turma encontrada para “${query.trim()}”.` : "Nenhuma turma corresponde a este filtro."}</strong>
          <p>Altere a busca ou mostre novamente todas as turmas.</p>
          <button type="button" className="button ghost" onClick={clearOverviewFilters}>Limpar filtros</button>
        </div>
      ) : (
        <div className="classroom-card-grid">
          {visibleClassrooms.map((classroom) => {
            const studentCount = data.enrollments.filter((item) => item.classroomId === classroom.id && item.active).length;
            const activityCount = data.activities.filter((item) => item.classroomId === classroom.id).length;
            const session = activeSessions.find((item) => item.classroomId === classroom.id);
            return (
              <article
                key={classroom.id}
                className={`overview-class-card ${classroom.active ? "" : "inactive"} ${data.activeClassroomId === classroom.id ? "selected" : ""}`}
                data-testid="classroom-overview-card"
              >
                <button
                  type="button"
                  className="overview-class-card-open"
                  aria-label={`Abrir turma ${classroom.name}`}
                  onClick={() => onSelectClassroom(classroom.id)}
                >
                  <div className="overview-class-card-head">
                    <div className="overview-class-identity">
                      <div className={`classroom-monogram ${CLASSROOM_ACCENT_SCOPE_CLASS}`} style={classroomThemePresentation(classroom).style}>{classroom.name.trim().charAt(0).toUpperCase()}</div>
                      <div>
                        <h3 title={classroom.name}>{classroom.name}</h3>
                        <p>{classroom.code || "Sem código"}</p>
                      </div>
                    </div>
                  </div>

                  {platformsByClassroomId[classroom.id]?.length ? (
                    <div className="classroom-integration-badges" aria-label="Plataformas vinculadas">
                      {platformsByClassroomId[classroom.id].map((platform) => (
                        <Badge key={platform} variant="success" dot>
                          {platform === "MICROSOFT_TEAMS"
                            ? "Microsoft Teams"
                            : platform === "GOOGLE_CLASSROOM"
                              ? "Google Classroom"
                              : platform}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="overview-class-meta">
                    <span><strong>{studentCount}</strong> alunos</span>
                    <span><strong>{activityCount}</strong> atividades</span>
                  </div>

                  <div className="overview-class-card-foot">
                    <span>
                      {session ? (
                        <span className="live-pill compact"><span /> AO VIVO</span>
                      ) : (
                        <span className={`classroom-state ${classroom.active ? "active" : "inactive"}`}>
                          {classroom.active ? "Ativa" : "Inativa"}
                        </span>
                      )}
                    </span>
                    <strong>Abrir <span aria-hidden="true">→</span></strong>
                  </div>
                </button>

                <div
                  className="classroom-card-menu-wrap overview-card-actions"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="icon-action classroom-card-menu-trigger"
                    title="Ações da turma"
                    aria-label={`Ações de ${classroom.name}`}
                    aria-expanded={openCardMenuId === classroom.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenCardMenuId((current) =>
                        current === classroom.id ? null : classroom.id
                      );
                    }}
                  >
                    ⋯
                  </button>

                  {openCardMenuId === classroom.id && (
                    <div className="classroom-card-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenCardMenuId(null);
                          onManageClassroom(classroom.id, "general");
                        }}
                      >
                        <span>✎</span>
                        Editar turma
                      </button>

                      <button
                        type="button"
                        disabled={classroom.active && Boolean(session)}
                        title={
                          classroom.active && session
                            ? "Encerre a sessão antes de desativar."
                            : undefined
                        }
                        onClick={() => { void toggleClassroomActive(classroom); }}
                      >
                        <span>{classroom.active ? "○" : "●"}</span>
                        {classroom.active ? "Desativar turma" : "Reativar turma"}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() => {
                          setOpenCardMenuId(null);
                          onManageClassroom(classroom.id, "delete");
                        }}
                      >
                        <span>⌫</span>
                        Excluir turma
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {createOpen && (
        <ClassroomCreateModal
          data={data}
          onClose={() => setCreateOpen(false)}
          onCreated={(classroomId) => { setCreateOpen(false); onSelectClassroom(classroomId); }}
          notify={notify}
          refreshClassroomDomain={refreshClassroomDomain}
        />
      )}
    </div>
  );
}
