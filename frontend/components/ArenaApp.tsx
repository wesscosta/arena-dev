"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeacherLogin from "@/components/TeacherLogin";
import TeacherSessionSettings from "@/components/TeacherSessionSettings";
import { ArenaGlyph } from "@/components/arena/live/ArenaLiveChrome";
import JourneyManager from "@/components/JourneyManager";
import LibraryWorkspace from "@/components/LibraryWorkspace";
import ClassroomContextSwitcher from "@/components/ClassroomContextSwitcher";
import MicrosoftIntegrationConsole from "@/components/MicrosoftIntegrationConsole";
import IntegrationSettingsSummary from "@/components/IntegrationSettingsSummary";
import { Breadcrumb, Button, Menu, MenuItem, Toast, type BreadcrumbItem, type TabItem, type ToastMessage, type ToastTone } from "@/components/ui";
import { xpForStudent } from "@/lib/game";
import { reverseScoreEvent as reverseScoreEventApi } from "@/lib/score-api";
import { EMPTY_DATA, loadData, saveData } from "@/lib/store";
import { errorMessage } from "@/components/teacher/format";
import { EmptyState, Panel } from "@/components/teacher/ui";
import { RankingView } from "@/components/teacher/RankingView";
import { HistoryView } from "@/components/teacher/HistoryView";
import { BackupView } from "@/components/teacher/BackupView";
import { ClassroomWorkspaceTabs, ClassroomHome } from "@/components/teacher/ClassroomHome";
import { ArenaView } from "@/components/teacher/ArenaView";
import { ActivitiesView } from "@/components/teacher/ActivitiesView";
import { ClassroomManagementPage } from "@/components/teacher/ClassroomManagementPage";
import { StudentsView } from "@/components/teacher/StudentsView";
import { OverviewView } from "@/components/teacher/OverviewView";
import { fetchJourney } from "@/lib/journey-api";
import { fetchDashboardBootstrap } from "@/lib/dashboard-bootstrap-api";
import { fetchTeacherSession, logoutTeacher, type TeacherSession } from "@/lib/auth-api";
import { activeSessionId, selectPreferredClassroomId } from "@/lib/app-state";
import { rememberClassroomAccess } from "@/lib/classroom-overview";
import type { ArenaData } from "@/lib/types";
import { applyThemePreference, loadThemePreference, saveThemePreference, type ThemePreference } from "@/lib/theme-preference";
import { parseTeacherLocation, teacherLocationSearch, type ClassroomTab, type TeacherLocation, type TeacherView } from "@/lib/teacher-location";

type View = TeacherView;

const VIEW_LABEL: Record<View, string> = {
  dashboard: "Turmas",
  library: "Biblioteca",
  classroom: "Turma",
  "classroom-settings": "Gerenciar turma",
  arena: "Arena",
  integrations: "Integrações",
  settings: "Configurações",
};

export default function ArenaApp() {
  const [data, setData] = useState<ArenaData>(EMPTY_DATA);
  const [teacherSession, setTeacherSession] = useState<TeacherSession | null | undefined>(undefined);
  const [sessionExpired, setSessionExpired] = useState(false);
  const teacherSessionRef = useRef(teacherSession);
  useEffect(() => {
    teacherSessionRef.current = teacherSession;
  }, [teacherSession]);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [classroomTab, setClassroomTab] = useState<ClassroomTab>("home");
  // "Editar jornada" in the study preview links to /?journey=<id>.
  const [editJourneyId, setEditJourneyId] = useState<string | undefined>();
  const [classroomSettingsIntent, setClassroomSettingsIntent] = useState<"general" | "delete">("general");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastSeq = useRef(0);
  const dismissToast = useCallback(() => setToast(null), []);
  const [apiError, setApiError] = useState("");
  const [arenaActivityId, setArenaActivityId] = useState<string | undefined>();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    void fetchTeacherSession()
      .then((session) => { if (!cancelled) setTeacherSession(session); })
      .catch(() => { if (!cancelled) setTeacherSession(null); });
    // A 401 after the teacher was already in (session expired mid-class)
    // re-authenticates in place instead of dropping the open screen.
    const requireAuth = () => {
      if (teacherSessionRef.current) setSessionExpired(true);
      else setTeacherSession(null);
    };
    window.addEventListener("arena-auth-required", requireAuth);
    return () => { cancelled = true; window.removeEventListener("arena-auth-required", requireAuth); };
  }, []);

  useEffect(() => {
    if (!teacherSession) return;
    let cancelled = false;
    async function bootstrap() {
      const localData = loadData();
      try {
        const domain = await fetchDashboardBootstrap();
        if (cancelled) return;
        const selectedClassroomId = selectPreferredClassroomId(domain.classrooms, localData.activeClassroomId);
        setData({
          ...localData,
          ...domain,
          sessionRuntime: [],
          groupHistory: [],
          activeClassroomId: selectedClassroomId,
          currentSessionId: activeSessionId(domain.sessions, selectedClassroomId),
        });
        setApiError("");
      } catch (error) {
        if (cancelled) return;
        setData(localData);
        setApiError(`Backend indisponível: ${errorMessage(error)}`);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    void bootstrap();
    return () => { cancelled = true; };
  }, [teacherSession]);

  useEffect(() => {
    if (hydrated) saveData(data);
  }, [data, hydrated]);

  useEffect(() => {
    const initial = loadThemePreference();
    setThemePreferenceState(initial);
    applyThemePreference(initial);
  }, []);

  useEffect(() => {
    applyThemePreference(themePreference);
    if (themePreference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => applyThemePreference("system");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [themePreference]);

  function setThemePreference(preference: ThemePreference) {
    setThemePreferenceState(preference);
    saveThemePreference(preference);
  }

  const activeClassroom = data.classrooms.find((item) => item.id === data.activeClassroomId) ?? data.classrooms[0];
  const activeClassroomId = activeClassroom?.id;

  const classroomIdsRef = useRef<string[]>([]);
  // Until the URL has been read once, the default screen must not overwrite it.
  const [locationRestored, setLocationRestored] = useState(false);
  const [journeyCreation, setJourneyCreation] = useState(false);
  // True when this tab pushed the creation entry, so leaving it can go "back".
  const creationPushedRef = useRef(false);
  const creatingJourney = journeyCreation && view === "classroom" && classroomTab === "journeys";
  // Leaving the Journeys tab ends creation; coming back starts from the list.
  if (journeyCreation && !creatingJourney) setJourneyCreation(false);
  useEffect(() => {
    classroomIdsRef.current = data.classrooms.map((item) => item.id);
  }, [data.classrooms]);

  // Screen ↔ URL. Opening a screen pushes a history entry; "back" (browser or
  // installed PWA) restores the previous one instead of leaving the app.
  useEffect(() => {
    if (!hydrated) return;
    function restore() {
      const requested = parseTeacherLocation(window.location.search);
      const known = requested.classroomId && classroomIdsRef.current.includes(requested.classroomId);
      // A classroom screen whose classroom no longer exists falls back to the list.
      const location: TeacherLocation = requested.classroomId && !known
        ? { view: "dashboard", tab: "home" }
        : requested;
      const search = teacherLocationSearch(location, window.location.search);
      if (search !== window.location.search) {
        window.history.replaceState(null, "", `${window.location.pathname}${search}`);
      }
      if (location.classroomId) setActiveClassroom(location.classroomId);
      setClassroomTab(location.tab);
      setView(location.view);
      setJourneyCreation(Boolean(location.journeyCreation));
      if (!location.journeyCreation) creationPushedRef.current = false;
      setLocationRestored(true);
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
    // setActiveClassroom only touches state setters; classrooms are read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!locationRestored) return;
    const search = teacherLocationSearch(
      { view, tab: classroomTab, classroomId: activeClassroomId, journeyCreation: creatingJourney },
      window.location.search,
    );
    if (search !== window.location.search) {
      window.history.pushState(null, "", `${window.location.pathname}${search}`);
    }
  }, [locationRestored, view, classroomTab, activeClassroomId, creatingJourney]);

  function openJourneyCreation() {
    creationPushedRef.current = true;
    setJourneyCreation(true);
  }

  function closeJourneyCreation() {
    // Leaving the screen we pushed is the same as "back", so history keeps one entry for it.
    if (creationPushedRef.current) {
      creationPushedRef.current = false;
      window.history.back();
      return;
    }
    setJourneyCreation(false);
  }

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const journeyId = params.get("journey");
    if (!journeyId) return;
    params.delete("journey");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    let active = true;
    void fetchJourney(journeyId)
      .then((journey) => {
        if (!active) return;
        setActiveClassroom(journey.classroomId);
        setEditJourneyId(journey.id);
        openClassroom("journeys");
      })
      .catch((error) => { if (active) notify(errorMessage(error), "error"); });
    return () => { active = false; };
    // Runs once after the dashboard loads; the helpers only touch state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && !data.activeClassroomId && data.classrooms[0]) {
      setData((current) => ({ ...current, activeClassroomId: current.classrooms[0]?.id }));
    }
  }, [hydrated, data.activeClassroomId, data.classrooms]);

  const classEnrollments = useMemo(
    () => data.enrollments.filter((item) => item.classroomId === activeClassroomId),
    [data.enrollments, activeClassroomId],
  );

  const classStudents = useMemo(() => {
    const ids = new Set(classEnrollments.filter((item) => item.active).map((item) => item.studentId));
    return data.students.filter((student) => ids.has(student.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [classEnrollments, data.students]);

  const currentSession = data.sessions.find((item) => item.id === data.currentSessionId && item.status !== "FINISHED" && !item.endedAt);

  const arenaStudents = useMemo(() => {
    if (!currentSession) return classStudents;
    const participantIds = new Set(
      data.sessionParticipants
        .filter((item) => item.sessionId === currentSession.id)
        .map((item) => item.studentId),
    );
    return data.students.filter((student) => participantIds.has(student.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [classStudents, currentSession, data.sessionParticipants, data.students]);

  const leaderboard = useMemo(
    () =>
      classStudents
        .map((student) => ({
          student,
          xp: activeClassroomId ? xpForStudent(data.scoreEvents, activeClassroomId, student.id) : 0,
        }))
        .sort((a, b) => b.xp - a.xp || a.student.name.localeCompare(b.student.name)),
    [classStudents, data.scoreEvents, activeClassroomId],
  );

  function notify(message: string, tone: ToastTone = "info") {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, text: message, tone });
  }

  function patch(updater: (current: ArenaData) => ArenaData) {
    setData((current) => updater(current));
  }

  async function refreshClassroomDomain(preferredClassroomId?: string) {
    const domain = await fetchDashboardBootstrap();
    setData((current) => {
      const candidate = preferredClassroomId ?? current.activeClassroomId;
      const activeClassroomId = selectPreferredClassroomId(domain.classrooms, candidate);
      return { ...current, ...domain, sessionRuntime: [], groupHistory: [], activeClassroomId, currentSessionId: activeSessionId(domain.sessions, activeClassroomId) };
    });
    setApiError("");
  }

  function setActiveClassroom(id: string) {
    setArenaActivityId(undefined);
    rememberClassroomAccess(id);
    patch((current) => {
      return { ...current, activeClassroomId: id, currentSessionId: activeSessionId(current.sessions, id) };
    });
  }

  function openClassroom(tab: ClassroomTab = "home") {
    setClassroomTab(tab);
    setView("classroom");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function openClassroomSettings(classroomId?: string, intent: "general" | "delete" = "general") {
    if (classroomId) setActiveClassroom(classroomId);
    setClassroomSettingsIntent(intent);
    setView("classroom-settings");
  }

  if (teacherSession === undefined) {
    return <div className="loading-screen">Validando acesso...</div>;
  }

  if (!teacherSession) {
    return <TeacherLogin onAuthenticated={(session) => { setTeacherSession(session); setHydrated(false); }} />;
  }

  if (!hydrated) {
    return <div className="loading-screen">Carregando Arena Dev...</div>;
  }

  return (
    <div className={`app-shell app-shell-no-sidebar ${view === "arena" && currentSession ? "arena-fullscreen-shell" : ""}`}>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo principal
      </a>
      {sessionExpired && (
        <TeacherLogin
          mode="dialog"
          onAuthenticated={(session) => { setTeacherSession(session); setSessionExpired(false); }}
        />
      )}
      <main id="main-content" className="main-area" tabIndex={-1}>
        <header className={`topbar app-topbar contextual-topbar ${view === "arena" && currentSession ? "arena-root-topbar-hidden" : ""}`}>
          <button
            type="button"
            className="topbar-brand"
            onClick={() => {
              setView("dashboard");
            }}
            title="Voltar para Turmas"
          >
            <span className="topbar-brand-mark">A</span>
            <span>
              <strong>ARENA DEV</strong>
              <small>Classroom Edition · V1</small>
            </span>
          </button>

          <nav className="topbar-global-nav" aria-label="Navegação global">
            <button
              type="button"
              className={view === "dashboard" ? "topbar-global-nav-item active" : "topbar-global-nav-item"}
              aria-label="Turmas"
              aria-current={view === "dashboard" ? "page" : undefined}
              onClick={() => setView("dashboard")}
            >
              <span aria-hidden="true"><ArenaGlyph name="classrooms" /></span>
              <strong>Turmas</strong>
            </button>
            <button
              type="button"
              className={view === "library" ? "topbar-global-nav-item active" : "topbar-global-nav-item"}
              aria-label="Biblioteca"
              aria-current={view === "library" ? "page" : undefined}
              onClick={() => setView("library")}
            >
              <span aria-hidden="true"><ArenaGlyph name="material" /></span>
              <strong>Biblioteca</strong>
            </button>
          </nav>

          {view !== "dashboard" && view !== "library" ? (
            <Breadcrumb
              className="context-trail"
              items={[
                ...((view === "classroom" || view === "classroom-settings" || view === "arena") && activeClassroom
                ? [{
                    id: "classroom",
                    label: (
                      <ClassroomContextSwitcher
                        classrooms={data.classrooms}
                        activeClassroomId={activeClassroom.id}
                        liveClassroomIds={data.sessions
                          .filter((session) =>
                            session.status === "ACTIVE" && !session.endedAt
                          )
                          .map((session) => session.classroomId)}
                        onSelect={(classroomId) => {
                          const changed = classroomId !== activeClassroom.id;
                          setActiveClassroom(classroomId);
                          if (view === "arena" && changed) {
                            setClassroomTab("home");
                            setView("classroom");
                          }
                        }}
                      />
                    ),
                    current: view === "classroom",
                  } satisfies BreadcrumbItem]
                : []),
                ...(view === "arena"
                ? [{
                    id: "arena",
                    label: "Arena",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
              ...(view === "classroom-settings"
                ? [{
                    id: "classroom-settings",
                    label: "Gerenciar turma",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
              ...(view === "integrations"
                ? [{
                    id: "integrations",
                    label: "Integrações",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
              ...(view === "settings"
                ? [{
                    id: "settings",
                    label: "Configurações",
                    current: true,
                  } satisfies BreadcrumbItem]
                : []),
              ]}
            />
          ) : (
            <span className="context-trail-spacer" aria-hidden="true" />
          )}

          <div className="topbar-actions app-topbar-actions">
            <Menu
              trigger={(triggerProps) => (
                <button
                  {...triggerProps}
                  type="button"
                  className="topbar-profile"
                  aria-label="Abrir menu do professor"
                >
                  <span className="topbar-profile-avatar">
                    {teacherSession.username.trim().charAt(0).toUpperCase() || "P"}
                  </span>
                  <span className="topbar-profile-copy">
                    <strong>{teacherSession.username}</strong>
                    <small>Professor</small>
                  </span>
                  <span className="topbar-profile-chevron">⌄</span>
                </button>
              )}
            >
              <MenuItem
                icon="⚙"
                description="Perfil, sistema e backup"
                onSelect={() => {
                  setView("settings");
                }}
              >
                Configurações
              </MenuItem>
              <MenuItem
                icon="↪"
                danger
                description="Encerrar sessão do professor"
                onSelect={() => {
                  void logoutTeacher().finally(() => {
                    setTeacherSession(null);
                    setData(EMPTY_DATA);
                    setHydrated(false);
                  });
                }}
              >
                Sair
              </MenuItem>
            </Menu>
          </div>
        </header>

        <section className={view === "arena" ? "content arena-content-full" : "content"}>
          {apiError && <div className="api-alert" role="alert" aria-live="assertive"><strong>API indisponível.</strong><span>{apiError}</span><button className="text-button" onClick={() => { void refreshClassroomDomain(); }}>Tentar novamente</button></div>}

          {view === "library" && (
            <LibraryWorkspace classrooms={data.classrooms} notify={notify} />
          )}

          {view === "dashboard" && (
            <OverviewView
              data={data}
              onSelectClassroom={(classroomId) => { setActiveClassroom(classroomId); openClassroom("home"); }}
              onManageClassroom={(classroomId, intent) => openClassroomSettings(classroomId, intent)}
              notify={notify}
              refreshClassroomDomain={refreshClassroomDomain}
            />
          )}

          {view === "classroom" && (
            activeClassroom ? (
              <div className="stack-lg">
                <ClassroomWorkspaceTabs
                  tab={classroomTab}
                  onTabChange={setClassroomTab}
                  studentCount={classStudents.length}
                  activityCount={data.activities.filter((activity) => activity.classroomId === activeClassroom.id).length}
                  eventCount={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id).length}
                />
                {classroomTab === "home" && (
                  <ClassroomHome
                    classroom={activeClassroom}
                    data={data}
                    students={classStudents}
                    currentSession={currentSession}
                    onOpenArena={() => setView("arena")}
                    onManageClassroom={() => openClassroomSettings(activeClassroom.id)}
                    onManageIntegration={() => setView("integrations")}
                  />
                )}
                {classroomTab === "students" && (
                  <StudentsView
                    data={data}
                    classroomId={activeClassroom.id}
                    notify={notify}
                    refreshClassroomDomain={refreshClassroomDomain}
                  />
                )}
                {classroomTab === "activities" && (
                  <ActivitiesView
                    data={data}
                    classroomId={activeClassroom.id}
                    classroomName={activeClassroom.name}
                    students={classStudents}
                    onUseInArena={(activityId) => { setArenaActivityId(activityId); setView("arena"); }}
                    patch={patch}
                    notify={notify}
                  />
                )}
                {classroomTab === "journeys" && (
                  <JourneyManager
                    classroomId={activeClassroom.id}
                    classroomName={activeClassroom.name}
                    notify={notify}
                    initialJourneyId={editJourneyId}
                    creating={creatingJourney}
                    onCreate={openJourneyCreation}
                    onCloseCreation={closeJourneyCreation}
                  />
                )}
                {classroomTab === "ranking" && (
                  <RankingView leaderboard={leaderboard} events={data.scoreEvents} classroomId={activeClassroom.id} />
                )}
                {classroomTab === "history" && (
                  <HistoryView
                    classroomId={activeClassroom.id}
                    events={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id)}
                    students={data.students}
                    onReverse={(eventId) => {
                      void (async () => {
                        try {
                          const reversal = await reverseScoreEventApi(eventId);
                          patch((current) => ({
                            ...current,
                            scoreEvents: [
                              ...current.scoreEvents.map((event) => event.id === eventId ? { ...event, reversed: true } : event),
                              reversal,
                            ],
                          }));
                          notify("Lançamento revertido com auditoria preservada.");
                        } catch (error) {
                          notify(errorMessage(error), "error");
                        }
                      })();
                    }}
                  />
                )}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma turma selecionada"
                text="Selecione uma turma em Turmas ou crie uma nova turma para abrir o workspace pedagógico."
                actionLabel="Ir para Turmas"
                onAction={() => setView("dashboard")}
              />
            )
          )}

          {view === "classroom-settings" && (
            activeClassroom ? (
              <ClassroomManagementPage
                classroom={activeClassroom}
                data={data}
                currentSession={currentSession}
                initialAction={classroomSettingsIntent}
                onBack={() => setView("classroom")}
                onDeleted={() => setView("dashboard")}
                notify={notify}
                refreshClassroomDomain={refreshClassroomDomain}
              />
            ) : (
              <EmptyState
                title="Nenhuma turma selecionada"
                text="Selecione uma turma para abrir suas configurações."
                actionLabel="Ir para Turmas"
                onAction={() => setView("dashboard")}
              />
            )
          )}

          {view === "arena" && (
            activeClassroom ? (
              <ArenaView
                data={data}
                classroomId={activeClassroom.id}
                students={arenaStudents}
                currentSession={currentSession}
                sessionParticipants={data.sessionParticipants.filter((item) => item.sessionId === currentSession?.id)}
                preferredActivityId={arenaActivityId}
                onPreferredActivityChange={setArenaActivityId}
                onBack={() => openClassroom("home")}
                onGoDashboard={() => setView("dashboard")}
                teacherUsername={teacherSession.username}
                onOpenSettings={() => setView("settings")}
                onLogout={() => {
                  void logoutTeacher().finally(() => {
                    setTeacherSession(null);
                    setData(EMPTY_DATA);
                    setHydrated(false);
                  });
                }}
                onSessionEnded={() => {
                  openClassroom("home");
                }}
                patch={patch}
                notify={notify}
              />
            ) : (
              <EmptyState
                title="Selecione uma turma"
                text="A Arena sempre acontece dentro de uma turma. Escolha o contexto antes de iniciar a sessão."
                actionLabel="Ir para Turmas"
                onAction={() => setView("dashboard")}
              />
            )
          )}

          {view === "integrations" && (
            <MicrosoftIntegrationConsole
              classrooms={data.classrooms}
              students={data.students}
              onBack={() => setView("dashboard")}
            />
          )}

          {view === "settings" && (
            <div className="settings-page stack-lg">
              <div className="settings-heading">
                <div>
                  <span className="eyebrow accent">CONFIGURAÇÕES</span>
                  <h2>Professor e sistema</h2>
                  <p>Preferências administrativas do Arena Dev, informações do ambiente e rotinas de segurança.</p>
                </div>
                <button className="button ghost" onClick={() => setView("dashboard")}>
                  ← Turmas
                </button>
              </div>

              <div className="settings-summary-grid">
                <Panel title="Perfil do professor" subtitle="Sessão administrativa atual">
                  <div className="teacher-profile-card">
                    <span className="teacher-profile-avatar">
                      {teacherSession.username.trim().charAt(0).toUpperCase() || "P"}
                    </span>
                    <div>
                      <strong>{teacherSession.username}</strong>
                      <span>Professor</span>
                      <small>Acesso autenticado ao painel administrativo.</small>
                    </div>
                  </div>
                </Panel>

                <Panel title="Sistema" subtitle="Estado da persistência">
                  <div className="settings-system-status">
                    <span className={apiError ? "status-dot error" : "status-dot"} />
                    <div>
                      <strong>{apiError ? "Backend indisponível" : "Persistência operacional"}</strong>
                      <small>
                        {apiError
                          ? "Verifique Spring Boot e PostgreSQL."
                          : "Turmas, sessões, XP, atividades e mecânicas persistidas no backend."}
                      </small>
                    </div>
                  </div>
                  {apiError && (
                    <button
                      className="button ghost small settings-retry"
                      onClick={() => { void refreshClassroomDomain(); }}
                    >
                      Tentar novamente
                    </button>
                  )}
                </Panel>
              </div>

              <section className="settings-integrations-section">
                <div className="settings-section-heading">
                  <span className="eyebrow accent">INTEGRAÇÕES</span>
                  <h3>Plataformas educacionais</h3>
                  <p>
                    Conecte o Arena Dev às plataformas usadas pela instituição. As turmas continuam únicas no Arena e recebem apenas um indicador quando existe vínculo externo.
                  </p>
                </div>
                <IntegrationSettingsSummary onManage={() => setView("integrations")} />
              </section>

              <section className="settings-appearance-section">
                <div className="settings-section-heading">
                  <span className="eyebrow accent">APARÊNCIA</span>
                  <h3>Tema da interface</h3>
                  <p>Escolha como o Arena Dev deve aparecer neste navegador.</p>
                </div>

                <Panel title="Tema" subtitle="Preferência local deste dispositivo">
                  <div className="theme-choice-grid" role="radiogroup" aria-label="Tema da interface">
                    {([
                      { id: "dark", label: "Escuro", description: "Tema padrão do Arena Dev." },
                      { id: "light", label: "Claro", description: "Superfícies claras e contraste suave." },
                      { id: "system", label: "Sistema", description: "Segue a preferência do sistema operacional." },
                    ] as const).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={themePreference === option.id}
                        className={themePreference === option.id ? "theme-choice active" : "theme-choice"}
                        onClick={() => setThemePreference(option.id)}
                      >
                        <span className={`theme-choice-preview theme-choice-preview-${option.id}`} aria-hidden>
                          <i />
                          <b />
                        </span>
                        <span className="theme-choice-copy">
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                        <span className="theme-choice-check" aria-hidden>{themePreference === option.id ? "✓" : ""}</span>
                      </button>
                    ))}
                  </div>
                  <div className="settings-theme-note">
                    A preferência é salva localmente. “Sistema” acompanha automaticamente mudanças entre claro e escuro.
                  </div>
                </Panel>
              </section>

              <section className="settings-session-section">
                <div className="settings-section-heading">
                  <span className="eyebrow accent">ACESSO</span>
                  <h3>Duração do acesso</h3>
                  <p>Por quanto tempo o login do professor continua válido sem uso.</p>
                </div>
                <Panel title="Sessão do professor" subtitle="Vale em qualquer dispositivo">
                  <TeacherSessionSettings />
                </Panel>
              </section>

              <section className="settings-backup-section">
                <div className="settings-section-heading">
                  <span className="eyebrow accent">SEGURANÇA E DADOS</span>
                  <h3>Backup e restauração</h3>
                  <p>As operações de backup ficam dentro das configurações administrativas e deixam de ocupar a navegação principal.</p>
                </div>
                <BackupView
                  data={data}
                  setData={setData}
                  notify={notify}
                  refreshClassroomDomain={refreshClassroomDomain}
                />
              </section>
            </div>
          )}
        </section>
      </main>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
