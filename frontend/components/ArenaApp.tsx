"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import TeacherLogin from "@/components/TeacherLogin";
import ActivityQuestionBuilder from "@/components/ActivityQuestionBuilder";
import ActivityStepEditor from "@/components/ActivityStepEditor";
import ActivitySubmissionDashboard from "@/components/ActivitySubmissionDashboard";
import LiveFlowConductor from "@/components/LiveFlowConductor";
import ExternalResultImportModal from "@/components/ExternalResultImportModal";
import TimerPanel from "@/components/TimerPanel";
import ArenaToolDrawer from "@/components/ArenaToolDrawer";
import ParticipantSelectionExperience from "@/components/arena/selection/ParticipantSelectionExperience";
import DrawSettingsDrawer from "@/components/arena/selection/DrawSettingsDrawer";
import ArenaContextRail from "@/components/arena/live/ArenaContextRail";
import { useArenaRealtime } from "@/components/arena/live/useArenaRealtime";
import { useArenaScoring } from "@/components/arena/live/useArenaScoring";
import { useArenaToolState } from "@/components/arena/live/useArenaToolState";
import WheelParticipantSelector from "@/components/arena/selection/WheelParticipantSelector";
import {
  presentationToSelectorMode,
  selectorModeToPresentation,
} from "@/components/arena/selection/selector-mode";
import type { ParticipantSelectorMode } from "@/components/arena/selection/selection.types";
import { useParticipantSelection } from "@/components/arena/selection/useParticipantSelection";
import {
  ArenaGlyph,
  ArenaLiveShell,
  ArenaSessionHeader,
  ArenaSidebar,
} from "@/components/arena/live/ArenaLiveChrome";
import WordCloudPanel from "@/components/WordCloudPanel";
import PollPanel from "@/components/PollPanel";
import QuizPanel from "@/components/QuizPanel";
import SessionAccessCard from "@/components/SessionAccessCard";
import JourneyManager from "@/components/JourneyManager";
import LibraryWorkspace from "@/components/LibraryWorkspace";
import SessionTimeline from "@/components/SessionTimeline";
import ClassroomContextSwitcher from "@/components/ClassroomContextSwitcher";
import MicrosoftIntegrationConsole from "@/components/MicrosoftIntegrationConsole";
import IntegrationSettingsSummary from "@/components/IntegrationSettingsSummary";
import ClassroomIntegrationWorkspace from "@/components/ClassroomIntegrationWorkspace";
import {
  Badge,
  Breadcrumb,
  Button,
  Menu,
  MenuItem,
  LiveRegion,
  Tabs,
  type BreadcrumbItem,
  type TabItem,
} from "@/components/ui";
import { QUESTION_DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/lib/activity-questions";
import { getLevel, getLevelProgress, xpForStudent } from "@/lib/game";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { ArenaApiError, createAndEnrollStudent, createClassroom as createClassroomApi, deleteClassroom as deleteClassroomApi, fetchClassroomDomain, removeEnrollment, setEnrollmentActive, updateClassroom as updateClassroomApi, updateEnrollmentPreferredName } from "@/lib/classroom-api";
import { createSession as createSessionApi, fetchSessionDomain, fetchSessionParticipants, finishSession as finishSessionApi, releaseParticipantDevice, setParticipantPresence } from "@/lib/session-api";
import { copyActivity as copyActivityApi, createActivity as createActivityApi, fetchActivityDomain, updateActivity as updateActivityApi, type ActivityUpsertInput } from "@/lib/activity-api";
import { fetchActivitySteps, replaceActivitySteps } from "@/lib/activity-step-api";
import { validateActivitySteps } from "@/lib/activity-steps";
import {
  damageBoss as damageBossApi,
  fetchLiveFlow,
  mergeSessionMechanics,
  nextArenaQuestion as nextArenaQuestionApi,
  nextLiveFlow,
  organizeGroups as organizeGroupsApi,
  previousLiveFlow,
  restartArenaQuestions as restartArenaQuestionsApi,
  setArenaActivity as setArenaActivityApi,
  setDrawPresentation as setDrawPresentationApi,
  startBoss as startBossApi,
  startLiveFlow,
  type LiveFlowState,
} from "@/lib/mechanics-api";
import { createScoreEvents as createScoreEventsApi, fetchScoreDomain, reverseScoreEvent as reverseScoreEventApi, type CreateScoreEventInput } from "@/lib/score-api";
import { closeBuzzer as closeBuzzerApi, joinQrImageUrl, openBuzzer as openBuzzerApi, rotateJoinCode } from "@/lib/realtime-api";
import { fetchSessionEventsBySession, type SessionEvent } from "@/lib/session-event-api";
import { EMPTY_DATA, loadData, saveData } from "@/lib/store";
import { fetchTeacherSession, logoutTeacher, type TeacherSession } from "@/lib/auth-api";
import { activeSessionId, selectPreferredClassroomId } from "@/lib/app-state";
import {
  loadRecentClassroomIds,
  orderOverviewClassrooms,
  rememberClassroomAccess,
  type ClassroomSortMode,
} from "@/lib/classroom-overview";
import type { Activity, ActivityQuestion, ActivityStep, ArenaData, Classroom, ClassroomThemeColor, ClassroomThemeIcon, ScoreCategory, SessionParticipant, Student } from "@/lib/types";
import { classroomArenaCtaState } from "@/lib/classroom-arena-cta";
import { applyThemePreference, loadThemePreference, saveThemePreference, type ThemePreference } from "@/lib/theme-preference";
import {
  CLASSROOM_THEME_COLORS,
  CLASSROOM_THEME_ICONS,
  classroomThemePresentation,
} from "@/lib/classroom-theme";

type View = "dashboard" | "library" | "classroom" | "classroom-settings" | "arena" | "integrations" | "settings";
type ClassroomTab = "home" | "students" | "activities" | "journeys" | "ranking" | "history";

const VIEW_LABEL: Record<View, string> = {
  dashboard: "Visão geral",
  library: "Biblioteca",
  classroom: "Turma",
  "classroom-settings": "Gerenciar turma",
  arena: "Arena",
  integrations: "Integrações",
  settings: "Configurações",
};

const CLASSROOM_TABS: { id: ClassroomTab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "students", label: "Alunos", icon: "◎" },
  { id: "activities", label: "Atividades", icon: "✓" },
  { id: "journeys", label: "Jornadas", icon: "◈" },
  { id: "ranking", label: "Ranking", icon: "▲" },
  { id: "history", label: "Histórico", icon: "≡" },
];

const SCORE_PRESETS: { points: number; label: string; category: ScoreCategory }[] = [
  { points: 5, label: "Parcial / complemento", category: "QUESTION" },
  { points: 10, label: "Resposta correta", category: "QUESTION" },
  { points: 15, label: "Debug / código", category: "DEBUG" },
  { points: 20, label: "Desafio avançado", category: "CHALLENGE" },
];

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function todayTitle() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function formatSessionElapsed(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function errorMessage(error: unknown) {
  if (error instanceof ArenaApiError || error instanceof Error) return error.message;
  return "Não foi possível concluir a operação.";
}

export default function ArenaApp() {
  const [data, setData] = useState<ArenaData>(EMPTY_DATA);
  const [teacherSession, setTeacherSession] = useState<TeacherSession | null | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [classroomTab, setClassroomTab] = useState<ClassroomTab>("home");
  const [classroomSettingsIntent, setClassroomSettingsIntent] = useState<"general" | "delete">("general");
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [arenaActivityId, setArenaActivityId] = useState<string | undefined>();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    void fetchTeacherSession()
      .then((session) => { if (!cancelled) setTeacherSession(session); })
      .catch(() => { if (!cancelled) setTeacherSession(null); });
    const requireAuth = () => setTeacherSession(null);
    window.addEventListener("arena-auth-required", requireAuth);
    return () => { cancelled = true; window.removeEventListener("arena-auth-required", requireAuth); };
  }, []);

  useEffect(() => {
    if (!teacherSession) return;
    let cancelled = false;
    async function bootstrap() {
      const localData = loadData();
      try {
        const domain = await fetchClassroomDomain();
        const [sessionDomain, scoreEvents, activities] = await Promise.all([
          fetchSessionDomain(domain.classrooms),
          fetchScoreDomain(domain.classrooms),
          fetchActivityDomain(domain.classrooms),
        ]);
        if (cancelled) return;
        const selectedClassroomId = selectPreferredClassroomId(domain.classrooms, localData.activeClassroomId);
        setData({
          ...localData,
          ...domain,
          ...sessionDomain,
          scoreEvents,
          activities,
          sessionRuntime: [],
          groupHistory: [],
          activeClassroomId: selectedClassroomId,
          currentSessionId: activeSessionId(sessionDomain.sessions, selectedClassroomId),
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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

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

  function notify(message: string) {
    setToast(message);
  }

  function patch(updater: (current: ArenaData) => ArenaData) {
    setData((current) => updater(current));
  }

  async function refreshClassroomDomain(preferredClassroomId?: string) {
    const domain = await fetchClassroomDomain();
    const [sessionDomain, scoreEvents, activities] = await Promise.all([
      fetchSessionDomain(domain.classrooms),
      fetchScoreDomain(domain.classrooms),
      fetchActivityDomain(domain.classrooms),
    ]);
    setData((current) => {
      const candidate = preferredClassroomId ?? current.activeClassroomId;
      const activeClassroomId = selectPreferredClassroomId(domain.classrooms, candidate);
      return { ...current, ...domain, ...sessionDomain, scoreEvents, activities, sessionRuntime: [], groupHistory: [], activeClassroomId, currentSessionId: activeSessionId(sessionDomain.sessions, activeClassroomId) };
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
      <LiveRegion>{toast}</LiveRegion>
      <main id="main-content" className="main-area" tabIndex={-1}>
        <header className={`topbar app-topbar contextual-topbar ${view === "arena" && currentSession ? "arena-root-topbar-hidden" : ""}`}>
          <button
            type="button"
            className="topbar-brand"
            onClick={() => {
              setView("dashboard");
            }}
            title="Voltar para a Visão geral"
          >
            <span className="topbar-brand-mark">A</span>
            <span>
              <strong>ARENA DEV</strong>
              <small>Classroom Edition · V1</small>
            </span>
          </button>

          <Breadcrumb
            className="context-trail"
            items={[
              {
                id: "dashboard",
                label: "Visão geral",
                current: view === "dashboard",
                onClick: view === "dashboard"
                  ? undefined
                  : () => {
                      setView("dashboard");
                    },
              },
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
              ...(view === "library"
                ? [{
                    id: "library",
                    label: "Biblioteca",
                    current: true,
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

          <div className="topbar-actions app-topbar-actions">
            <button type="button" className="button ghost" aria-current={view === "library" ? "page" : undefined} onClick={() => setView("library")}>Biblioteca</button>
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
              onOpenIntegrations={() => setView("integrations")}
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
                    leaderboard={leaderboard}
                    events={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id)}
                    currentSession={currentSession}
                    onOpenArena={() => setView("arena")}
                    onManageClassroom={() => openClassroomSettings(activeClassroom.id)}
                    onManageIntegration={() => setView("integrations")}
                    notify={notify}
                    refreshClassroomDomain={refreshClassroomDomain}
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
                          notify(errorMessage(error));
                        }
                      })();
                    }}
                  />
                )}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma turma selecionada"
                text="Selecione uma turma na Visão geral ou crie uma nova turma para abrir o workspace pedagógico."
                actionLabel="Ir para Visão geral"
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
                actionLabel="Ir para Visão geral"
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
                actionLabel="Ir para Visão geral"
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
                  ← Visão geral
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
                      { id: "dark", label: "Escuro", description: "Tema padrão do Arena Dev.", icon: "◐" },
                      { id: "light", label: "Claro", description: "Superfícies claras e contraste suave.", icon: "☀" },
                      { id: "system", label: "Sistema", description: "Segue a preferência do sistema operacional.", icon: "◒" },
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
                          <strong><span aria-hidden>{option.icon}</span> {option.label}</strong>
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function OverviewView({ data, onSelectClassroom, onManageClassroom, onOpenIntegrations, notify, refreshClassroomDomain }: {
  data: ArenaData;
  onSelectClassroom: (classroomId: string) => void;
  onManageClassroom: (classroomId: string, intent: "general" | "delete") => void;
  onOpenIntegrations: () => void;
  notify: (message: string) => void;
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
      notify(errorMessage(error));
    } finally {
      setOpenCardMenuId(null);
    }
  }

  return (
    <div className="stack-lg overview-page">
      <div className="metrics-grid overview-metrics">
        <Metric label="Turmas ativas" value={data.classrooms.filter((item) => item.active).length.toString()} hint={`${data.classrooms.length} cadastradas`} />
        <Metric label="Matrículas ativas" value={activeEnrollments.length.toString()} hint="vínculos em todas as turmas" />
        <Metric label="Atividades" value={data.activities.length.toString()} hint="conteúdo preparado" />
        <Metric label="Sessões agora" value={activeSessions.length.toString()} hint="sessões em andamento" />
      </div>

      <div className="overview-toolbar">
        <div className="overview-toolbar-main">
          <div className="segmented-control" aria-label="Filtrar turmas">
            <button className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>Todas <span>{data.classrooms.length}</span></button>
            <button className={filter === "ACTIVE" ? "active" : ""} onClick={() => setFilter("ACTIVE")}>Ativas <span>{data.classrooms.filter((item) => item.active).length}</span></button>
            <button className={filter === "INACTIVE" ? "active" : ""} onClick={() => setFilter("INACTIVE")}>Inativas <span>{data.classrooms.filter((item) => !item.active).length}</span></button>
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
            <option value="RECENT">Recentes primeiro</option>
            <option value="NAME_ASC">Nome A–Z</option>
            <option value="NAME_DESC">Nome Z–A</option>
            <option value="CODE_ASC">Código A–Z</option>
            <option value="CODE_DESC">Código Z–A</option>
          </select>
        </div>

        <div className="overview-toolbar-actions">
          <button className="button ghost" onClick={onOpenIntegrations}>⇄ Vincular plataforma</button>
          <button className="button primary overview-new-classroom" onClick={() => setCreateOpen(true)}>+ Nova turma</button>
        </div>
      </div>

      {!data.classrooms.length ? (
        <EmptyState
          title="Crie sua primeira turma"
          text="A Visão geral é o ponto de entrada do Arena Dev. Crie a turma e, na etapa seguinte, inclua os alunos."
          actionLabel="+ Nova turma"
          onAction={() => setCreateOpen(true)}
        />
      ) : !visibleClassrooms.length ? (
        <MiniEmpty text={query ? "Nenhuma turma encontrada para esta busca." : "Nenhuma turma corresponde a este filtro."} />
      ) : (
        <div className="classroom-card-grid">
          {visibleClassrooms.map((classroom) => {
            const studentCount = data.enrollments.filter((item) => item.classroomId === classroom.id && item.active).length;
            const activityCount = data.activities.filter((item) => item.classroomId === classroom.id).length;
            const eventCount = data.scoreEvents.filter((item) => item.classroomId === classroom.id).length;
            const session = activeSessions.find((item) => item.classroomId === classroom.id);
            return (
              <article
                key={classroom.id}
                className={`overview-class-card ${classroom.active ? "" : "inactive"} ${data.activeClassroomId === classroom.id ? "selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectClassroom(classroom.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectClassroom(classroom.id);
                  }
                }}
              >
                <div className="overview-class-card-head">
                  <div className="overview-class-identity">
                    <div className="classroom-monogram">{classroom.name.trim().charAt(0).toUpperCase()}</div>
                    <div>
                      {!classroom.active && (
                        <div className="status-line">
                          <span className="status">Inativa</span>
                        </div>
                      )}
                      <h3>{classroom.name}</h3>
                      <p>{classroom.code || "Sem código"}</p>
                      {platformsByClassroomId[classroom.id]?.length ? (
                        <div className="classroom-integration-badges">
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
                    </div>
                  </div>
                  <div className="overview-card-actions">
                    <div
                      className="classroom-card-menu-wrap"
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
                  </div>
                </div>
                <div className="overview-class-stats">
                  <div><strong>{studentCount}</strong><span>alunos</span></div>
                  <div><strong>{activityCount}</strong><span>atividades</span></div>
                  <div><strong>{eventCount}</strong><span>eventos XP</span></div>
                </div>
                <div className="overview-class-card-foot">
                  <span>
                    {session ? (
                      <span className="live-pill compact"><span /> SESSÃO EM ANDAMENTO</span>
                    ) : classroom.active ? null : (
                      "Arquivada do fluxo ativo"
                    )}
                  </span>
                  <strong>Abrir</strong>
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

function ClassroomWorkspaceTabs({ tab, onTabChange, studentCount, activityCount, eventCount }: {
  tab: ClassroomTab;
  onTabChange: (tab: ClassroomTab) => void;
  studentCount: number;
  activityCount: number;
  eventCount: number;
}) {
  const badgeFor = (id: ClassroomTab) => {
    if (id === "students") return studentCount;
    if (id === "activities") return activityCount;
    if (id === "history") return eventCount;
    return undefined;
  };

  return (
    <nav className="classroom-section-nav" aria-label="Navegação da turma">
      <div className="classroom-section-tabs" role="tablist" aria-label="Conteúdo da turma">
        {CLASSROOM_TABS.map((item) => {
          const badge = badgeFor(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "classroom-section-tab active" : "classroom-section-tab"}
              onClick={() => onTabChange(item.id)}
            >
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
              {badge !== undefined && <small>{badge}</small>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ClassroomHome({ classroom, data, students, leaderboard, events, currentSession, onOpenArena, onManageClassroom, onManageIntegration, notify, refreshClassroomDomain }: {
  classroom: Classroom;
  data: ArenaData;
  students: Student[];
  leaderboard: { student: Student; xp: number }[];
  events: ArenaData["scoreEvents"];
  currentSession?: ArenaData["sessions"][number];
  onOpenArena: () => void;
  onManageClassroom: () => void;
  onManageIntegration: () => void;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const totalXp = leaderboard.reduce((sum, row) => sum + row.xp, 0);
  const today = new Date().toDateString();
  const todayEvents = events.filter((event) => new Date(event.createdAt).toDateString() === today);
  const activityCount = data.activities.filter((activity) => activity.classroomId === classroom.id).length;
  const arenaCta = classroomArenaCtaState(
    classroom.active !== false,
    currentSession?.title,
  );
  const classroomTheme = classroomThemePresentation(classroom);


  return (
    <div className="stack-lg">
      {!classroom.active && (
        <div className="context-warning">
          <div><strong>Turma inativa</strong><span>O histórico está preservado, mas novas sessões ficam desabilitadas até a reativação.</span></div>
          <button className="button small" onClick={onManageClassroom}>Gerenciar turma</button>
        </div>
      )}
      <section className="classroom-home-hero-v2" style={classroomTheme.style}>
        <div className="classroom-home-watermark" aria-hidden>{classroomTheme.glyph}</div>
        <div className="classroom-home-hero-main">
          <div>
            <span className="eyebrow accent">HOME DA TURMA</span>
            <h2>{classroom.name}</h2>
            <p>Contexto pedagógico para alunos, atividades, ranking, histórico e preparação da aula.</p>
          </div>

          <button
            className="button ghost classroom-manage-button"
            onClick={onManageClassroom}
          >
            Gerenciar turma
          </button>
        </div>

        <div className="classroom-home-hero-cta">
          <div className="arena-launch-shell">
            <button
              className={`arena-launch-button arena-launch-button-centered arena-launch-button-${arenaCta.tone} ${arenaCta.live ? "live" : ""}`}
              onClick={onOpenArena}
              disabled={arenaCta.disabled}
            >
              <span className="arena-launch-icon" aria-hidden>{arenaCta.icon}</span>
              <span className="arena-launch-content">
                <strong>{arenaCta.buttonLabel}</strong>
                <small>{arenaCta.supportingLabel}</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className="metrics-grid">
        <Metric label="Alunos ativos" value={students.length.toString()} hint="matriculados nesta turma" />
        <Metric label="Atividades" value={activityCount.toString()} hint="conteúdo da turma" />
        <Metric label="XP distribuído" value={totalXp.toString()} hint="acumulado da turma" />
        <Metric
          label="Sessão"
          value={currentSession ? "SESSÃO EM ANDAMENTO" : "—"}
          hint={currentSession ? currentSession.title : `${todayEvents.length} evento(s) hoje`}
        />
      </div>

      <ClassroomIntegrationWorkspace
        classroomId={classroom.id}
        studentCount={students.length}
        activityCount={activityCount}
        onManage={onManageIntegration}
      />

    </div>
  );
}

function StudentsView({ data, classroomId, notify, refreshClassroomDomain }: {
  data: ArenaData;
  classroomId: string;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  return (
    <StudentManager
      data={data}
      classroomId={classroomId}
      notify={notify}
      refreshClassroomDomain={refreshClassroomDomain}
      showSummary
      showPageHeader
    />
  );
}

function StudentManager({
  data,
  classroomId,
  notify,
  refreshClassroomDomain,
  showSummary = false,
  showPageHeader = false,
}: {
  data: ArenaData;
  classroomId: string;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
  showSummary?: boolean;
  showPageHeader?: boolean;
}) {
  const [entryMode, setEntryMode] = useState<"add" | "import" | null>(null);
  const [name, setName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [preferredDrafts, setPreferredDrafts] = useState<
    Record<string, string>
  >({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);

  const allRows = data.enrollments
    .filter((enrollment) => enrollment.classroomId === classroomId)
    .map((enrollment) => ({
      enrollment,
      student: data.students.find(
        (student) => student.id === enrollment.studentId,
      )!,
    }))
    .filter((row) => row.student)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
  const activeCount = allRows.filter((row) => row.enrollment.active).length;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const visibleRows = normalizedSearch
    ? allRows.filter(({ student, enrollment }) =>
        [student.name, student.nickname, enrollment.preferredName].some(
          (value) =>
            value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        ),
      )
    : allRows;
  const importCount = bulk
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean).length;

  async function addStudent(
    studentName: string,
    studentPreferredName = "",
    silent = false,
  ) {
    if (!studentName.trim() || (!silent && busy)) return false;
    if (!silent) setBusy(true);
    try {
      await createAndEnrollStudent(classroomId, {
        name: studentName.trim(),
        preferredName: studentPreferredName.trim(),
      });
      if (!silent) {
        await refreshClassroomDomain(classroomId);
        notify("Aluno adicionado à turma.");
      }
      return true;
    } catch (error) {
      if (!silent) notify(errorMessage(error));
      return false;
    } finally {
      if (!silent) setBusy(false);
    }
  }

  async function submitSingleStudent() {
    const created = await addStudent(name, preferredName);
    if (!created) return;
    setName("");
    setPreferredName("");
    setEntryMode(null);
  }

  async function importStudents() {
    const names = bulk
      .split(/\r?\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!names.length || busy) return;
    setBusy(true);
    let imported = 0;
    try {
      for (const studentName of names) {
        if (await addStudent(studentName, "", true)) imported += 1;
      }
      await refreshClassroomDomain(classroomId);
      setBulk("");
      setEntryMode(null);
      notify(
        imported === names.length
          ? `${imported} aluno(s) importado(s).`
          : `${imported} de ${names.length} aluno(s) importados.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(studentId: string, studentName: string) {
    if (busy) return;
    if (
      !window.confirm(
        `Remover ${studentName} desta turma? O cadastro global do aluno será preservado.`,
      )
    )
      return;
    setBusy(true);
    try {
      await removeEnrollment(classroomId, studentId);
      await refreshClassroomDomain(classroomId);
      notify("Aluno removido da turma.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function savePreferredName(studentId: string, currentValue: string) {
    if (busy) return;
    setBusy(true);
    try {
      await updateEnrollmentPreferredName(classroomId, studentId, currentValue);
      await refreshClassroomDomain(classroomId);
      setPreferredDrafts((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      setEditingStudentId(null);
      notify("Nome de exibição atualizado.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStudent(studentId: string, active: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await setEnrollmentActive(classroomId, studentId, !active);
      await refreshClassroomDomain(classroomId);
      notify(
        active ? "Aluno inativado na turma." : "Aluno reativado na turma.",
      );
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <div className="student-manager-header-actions">
      <button
        className="button ghost"
        type="button"
        onClick={() => setEntryMode("import")}
      >
        Importar
      </button>
      <button
        className="button primary"
        type="button"
        onClick={() => setEntryMode("add")}
      >
        + Adicionar aluno
      </button>
    </div>
  );

  return (
    <div className="student-manager stack-lg">
      {showPageHeader ? (
        <div className="student-page-header">
          <div className="student-page-heading">
            <div className="student-page-title-row">
              <h2>Participantes</h2>
              <span className="student-count-badge">
                {allRows.length} {allRows.length === 1 ? "aluno" : "alunos"}
              </span>
            </div>
            <p>Gerencie quem participa da turma e como aparece na Arena.</p>
          </div>
          {actions}
        </div>
      ) : (
        <div className="student-manager-compact-actions">
          <div>
            <strong>Participantes</strong>
            <small>{allRows.length} cadastrados</small>
          </div>
          {actions}
        </div>
      )}

      {(showSummary || allRows.length > 0) && (
        <section className="student-roster" aria-label="Participantes da turma">
          {allRows.length > 0 && (
            <div className="student-roster-toolbar">
              <label className="student-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por nome ou nome de exibição..."
                  aria-label="Buscar participante"
                />
              </label>
              {activeCount !== allRows.length && (
                <span className="student-active-summary">
                  {activeCount} ativos · {allRows.length - activeCount} inativos
                </span>
              )}
            </div>
          )}

          {!allRows.length ? (
            <MiniEmpty text="Nenhum participante nesta turma. Adicione um aluno ou importe uma lista." />
          ) : !visibleRows.length ? (
            <div className="student-search-empty">
              <strong>Nenhum participante encontrado</strong>
              <span>
                Não encontramos resultados para “{searchQuery.trim()}”.
              </span>
              <button
                className="text-button"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="student-table student-table-v3">
              <div className="table-head student-table-head-v3">
                <span>Participante</span>
                <span>Status</span>
                <span>XP</span>
                <span aria-label="Ações" />
              </div>
              {visibleRows.map(({ student, enrollment }) => {
                const xp = xpForStudent(
                  data.scoreEvents,
                  classroomId,
                  student.id,
                );
                const draft =
                  preferredDrafts[student.id] ?? enrollment.preferredName;
                const dirty = draft !== enrollment.preferredName;
                const isEditing = editingStudentId === student.id;
                const displayName =
                  enrollment.preferredName ||
                  student.nickname ||
                  "Não definido";
                return (
                  <div
                    className={`table-row student-table-row-v3${enrollment.active ? "" : " is-inactive"}`}
                    key={enrollment.id}
                  >
                    <div className="student-cell student-identity-v3">
                      <Avatar student={student} />
                      <div className="student-identity-copy">
                        <strong>{student.name}</strong>
                        {isEditing ? (
                          <div className="student-display-name-editor">
                      <input
                        className="input"
                              autoFocus
                              aria-label={`Nome de exibição de ${student.name}`}
                        value={draft}
                              onChange={(event) =>
                                setPreferredDrafts((current) => ({
                                  ...current,
                                  [student.id]: event.target.value,
                                }))
                              }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && dirty && !busy) {
                            event.preventDefault();
                            void savePreferredName(student.id, draft);
                          }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setPreferredDrafts((current) => ({
                                    ...current,
                                    [student.id]: enrollment.preferredName,
                                  }));
                                  setEditingStudentId(null);
                                }
                        }}
                              placeholder="Nome de exibição"
                        disabled={busy}
                      />
                      <button
                              className="button ghost student-inline-save"
                        type="button"
                        disabled={busy || !dirty}
                              onClick={() => {
                                void savePreferredName(student.id, draft);
                              }}
                            >
                              {busy ? "Salvando..." : "Salvar"}
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setPreferredDrafts((current) => ({
                                  ...current,
                                  [student.id]: enrollment.preferredName,
                                }));
                                setEditingStudentId(null);
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            className="student-display-name"
                            type="button"
                            onClick={() => setEditingStudentId(student.id)}
                            aria-label={`Editar nome de exibição de ${student.name}`}
                          >
                            <span>Nome de exibição: {displayName}</span>
                            <span
                              className="student-edit-icon"
                              aria-hidden="true"
                      >
                              ✎
                            </span>
                      </button>
                        )}
                    </div>
                    </div>
                    <span className={enrollment.active ? "student-status-normal" : "student-status-inactive"}>
                      {enrollment.active ? null : "Inativo"}
                    </span>
                    <b className="student-xp">{xp} XP</b>
                    <div className="student-row-actions">
                      <button
                        type="button"
                        className="student-row-action"
                        aria-label={enrollment.active ? `Desativar ${student.name}` : `Reativar ${student.name}`}
                        title={enrollment.active ? "Desativar participante" : "Reativar participante"}
                        onClick={() => { void toggleStudent(student.id, enrollment.active); }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10M6.3 5.7a8 8 0 1 0 11.4 0" /></svg>
                      </button>
                      <button
                        type="button"
                        className="student-row-action danger"
                        aria-label={`Remover ${student.name} da turma`}
                        title="Remover da turma"
                        onClick={() => { void removeStudent(student.id, student.name); }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {entryMode === "add" && (
        <Modal
          open
          title="Adicionar aluno"
          subtitle="Cadastro individual"
          onClose={() => {
            if (!busy) setEntryMode(null);
          }}
          size="medium"
        >
          <div className="modal-section-stack">
            <label className="field">
              <span>Nome completo</span>
              <input
                className="input"
                autoFocus
                placeholder="Ex.: Ana Luiza de Sousa"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>
                Nome de exibição <small>opcional</small>
              </span>
              <input
                className="input"
                placeholder="Como aparecerá nesta turma"
                value={preferredName}
                onChange={(event) => setPreferredName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && name.trim() && !busy) {
                    event.preventDefault();
                    void submitSingleStudent();
                  }
                }}
                disabled={busy}
              />
            </label>
            <div className="modal-footer">
              <button
                className="button ghost"
                onClick={() => setEntryMode(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={busy || !name.trim()}
                onClick={() => {
                  void submitSingleStudent();
                }}
              >
                {busy ? "Adicionando..." : "Adicionar aluno"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {entryMode === "import" && (
        <Modal
          open
          title="Importar alunos"
          subtitle="Um aluno por linha"
          onClose={() => {
            if (!busy) setEntryMode(null);
          }}
          size="medium"
        >
          <div className="modal-section-stack">
            <label className="field">
              <span>Lista de nomes</span>
              <textarea
                className="textarea student-import-textarea"
                rows={10}
                placeholder={"Ana Luiza\nCarlos Henrique\nJoão Pedro"}
                value={bulk}
                onChange={(event) => setBulk(event.target.value)}
                disabled={busy}
              />
            </label>
            <div className="inline-note">
              {importCount ? (
                <>
                  <strong>{importCount} aluno(s) identificado(s)</strong>
                  <span>Revise a lista antes de importar.</span>
                </>
              ) : (
                <span>
                  Cole um nome por linha. Também aceitamos nomes separados por
                  ponto e vírgula.
                </span>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="button ghost"
                onClick={() => setEntryMode(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={busy || !importCount}
                onClick={() => {
                  void importStudents();
                }}
              >
                {busy
                  ? "Importando..."
                  : `Importar ${importCount || ""} aluno(s)`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClassroomCreateModal({ data, onClose, onCreated, notify, refreshClassroomDomain }: {
  data: ArenaData;
  onClose: () => void;
  onCreated: (classroomId: string) => void;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [createdId, setCreatedId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const classroom = await createClassroomApi({ name: name.trim(), code: code.trim() });
      setCreatedId(classroom.id);
      await refreshClassroomDomain(classroom.id);
      setStep(2);
      notify("Turma criada. Agora inclua os alunos ou conclua por enquanto.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const classroom = data.classrooms.find((item) => item.id === createdId);
  return (
    <Modal open title="Nova turma" subtitle="Criação guiada em duas etapas" onClose={onClose} size={step === 2 ? "large" : "medium"}>
      <div className="wizard-steps" aria-label="Etapas da criação">
        <div className={step === 1 ? "active" : "done"}><span>1</span><div><strong>Dados da turma</strong><small>Nome e código</small></div></div>
        <i />
        <div className={step === 2 ? "active" : ""}><span>2</span><div><strong>Alunos</strong><small>Cadastro ou lista</small></div></div>
      </div>
      {step === 1 ? (
        <div className="modal-section-stack">
          <label className="field"><span>Nome da turma</span><input className="input" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Desenvolvimento de Sistemas" /></label>
          <label className="field"><span>Código (opcional)</span><input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ex.: TDS-2026" /></label>
          <div className="modal-footer"><button className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={!name.trim() || busy} onClick={() => { void create(); }}>{busy ? "Criando..." : "Criar e continuar"}</button></div>
        </div>
      ) : createdId && classroom ? (
        <div className="modal-section-stack">
          <div className="context-lock"><span>Turma criada</span><strong>{classroom.name}</strong><small>{classroom.code || "Sem código"}</small></div>
          <StudentManager data={data} classroomId={createdId} notify={notify} refreshClassroomDomain={refreshClassroomDomain} />
          <div className="modal-footer"><button className="button ghost" onClick={() => onCreated(createdId)}>Concluir por enquanto</button><button className="button primary" onClick={() => onCreated(createdId)}>Abrir turma</button></div>
        </div>
      ) : (
        <MiniEmpty text="Atualizando dados da turma..." />
      )}
    </Modal>
  );
}

function ClassroomManagementPage({
  classroom,
  data,
  currentSession,
  initialAction = "general",
  onBack,
  onDeleted,
  notify,
  refreshClassroomDomain,
}: {
  classroom: Classroom;
  data: ArenaData;
  currentSession?: ArenaData["sessions"][number];
  initialAction?: "general" | "delete";
  onBack: () => void;
  onDeleted: () => void;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [name, setName] = useState(classroom.name);
  const [code, setCode] = useState(classroom.code);
  const [themeColor, setThemeColor] = useState<ClassroomThemeColor>(classroom.themeColor ?? "emerald");
  const [themeIcon, setThemeIcon] = useState<ClassroomThemeIcon>(classroom.themeIcon ?? "code");
  const [busy, setBusy] = useState(false);
  const [managementAction, setManagementAction] = useState<"archive" | "delete" | null>(
    initialAction === "delete" ? "delete" : null,
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const hasActiveSession = Boolean(
    currentSession && currentSession.status === "ACTIVE" && !currentSession.endedAt,
  );
  const enrollmentCount = data.enrollments.filter((item) => item.classroomId === classroom.id).length;
  const sessionCount = data.sessions.filter((session) => session.classroomId === classroom.id).length;
  const activityCount = data.activities.filter((activity) => activity.classroomId === classroom.id).length;
  const scoreCount = data.scoreEvents.filter((event) => event.classroomId === classroom.id).length;
  const deleteConfirmed = deleteConfirmation === classroom.name;
  const appearancePreview = classroomThemePresentation({ ...classroom, themeColor, themeIcon });

  useEffect(() => {
    setName(classroom.name);
    setCode(classroom.code);
    setThemeColor(classroom.themeColor ?? "emerald");
    setThemeIcon(classroom.themeIcon ?? "code");
    setDeleteConfirmation("");
    setManagementAction(initialAction === "delete" ? "delete" : null);
  }, [
    classroom.id,
    classroom.name,
    classroom.code,
    classroom.themeColor,
    classroom.themeIcon,
    initialAction,
  ]);

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await updateClassroomApi({
        id: classroom.id,
        name: name.trim(),
        code: code.trim(),
        active: classroom.active !== false,
        themeColor,
        themeIcon,
        studentStudyAccessEnabled: classroom.studentStudyAccessEnabled ?? false,
      });
      await refreshClassroomDomain(classroom.id);
      notify("Configurações da turma salvas.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function setArchived(archived: boolean) {
    if (busy || (archived && hasActiveSession)) return;
    setBusy(true);
    try {
      await updateClassroomApi({
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        active: !archived,
        themeColor: classroom.themeColor ?? "emerald",
        themeIcon: classroom.themeIcon ?? "code",
        studentStudyAccessEnabled: classroom.studentStudyAccessEnabled ?? false,
      });
      await refreshClassroomDomain(classroom.id);
      notify(archived ? "Turma arquivada. O histórico foi preservado." : "Turma reativada.");
      setManagementAction(null);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function setStudyAccess(enabled: boolean) {
    if (busy || enabled === classroom.studentStudyAccessEnabled) return;
    setBusy(true);
    try {
      await updateClassroomApi({
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        active: classroom.active !== false,
        themeColor: classroom.themeColor ?? "emerald",
        themeIcon: classroom.themeIcon ?? "code",
        studentStudyAccessEnabled: enabled,
      });
      await refreshClassroomDomain(classroom.id);
      notify(enabled
        ? "Espaço de estudo disponibilizado aos alunos."
        : "As Jornadas foram ocultadas. O progresso dos alunos foi preservado.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeClassroom() {
    if (busy || hasActiveSession || !deleteConfirmed) return;
    setBusy(true);
    try {
      await deleteClassroomApi(classroom.id, deleteConfirmation);
      await refreshClassroomDomain();
      notify("Turma excluída definitivamente. Os cadastros globais dos alunos foram preservados.");
      onDeleted();
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="classroom-settings-page stack-lg">
      <header className="classroom-settings-heading">
        <div>
          <span className="eyebrow accent">GERENCIAR TURMA</span>
          <h2>{classroom.name}</h2>
          <p>Identidade, aparência, status e ciclo de vida desta turma.</p>
        </div>
        <div className="classroom-settings-heading-actions">
          <button className="button ghost" type="button" onClick={onBack}>
            ← Voltar para a turma
          </button>
          <button className="button primary" type="button" disabled={busy || !name.trim()} onClick={() => { void save(); }}>
            {busy ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </header>

      <div className="classroom-settings-grid">
        <div className="classroom-settings-main">
          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">GERAL</span>
              <h3>Identificação</h3>
              <p>Defina como a turma é identificada no Arena Dev.</p>
            </div>

            <div className="classroom-settings-fields">
              <label className="field">
                <span>Nome da turma</span>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="field">
                <span>Código <small>opcional</small></span>
                <input className="input" value={code} onChange={(event) => setCode(event.target.value)} />
              </label>
            </div>
          </section>

          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">APARÊNCIA</span>
              <h3>Identidade visual da turma</h3>
              <p>Cor e ícone funcionam como referência contextual sem alterar o tema inteiro da aplicação.</p>
            </div>

            <div className="classroom-settings-appearance">
              <div className="field">
                <span>Cor da turma</span>
                <div className="classroom-color-picker" role="radiogroup" aria-label="Cor da turma">
                  {CLASSROOM_THEME_COLORS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={themeColor === option.id}
                      aria-label={option.label}
                      title={option.label}
                      className={themeColor === option.id ? "classroom-color-swatch selected" : "classroom-color-swatch"}
                      style={{ background: option.value }}
                      onClick={() => setThemeColor(option.id)}
                    >
                      {themeColor === option.id && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span>Ícone da turma</span>
                <div className="classroom-icon-picker classroom-settings-icon-picker" role="radiogroup" aria-label="Ícone da turma">
                  {CLASSROOM_THEME_ICONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={themeIcon === option.id}
                      className={themeIcon === option.id ? "classroom-icon-choice selected" : "classroom-icon-choice"}
                      onClick={() => setThemeIcon(option.id)}
                      title={option.label}
                    >
                      <strong>{option.glyph}</strong>
                      <small>{option.label}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="classroom-appearance-preview classroom-settings-preview" style={appearancePreview.style}>
                <span className="classroom-appearance-preview-icon" aria-hidden>{appearancePreview.glyph}</span>
                <div>
                  <small>Pré-visualização</small>
                  <strong>{name.trim() || classroom.name}</strong>
                  <span>{code.trim() || classroom.code || "Sem código"}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">ESPAÇO DE ESTUDO</span>
              <h3>Jornadas dos alunos</h3>
              <p>Controle se as Jornadas publicadas desta turma aparecem no espaço persistente de estudo. Isso não interfere no /join nem nas experiências ao vivo.</p>
            </div>
            <button
              className="classroom-study-access"
              type="button"
              role="switch"
              aria-checked={classroom.studentStudyAccessEnabled}
              disabled={busy}
              onClick={() => { void setStudyAccess(!classroom.studentStudyAccessEnabled); }}
            >
              <span>
                <strong>Disponibilizar Jornadas para os alunos</strong>
                <small>{classroom.studentStudyAccessEnabled ? "Disponível no espaço de estudo" : "Oculto do espaço de estudo"}</small>
              </span>
              <i className={classroom.studentStudyAccessEnabled ? "active" : ""} aria-hidden><b /></i>
            </button>
          </section>
        </div>

        <aside className="classroom-settings-side">
          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">STATUS</span>
              <h3>{classroom.active === false ? "Turma arquivada" : "Turma ativa"}</h3>
              <p>
                {classroom.active === false
                  ? "Fora do fluxo operacional diário, com histórico preservado."
                  : "Disponível para alunos, atividades e novas aulas."}
              </p>
            </div>

            <div className="classroom-status-summary">
              <div>
                <span>Turma</span>
                <strong>{classroom.active === false ? "Arquivada" : "Ativa"}</strong>
              </div>
              <div>
                <span>Aula</span>
                <strong>{hasActiveSession ? "Em andamento" : "Sem aula aberta"}</strong>
              </div>
            </div>
          </section>

          <section className="classroom-settings-card">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow accent">CICLO DE VIDA</span>
              <h3>{classroom.active === false ? "Reativar turma" : "Arquivar turma"}</h3>
              <p>
                {classroom.active === false
                  ? "Retorne a turma ao fluxo operacional."
                  : "Retire a turma do uso diário preservando alunos, atividades, sessões, histórico e XP."}
              </p>
            </div>

            {classroom.active === false ? (
              <button className="button primary full" type="button" disabled={busy} onClick={() => { void setArchived(false); }}>
                Reativar turma
              </button>
            ) : managementAction !== "archive" ? (
              <button className="button ghost full" type="button" onClick={() => setManagementAction("archive")}>
                Arquivar turma
              </button>
            ) : (
              <div className="classroom-lifecycle-confirmation">
                {hasActiveSession ? (
                  <div className="inline-note warning">
                    Há uma sessão em andamento. Encerre-a antes de arquivar a turma.
                  </div>
                ) : (
                  <>
                    <strong>Arquivar “{classroom.name}”?</strong>
                    <p>O histórico será preservado e a turma poderá ser reativada depois.</p>
                    <div className="confirm-actions">
                      <button className="button ghost" type="button" onClick={() => setManagementAction(null)}>Cancelar</button>
                      <button className="button primary" type="button" disabled={busy} onClick={() => { void setArchived(true); }}>
                        Confirmar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="classroom-settings-card classroom-settings-danger">
            <div className="classroom-settings-section-heading">
              <span className="eyebrow danger-eyebrow">ZONA DE RISCO</span>
              <h3>Excluir esta turma</h3>
              <p>A exclusão é permanente e remove todos os dados pertencentes a esta turma.</p>
            </div>

            <div className="classroom-delete-impact">
              <span>{enrollmentCount} vínculo(s)</span>
              <span>{activityCount} atividade(s)</span>
              <span>{sessionCount} sessão(ões)</span>
              <span>{scoreCount} evento(s) de XP</span>
            </div>

            {managementAction !== "delete" ? (
              <button className="button danger-outline full" type="button" onClick={() => setManagementAction("delete")}>
                Excluir esta turma
              </button>
            ) : hasActiveSession ? (
              <div className="classroom-delete-confirmation">
                <strong>Há uma sessão em andamento.</strong>
                <p>Encerre a sessão antes da exclusão definitiva para não interromper participantes conectados.</p>
                <button className="button ghost" type="button" onClick={() => setManagementAction(null)}>Voltar</button>
              </div>
            ) : (
              <div className="classroom-delete-confirmation">
                <strong>Esta ação não pode ser desfeita.</strong>
                <p>Digite exatamente o nome completo da turma:</p>
                <code className="classroom-delete-name">{classroom.name}</code>
                <label className="field">
                  <span>Nome completo da turma</span>
                  <input
                    className="input"
                    autoComplete="off"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder={classroom.name}
                  />
                </label>
                <div className="confirm-actions">
                  <button
                    className="button ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setManagementAction(null);
                      setDeleteConfirmation("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="button danger"
                    type="button"
                    disabled={busy || !deleteConfirmed}
                    onClick={() => { void removeClassroom(); }}
                  >
                    {busy ? "Excluindo..." : "Excluir definitivamente"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}


function ArenaView({ data, classroomId, students, currentSession, sessionParticipants, preferredActivityId, onPreferredActivityChange, onBack, onGoDashboard, teacherUsername, onOpenSettings, onLogout, onSessionEnded, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  students: Student[];
  currentSession?: ArenaData["sessions"][number];
  sessionParticipants: SessionParticipant[];
  preferredActivityId?: string;
  onPreferredActivityChange: (activityId?: string) => void;
  onBack: () => void;
  onGoDashboard: () => void;
  teacherUsername: string;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSessionEnded: () => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: (message: string) => void;
}) {
  const [presentIds, setPresentIds] = useState<string[]>(students.map((s) => s.id));
  const [title, setTitle] = useState(`Aula · ${todayTitle()}`);
  const [drawPresentationBusy, setDrawPresentationBusy] = useState(false);
  const {
    activeDynamic,
    activeTool,
    drawSettingsOpen,
    sessionQrOpen,
    customScoreOpen,
    selectDynamic,
    selectTool,
    closeTool,
    resetNavigation,
    openDrawSettings,
    closeDrawSettings,
    openSessionQr,
    closeSessionQr,
    toggleCustomScore,
    closeCustomScore,
  } = useArenaToolState();
  const [groups, setGroups] = useState<string[][]>(currentSession?.groups ?? []);
  const [groupSize, setGroupSize] = useState(currentSession?.groupSize ?? 2);
  const [bossName, setBossName] = useState("Spaghetti Code");
  const [bossHp, setBossHp] = useState(100);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [presenceBusyId, setPresenceBusyId] = useState<string | undefined>();
  const [mechanicsBusy, setMechanicsBusy] = useState(false);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [realtimeBusy, setRealtimeBusy] = useState(false);
  const [liveFlowState, setLiveFlowState] = useState<LiveFlowState | null>(null);
  const [liveFlowBusy, setLiveFlowBusy] = useState(false);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [sessionNow, setSessionNow] = useState(() => Date.now());
  const classroom = data.classrooms.find((item) => item.id === classroomId);
  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId),
    [data.activities, classroomId],
  );
  const [activityId, setActivityId] = useState<string>(currentSession?.activityId ?? preferredActivityId ?? "");
  const selectorMode = presentationToSelectorMode(currentSession?.selectorPresentation);
  const {
    busy: drawBusy,
    phase: selectionPhase,
    selectedStudentId: selectedId,
    spotlightStudentId,
    setSelectedStudentId: setSelectedId,
    draw,
    closeSpotlight,
  } = useParticipantSelection({
    sessionId: currentSession?.id,
    presentStudentIds: currentSession?.presentStudentIds ?? [],
    initialSelectedStudentId: currentSession?.lastDrawnStudentId,
    mode: selectorMode,
    onRuntime: (runtime) => {
      if (!currentSession) return;
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === currentSession.id
            ? mergeSessionMechanics(session, runtime)
            : session
        ),
      }));
    },
    onAfterDraw: () => {
      if (!currentSession) return;
      void fetchSessionEventsBySession(currentSession.id)
        .then(setSessionEvents)
        .catch(() => undefined);
    },
    onError: (error) => notify(errorMessage(error)),
  });

  const {
    reason,
    setReason,
    customPoints,
    setCustomPoints,
    scoreFeedback,
    addScore,
    addBuzzerScore,
  } = useArenaScoring({
    classroomId,
    sessionId: currentSession?.id,
    activityId: currentSession?.activityId,
    questionId: currentSession?.currentQuestionId,
    selectedStudentId: selectedId,
    onScoreEvent: (event) => {
      patch((current) => ({
        ...current,
        scoreEvents: [...current.scoreEvents, event],
      }));
    },
    notify,
  });

  const {
    joinCode,
    setJoinCode,
    buzzerState,
    setBuzzerState,
    timerState,
    setTimerState,
    wordCloudState,
    setWordCloudState,
    pollState,
    setPollState,
    quizState,
    setQuizState,
    realtimeStatus,
  } = useArenaRealtime({
    sessionId: currentSession?.id,
    notify,
    onSelectedStudent: setSelectedId,
    onParticipantsChanged: refreshRealtimeParticipants,
  });

  useEffect(() => {
    if (typeof window !== "undefined") setPublicBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!sessionQrOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSessionQr();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessionQrOpen]);

  useEffect(() => {
    if (!currentSession) return;
    setSessionNow(Date.now());
    const intervalId = window.setInterval(() => setSessionNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [currentSession?.id]);

  useEffect(() => {
    if (!currentSession) {
      setSessionEvents([]);
      return;
    }

    let active = true;
    void fetchSessionEventsBySession(currentSession.id)
      .then((events) => {
        if (active) setSessionEvents(events);
      })
      .catch(() => {
        if (active) setSessionEvents([]);
      });

    return () => {
      active = false;
    };
  }, [currentSession?.id]);

  useEffect(() => {
    if (!currentSession) {
      setLiveFlowState(null);
      return;
    }

    let active = true;
    void fetchLiveFlow(currentSession.id)
      .then((flow) => {
        if (active) setLiveFlowState(flow);
      })
      .catch((error) => {
        if (active) notify(errorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [currentSession?.id, currentSession?.activityId]);

  async function refreshRealtimeParticipants(sessionId: string) {
    try {
      const participants = await fetchSessionParticipants(sessionId);
      patch((current) => ({
        ...current,
        sessionParticipants: [
          ...current.sessionParticipants.filter((participant) => participant.sessionId !== sessionId),
          ...participants,
        ],
        sessions: current.sessions.map((session) => session.id === sessionId ? {
          ...session,
          presentStudentIds: participants.filter((participant) => participant.present).map((participant) => participant.studentId),
        } : session),
      }));
    } catch {
      // O próximo evento ou reload fará uma nova sincronização.
    }
  }


  useEffect(() => {
    if (preferredActivityId) {
      if (currentSession && currentSession.activityId !== preferredActivityId) void changeArenaActivity(preferredActivityId);
      else if (!currentSession) setActivityId(preferredActivityId);
      onPreferredActivityChange(undefined);
      return;
    }
    if (currentSession?.activityId) setActivityId(currentSession.activityId);
  }, [currentSession?.activityId, currentSession?.id, preferredActivityId]);

  useEffect(() => {
    if (!currentSession) setPresentIds(students.map((s) => s.id));
  }, [students, currentSession]);

  useEffect(() => {
    setSelectedId(currentSession?.lastDrawnStudentId);
  }, [currentSession?.id, currentSession?.lastDrawnStudentId]);

  useEffect(() => {
    setGroups(currentSession?.groups ?? []);
    setGroupSize(currentSession?.groupSize ?? 2);
  }, [currentSession?.id, currentSession?.groups, currentSession?.groupSize]);

  async function startSession() {
    if (!presentIds.length || sessionBusy) return;
    setSessionBusy(true);
    try {
      const result = await createSessionApi({
        classroomId,
        title: title.trim() || `Aula · ${todayTitle()}`,
        presentStudentIds: presentIds,
      });
      let started = result.session;
      if (activityId) {
        const runtime = await setArenaActivityApi(result.session.id, activityId);
        started = mergeSessionMechanics(started, runtime);
      }
      patch((current) => ({
        ...current,
        sessions: [...current.sessions.filter((session) => session.id !== started.id), started],
        sessionParticipants: [
          ...current.sessionParticipants.filter((participant) => participant.sessionId !== started.id),
          ...result.participants,
        ],
        currentSessionId: started.id,
      }));
      resetNavigation(activityId ? "runbook" : "draw");
      notify("Arena iniciada. Sessão e mecânicas estão no PostgreSQL.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setSessionBusy(false);
    }
  }

  async function endSession() {
    if (!currentSession || sessionBusy) return;
    const confirmed = window.confirm(
      `Encerrar a sessão "${currentSession.title}"?\n\n`
      + "Participantes deixarão a sessão ativa. Histórico, XP e atividades permanecem salvos."
    );
    if (!confirmed) return;
    setSessionBusy(true);
    try {
      const finished = await finishSessionApi(currentSession.id);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id ? {
          ...session,
          status: finished.status,
          endedAt: finished.endedAt,
        } : session),
        currentSessionId: undefined,
      }));
      setSelectedId(undefined);
      setGroups([]);
      resetNavigation("draw");
      setLiveFlowState(null);
      onPreferredActivityChange(undefined);
      notify("Sessão encerrada e persistida.");

      // Navega em uma nova task depois que o estado da sessão foi limpo.
      window.setTimeout(() => {
        onSessionEnded();
      }, 0);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setSessionBusy(false);
    }
  }

  async function changePresence(participant: SessionParticipant, present: boolean) {
    if (!currentSession || presenceBusyId) return;
    setPresenceBusyId(participant.id);
    try {
      const updated = await setParticipantPresence(currentSession.id, participant.id, present);
      patch((current) => ({
        ...current,
        sessionParticipants: current.sessionParticipants.map((item) => item.id === updated.id ? updated : item),
        sessions: current.sessions.map((session) => session.id === currentSession.id ? {
          ...session,
          presentStudentIds: present
            ? Array.from(new Set([...session.presentStudentIds, updated.studentId]))
            : session.presentStudentIds.filter((studentId) => studentId !== updated.studentId),
        } : session),
      }));
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setPresenceBusyId(undefined);
    }
  }

  async function releaseDevice(participant: SessionParticipant) {
    if (!currentSession || presenceBusyId) return;
    setPresenceBusyId(participant.id);
    try {
      const updated = await releaseParticipantDevice(currentSession.id, participant.id);
      patch((current) => ({
        ...current,
        sessionParticipants: current.sessionParticipants.map((item) => item.id === updated.id ? updated : item),
      }));
      notify(`Dispositivo de ${participant.displayName || participant.preferredName || participant.nickname || participant.name} liberado.`);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setPresenceBusyId(undefined);
    }
  }

  function confirmSpotlight() {
    if (!spotlightStudentId) return;
    setSelectedId(spotlightStudentId);
    closeSpotlight();
  }

  async function changeDrawPresentation(mode: ParticipantSelectorMode) {
    if (!currentSession || drawPresentationBusy || mode === selectorMode) return;

    setDrawPresentationBusy(true);
    try {
      const runtime = await setDrawPresentationApi(
        currentSession.id,
        selectorModeToPresentation(mode),
      );
      closeSpotlight();
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === currentSession.id
            ? mergeSessionMechanics(session, runtime)
            : session
        ),
      }));
      notify(
        mode === "wheel"
          ? "Apresentação do sorteio alterada para Roleta."
          : "Apresentação do sorteio alterada para Grid + Spotlight.",
      );
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setDrawPresentationBusy(false);
    }
  }

  async function changeArenaActivity(nextActivityId: string) {
    setActivityId(nextActivityId);
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await setArenaActivityApi(
        currentSession.id,
        nextActivityId || undefined,
      );
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === currentSession.id
            ? mergeSessionMechanics(session, runtime)
            : session
        ),
      }));

      const flow = await fetchLiveFlow(currentSession.id);
      setLiveFlowState(flow);

      notify(
        nextActivityId
          ? "Atividade conectada à Arena e persistida."
          : "Arena em modo livre.",
      );
    } catch (error) {
      setActivityId(currentSession.activityId ?? "");
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  function applyLiveFlowResult(result: {
    liveFlow: LiveFlowState;
    runtime: import("@/lib/types").SessionRuntimeState;
  }) {
    setLiveFlowState(result.liveFlow);
    if (!currentSession) return;

    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session
      ),
    }));
  }

  async function startPreparedFlow() {
    if (!currentSession || liveFlowBusy) return;
    setLiveFlowBusy(true);
    try {
      applyLiveFlowResult(await startLiveFlow(currentSession.id));
      notify("Roteiro ao Vivo iniciado.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setLiveFlowBusy(false);
    }
  }

  async function movePreparedFlow(direction: "previous" | "next") {
    if (!currentSession || liveFlowBusy) return;
    setLiveFlowBusy(true);
    try {
      const result = direction === "next"
        ? await nextLiveFlow(currentSession.id)
        : await previousLiveFlow(currentSession.id);
      applyLiveFlowResult(result);

      const currentIndex = result.liveFlow.currentIndex;
      const currentStep =
        currentIndex === undefined
          ? undefined
          : result.liveFlow.steps[currentIndex];

      if (currentStep) {
        notify(
          `Bloco ${currentIndex! + 1} de ${result.liveFlow.steps.length}: `
          + `${currentStep.title || currentStep.type}.`
        );
      }
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setLiveFlowBusy(false);
    }
  }

  async function nextActivityQuestion() {
    if (!currentSession?.activityId || mechanicsBusy) {
      if (!currentSession?.activityId) notify("Selecione uma atividade com questões ou use o modo livre.");
      return;
    }
    setMechanicsBusy(true);
    try {
      const result = await nextArenaQuestionApi(currentSession.id);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session),
      }));
      if (result.completed) notify("Todas as questões desta atividade já foram apresentadas.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function restartActivityQuestions() {
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await restartArenaQuestionsApi(currentSession.id);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, runtime)
          : session),
      }));
      notify("Sequência de questões reiniciada.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function createGroups() {
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const result = await organizeGroupsApi(currentSession.id, groupSize);
      setGroups(result.groups);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, result.runtime)
          : session),
      }));
      notify(groupSize === 1 ? "Organização individual ativada." : `${result.groups.length} grupo(s) organizado(s) com histórico persistido.`);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function createBoss() {
    if (!currentSession || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await startBossApi(currentSession.id, bossName.trim() || "Boss", bossHp);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, runtime)
          : session),
      }));
      notify("Boss iniciado e persistido.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function damageBoss(amount: number) {
    if (!currentSession?.boss || mechanicsBusy) return;
    setMechanicsBusy(true);
    try {
      const runtime = await damageBossApi(currentSession.id, amount);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id
          ? mergeSessionMechanics(session, runtime)
          : session),
      }));
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setMechanicsBusy(false);
    }
  }

  async function rotateSessionCode() {
    if (!currentSession || realtimeBusy) return;
    setRealtimeBusy(true);
    try {
      const next = await rotateJoinCode(currentSession.id);
      setJoinCode(next);
      notify("Novo código da sessão gerado. O anterior foi invalidado.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setRealtimeBusy(false);
    }
  }

  async function toggleBuzzer(open: boolean) {
    if (!currentSession || realtimeBusy) return;
    setRealtimeBusy(true);
    try {
      const state = open ? await openBuzzerApi(currentSession.id) : await closeBuzzerApi(currentSession.id);
      setBuzzerState(state);
      if (open) setSelectedId(undefined);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setRealtimeBusy(false);
    }
  }

  async function copySessionCode() {
    if (!joinCode) {
      notify("Aguarde a geração do código da sessão.");
      return;
    }

    try {
      await navigator.clipboard.writeText(joinCode.code);
      notify("Código da sessão copiado.");
    } catch {
      notify("Não foi possível copiar o código automaticamente.");
    }
  }

  function openProjector() {
    if (!joinCode) {
      notify("Aguarde a geração do código da sessão.");
      return;
    }
    const projectorUrl = `/projector?code=${encodeURIComponent(joinCode.code)}`;
    window.open(projectorUrl, "_blank", "noopener,noreferrer");
  }

  const selected = students.find((student) => student.id === selectedId);
  const selectedXp = selected ? xpForStudent(data.scoreEvents, classroomId, selected.id) : 0;
  const activeActivity = data.activities.find((activity) => activity.id === (currentSession?.activityId ?? activityId));
  const currentQuestion = activeActivity?.questions?.find((question) => question.id === currentSession?.currentQuestionId);
  const recentDrawEvents = sessionEvents
    .filter((event) => event.eventType === "DRAW_COMPLETED")
    .sort((a, b) => b.sequenceNo - a.sequenceNo);
  const presentStudentIdSet = new Set(currentSession?.presentStudentIds ?? []);
  const drawnStudentIds = new Set(
    Object.entries(currentSession?.drawCounts ?? {})
      .filter(([studentId, count]) => count > 0 && presentStudentIdSet.has(studentId))
      .map(([studentId]) => studentId),
  );
  const drawCoverage = currentSession?.presentStudentIds.length
    ? Math.round((drawnStudentIds.size / currentSession.presentStudentIds.length) * 100)
    : 0;
  const selectedDrawEvent = selectedId
    ? recentDrawEvents.find((event) => event.payload.studentId === selectedId)
    : undefined;
  const bossHpPercent = currentSession?.boss
    ? Math.max(0, Math.round((currentSession.boss.currentHp / currentSession.boss.maxHp) * 100))
    : 0;
  const bossDamageTotal = currentSession?.boss
    ? currentSession.boss.maxHp - currentSession.boss.currentHp
    : 0;
  const bossPhase = !currentSession?.boss
    ? "Aguardando"
    : currentSession.boss.currentHp === 0
      ? "Derrotado"
      : bossHpPercent <= 30
        ? "Crítico"
        : bossHpPercent <= 70
          ? "Enfraquecido"
          : "Inteiro";
  const bossLifecycle = !currentSession?.boss
    ? "PREPARAR"
    : currentSession.boss.currentHp === 0
      ? "RESULTADO"
      : "AO VIVO";
  if (!currentSession) {
    return (
      <div className="two-col uneven">
        <Panel title="Abrir nova sessão" subtitle="A presença define quem participa dos sorteios">
          <div className="form-grid">
            <label className="field-label">Título da sessão</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="field-label">Fonte dos desafios</label>
            <select className="select full" value={activityId} onChange={(e) => { void changeArenaActivity(e.target.value); }}>
              <option value="">Modo livre — pergunta oral ou conteúdo externo</option>
              {classActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {activity.questions?.length ?? 0} questões</option>)}
            </select>
            {activeActivity && (
              <div className="arena-source-note">
                <strong>{activeActivity.title}</strong>
                <span>
                  {activeActivity.topic || "Sem tópico"} ·{" "}
                  {liveFlowState?.activityId === activeActivity.id
                    && liveFlowState.steps.length > 0
                    ? `${liveFlowState.steps.length} bloco(s) no roteiro`
                    : `${activeActivity.questions?.length ?? 0} questão(ões)`}
                </span>
              </div>
            )}
          </div>
          <div className="attendance-head"><strong>Presença</strong><span>{presentIds.length}/{students.length} presentes</span></div>
          <div className="attendance-list">
            {students.map((student) => (
              <label key={student.id} className="check-row">
                <input type="checkbox" checked={presentIds.includes(student.id)} onChange={(e) => setPresentIds((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} />
                <Avatar student={student} />
                <span>{student.name}</span>
              </label>
            ))}
          </div>
          <div className="inline-actions"><button className="text-button" onClick={() => setPresentIds(students.map((s) => s.id))}>Marcar todos</button><button className="text-button" onClick={() => setPresentIds([])}>Limpar</button></div>
          <button className="button primary large full" onClick={() => { void startSession(); }} disabled={!presentIds.length || sessionBusy}>{sessionBusy ? "Iniciando..." : "Iniciar Arena"}</button>
        </Panel>
        <Panel title="Como funciona" subtitle="Fluxo recomendado em aula">
          <div className="steps">
            <Step n="01" title="Todos pensam" text="Apresente a questão antes do sorteio para manter a turma inteira ativa." />
            <Step n="02" title="Sorteio inteligente" text="Quem foi menos sorteado ganha mais peso; a repetição imediata é evitada." />
            <Step n="03" title="Registre XP" text="Resposta, debug, desafio, colaboração ou ajuste ficam no histórico." />
            <Step n="04" title="Varie a dinâmica" text="Use Boss Battle e duplas/grupos para alternar competição e cooperação." />
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <ArenaLiveShell
      sidebar={
        <ArenaSidebar
          activeDynamic={activeDynamic}
          activeTool={activeTool}
          teacherUsername={teacherUsername}
          onGoDashboard={onGoDashboard}
          onOpenSettings={onOpenSettings}
          onLogout={onLogout}
          onSelectDynamic={(dynamic) => {
            selectDynamic(dynamic);
            if (dynamic !== "draw") {
              closeSpotlight();
            }
          }}
          onSelectTool={selectTool}
        />
      }
      header={
        <ArenaSessionHeader
          classroomName={classroom?.name ?? "Turma"}
          sessionTitle={currentSession.title}
          elapsed={formatSessionElapsed(currentSession.startedAt, sessionNow)}
          sessionBusy={sessionBusy}
          canProject={Boolean(joinCode)}
          onGoDashboard={onGoDashboard}
          onBack={onBack}
          onOpenProjector={openProjector}
          onEndSession={() => { void endSession(); }}
        />
      }
    >
      <div className="arena-cockpit">
      <main className="arena-cockpit-main">

      {activeDynamic === "runbook" && (
        <div className="stack-lg arena-tab-content">
          <div className="arena-activity-strip">
            <div>
              <span className="eyebrow accent">FONTE DA ARENA</span>
              <strong>{activeActivity?.title ?? "Modo livre"}</strong>
            </div>
            <select className="select" value={currentSession.activityId ?? ""} onChange={(e) => { void changeArenaActivity(e.target.value); }}>
              <option value="">Modo livre</option>
              {classActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
            </select>
          </div>

          {activeActivity
            && liveFlowState?.activityId === activeActivity.id
            && liveFlowState.steps.length > 0 ? (
              <LiveFlowConductor
                flow={liveFlowState}
                currentQuestion={currentQuestion}
                busy={liveFlowBusy}
                onStart={() => { void startPreparedFlow(); }}
                onPrevious={() => { void movePreparedFlow("previous"); }}
                onNext={() => { void movePreparedFlow("next"); }}
                onOpenWordCloud={() => {
                  selectDynamic("wordcloud");
                }}
              />
            ) : activeActivity ? (
              <Panel
                title="Questão da Arena"
                subtitle={`${activeActivity.title} · ${(currentSession.answeredQuestionIds ?? []).length}/${activeActivity.questions?.length ?? 0} apresentadas`}
              >
                {currentQuestion ? (
                  <div className="arena-question-card">
                    <div className="question-meta">
                      <span>{QUESTION_TYPE_LABEL[currentQuestion.type]}</span>
                      <span>{QUESTION_DIFFICULTY_LABEL[currentQuestion.difficulty]}</span>
                      <span>{currentQuestion.points} XP sugeridos</span>
                    </div>
                    <h3>{currentQuestion.statement}</h3>
                    {currentQuestion.code && <pre>{currentQuestion.code}</pre>}
                    {currentQuestion.options && (
                      <div className="arena-question-options">
                        {currentQuestion.options.map((option) => (
                          <div key={option.id}>
                            <b>{option.id}</b>
                            <span>{option.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <MiniEmpty text="Clique em próxima questão quando quiser usar o conteúdo da atividade na Arena." />
                )}
                <div className="inline-actions solid-actions">
                  {(currentSession.answeredQuestionIds?.length ?? 0)
                    >= (activeActivity.questions?.length ?? 0)
                    && (
                      <button
                        className="button ghost"
                        onClick={() => { void restartActivityQuestions(); }}
                      >
                        Reiniciar questões
                      </button>
                    )}
                  <button
                    className="button primary"
                    onClick={() => { void nextActivityQuestion(); }}
                  >
                    Próxima questão
                  </button>
                </div>
              </Panel>
            ) : null}

        </div>
      )}

      {activeDynamic !== "runbook" && (
        <div className="stack-lg arena-tab-content">
          {activeDynamic === "draw" ? (
          <div className="smart-draw-workspace">
            {selectorMode === "grid-spotlight" ? (
              <ParticipantSelectionExperience
                students={students}
                presentStudentIds={currentSession.presentStudentIds}
                drawCounts={currentSession.drawCounts}
                selectedStudentId={spotlightStudentId}
                phase={selectionPhase}
                onDraw={() => { void draw(); }}
                onConfirm={confirmSpotlight}
                onOpenSettings={openDrawSettings}
              />
            ) : (
            <div className="smart-draw-hero">
              <div className="smart-draw-titlebar">
                <div className="smart-draw-title-copy">
                  <span className="smart-draw-title-icon" aria-hidden="true"><ArenaGlyph name="draw" /></span>
                  <div>
                    <span className="eyebrow accent">DINÂMICA AO VIVO</span>
                    <h2>Sorteio Inteligente</h2>
                    <p>Escolha um aluno de forma justa e dinâmica, mantendo toda a turma em jogo.</p>
                  </div>
                </div>
                <button type="button" className="smart-draw-settings" onClick={openDrawSettings}>
                  ⚙ Ajustes
                </button>
              </div>

              <WheelParticipantSelector
                participants={students.filter((student) => currentSession.presentStudentIds.includes(student.id))}
                selectedStudentId={selectedId}
                drawing={drawBusy}
                onDraw={() => { void draw(); }}
              />

              <div className={selected ? "selected-student-bar active" : "selected-student-bar"}>
                <div className="selected-student-primary">
                  <div className="selected-student-main">
                    {selected ? (
                      <>
                        <Avatar student={selected} large />
                        <div className="selected-student-copy">
                          <div className="selected-student-name-row">
                            <h3>{selected.nickname || selected.name}</h3>
                            <span>🏆 Sorteado agora</span>
                          </div>
                          <p>
                            Participações nesta sessão: {currentSession.drawCounts[selected.id] ?? 0}
                            <b>·</b>
                            <em>+{selectedXp} XP</em>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="draw-result-placeholder" aria-hidden="true">◎</div>
                        <div className="selected-student-copy">
                          {currentSession.presentStudentIds.length === 0 ? (
                            <>
                              <h3>Nenhum aluno presente</h3>
                              <p>Marque a presença dos alunos para habilitar o sorteio.</p>
                            </>
                          ) : (
                            <>
                              <h3>Aguardando o próximo sorteio</h3>
                              <p>O resultado aparecerá aqui e poderá ser pontuado imediatamente.</p>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {selected && (
                    <button type="button" className={scoreFeedback ? "selected-student-cta success" : "selected-student-cta"} onClick={() => { setReason("Participação"); void addScore(5, "COLLABORATION", "Participação"); }}>
                      {scoreFeedback ? "✓ Pontuado" : "Confirmar e pontuar →"}
                    </button>
                  )}
                </div>

                <section className="draw-coverage-summary" aria-label={`Cobertura do sorteio: ${drawnStudentIds.size} de ${currentSession.presentStudentIds.length}, ${drawCoverage}%`}>
                  <div className="draw-coverage-count">
                    <span className="draw-coverage-badge">já sorteados</span>
                    <details className="draw-history-popover draw-history-inline">
                      <summary aria-label="Exibir últimos sorteados" title="Exibir últimos sorteados">
                        <strong>{drawnStudentIds.size}/{currentSession.presentStudentIds.length}</strong>
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <div className="draw-history-menu" aria-label="Últimos sorteados">
                        {recentDrawEvents.length > 0 ? recentDrawEvents.slice(0, 10).map((event, index) => {
                          const studentId = typeof event.payload.studentId === "string" ? event.payload.studentId : "";
                          const student = students.find((item) => item.id === studentId);
                          return (
                            <span key={event.id} title={dateTime(event.occurredAt)}>
                              {index > 0 && <i aria-hidden="true">·</i>}
                              {student?.nickname || student?.name?.split(" ")[0] || "Aluno"}
                            </span>
                          );
                        }) : (
                          <small>Nenhum sorteio registrado nesta sessão.</small>
                        )}
                      </div>
                    </details>
                  </div>

                  <div
                    className="draw-coverage-ring"
                    style={{ "--coverage-angle": `${drawCoverage * 3.6}deg` } as CSSProperties}
                    aria-hidden="true"
                  >
                    <span>{drawCoverage}%</span>
                  </div>
                </section>
              </div>
            </div>

            )}

            <section className="quick-score-dock" aria-label="Ações rápidas de pontuação">
              <div className="quick-score-head">
                <div>
                  <strong>Ações rápidas</strong>
                  <small>Pontue o aluno selecionado.</small>
                </div>
                <label className="quick-score-student">
                  <span className="sr-only">Aluno para pontuação</span>
                  {selected ? <Avatar student={selected} /> : <span className="quick-score-student-placeholder" aria-hidden="true">—</span>}
                  <select
                    className="select"
                    aria-label="Aluno para pontuação"
                    value={selectedId ?? ""}
                    onChange={(e) => setSelectedId(e.target.value || undefined)}
                  >
                    <option value="">Selecionar aluno</option>
                    {students.filter((student) => currentSession.presentStudentIds.includes(student.id)).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                  </select>
                </label>
              </div>

              <div className="quick-score-presets">
                {SCORE_PRESETS.map((preset) => (
                  <button key={`${preset.points}-${preset.label}`} disabled={!selected} onClick={() => { setReason(preset.label); void addScore(preset.points, preset.category, preset.label); }}>
                    <b>+{preset.points}</b><span>{preset.points === 5 ? "Participação" : preset.label}</span>
                  </button>
                ))}
                <div className="quick-score-custom-wrap">
                  <button
                    type="button"
                    className={customScoreOpen ? "quick-score-custom-trigger active" : "quick-score-custom-trigger"}
                    disabled={!selected}
                    aria-expanded={customScoreOpen}
                    onClick={() => {
                      setReason("Outra pontuação");
                      toggleCustomScore();
                    }}
                  >
                    <b>✎</b><span>Personalizar</span>
                  </button>
                  {customScoreOpen && (
                    <div className="quick-score-custom-popover">
                      <label>
                        <span>Pontos</span>
                        <input className="input compact" type="number" value={customPoints} onChange={(e) => setCustomPoints(Number(e.target.value))} />
                      </label>
                      <label>
                        <span>Motivo ou observação</span>
                        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: colaboração excepcional" />
                      </label>
                      <button
                        className="button primary"
                        disabled={!selected || !reason.trim()}
                        onClick={() => {
                          void addScore(customPoints, "ADJUSTMENT", reason);
                          closeCustomScore();
                        }}
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
          ) : activeDynamic === "wordcloud" ? (
            <div className="arena-dynamic-workspace">
              <WordCloudPanel
                sessionId={currentSession.id}
                state={wordCloudState}
                onStateChange={setWordCloudState}
                notify={notify}
                joinCode={joinCode}
                publicBaseUrl={publicBaseUrl}
                realtimeStatus={realtimeStatus}
                connectedCount={sessionParticipants.filter((participant) => participant.connected).length}
                presentCount={sessionParticipants.filter((participant) => participant.present).length}
                showAccessCard={false}
              />
            </div>
          ) : activeDynamic === "poll" ? (
            <div className="arena-dynamic-workspace">
              <PollPanel
                sessionId={currentSession.id}
                state={pollState}
                onStateChange={setPollState}
                notify={notify}
                joinCode={joinCode}
                publicBaseUrl={publicBaseUrl}
                realtimeStatus={realtimeStatus}
                connectedCount={sessionParticipants.filter((participant) => participant.connected).length}
                presentCount={sessionParticipants.filter((participant) => participant.present).length}
                showAccessCard={false}
              />
            </div>
          ) : activeDynamic === "quiz" ? (
            <div className="arena-quiz-workspace">
              <QuizPanel
                sessionId={currentSession.id}
                state={quizState}
                onStateChange={setQuizState}
                questions={activeActivity?.questions ?? []}
                presentCount={sessionParticipants.filter((participant) => participant.present).length}
                joinCode={joinCode}
                notify={notify}
                canAdvanceFlow={Boolean(liveFlowState?.started && liveFlowState.hasNext)}
                onContinue={() => movePreparedFlow("next")}
              />
            </div>
          ) : activeDynamic === "buzzer" ? (
            <div className="arena-dynamic-workspace buzzer-workspace">
              <section className="buzzer-hero">
                <div className="buzzer-titlebar">
                  <div>
                    <span className="eyebrow accent">DINÂMICA AO VIVO</span>
                    <h2>Buzzer</h2>
                    <p>Velocidade com ordem oficial definida pelo servidor.</p>
                  </div>
                  <span className={`buzzer-status-badge ${buzzerState.status.toLowerCase()}`}>
                    {buzzerState.status === "OPEN" ? "● AO VIVO" : buzzerState.status === "CLOSED" ? "ENCERRADO" : "PREPARAR"}
                  </span>
                </div>

                <div className="buzzer-stage">
                  <div className={`buzzer-orb ${buzzerState.status.toLowerCase()}`}>
                    <span className="buzzer-orb-icon" aria-hidden="true">⚡</span>
                    <strong>
                      {buzzerState.status === "OPEN"
                        ? "VALENDO!"
                        : buzzerState.status === "CLOSED"
                          ? "RODADA ENCERRADA"
                          : "PRONTO"}
                    </strong>
                    <small>
                      {buzzerState.status === "OPEN"
                        ? "Aguardando o primeiro clique"
                        : buzzerState.status === "CLOSED"
                          ? `${buzzerState.presses.length} resposta(s) registradas`
                          : "Abra uma rodada quando quiser"}
                    </small>
                  </div>

                  <div className="buzzer-stage-actions">
                    <button
                      type="button"
                      className="button primary buzzer-primary-action"
                      onClick={() => { void toggleBuzzer(true); }}
                      disabled={realtimeBusy}
                    >
                      {buzzerState.status === "OPEN" ? "Nova rodada" : "Abrir Buzzer"}
                    </button>
                    <button
                      type="button"
                      className="button danger-outline"
                      onClick={() => { void toggleBuzzer(false); }}
                      disabled={realtimeBusy || buzzerState.status !== "OPEN"}
                    >
                      Encerrar rodada
                    </button>
                  </div>

                  <div className="buzzer-metrics">
                    <div>
                      <strong>{sessionParticipants.filter((participant) => participant.connected).length}</strong>
                      <span>conectados</span>
                    </div>
                    <div>
                      <strong>{buzzerState.presses.length}</strong>
                      <span>cliques</span>
                    </div>
                    <div>
                      <strong>{buzzerState.openedAt ? dateTime(buzzerState.openedAt) : "—"}</strong>
                      <span>abertura</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="buzzer-ranking-card">
                <div className="buzzer-ranking-head">
                  <div>
                    <span className="eyebrow accent">ORDEM OFICIAL</span>
                    <h3>Quem apertou primeiro?</h3>
                  </div>
                  <span>{buzzerState.presses.length} resposta(s)</span>
                </div>

                {buzzerState.presses.length > 0 ? (
                  <div className="buzzer-podium-list">
                    {buzzerState.presses.map((press) => {
                      const student = students.find((item) => item.id === press.studentId);
                      return (
                        <div className={press.position === 1 ? "buzzer-podium-row winner" : "buzzer-podium-row"} key={press.id}>
                          <div className="buzzer-position">#{press.position}</div>
                          {student ? <Avatar student={student} /> : <div className="buzzer-avatar-fallback">{(press.displayName || press.nickname || press.name).slice(0, 1)}</div>}
                          <div className="buzzer-student-copy">
                            <strong>{press.displayName || press.nickname || press.name}</strong>
                            <small>{press.position === 1 ? "Primeiro clique confirmado pelo servidor" : dateTime(press.receivedAt)}</small>
                          </div>
                          {press.position === 1 ? (
                            <div className="buzzer-winner-actions">
                              <button type="button" onClick={() => { void addBuzzerScore(press.studentId, 5); }}>+5 XP</button>
                              <button type="button" onClick={() => { void addBuzzerScore(press.studentId, 10); }}>+10 XP</button>
                            </div>
                          ) : (
                            <span className="buzzer-order-time">{dateTime(press.receivedAt)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="buzzer-empty-state">
                    <span aria-hidden="true">⚡</span>
                    <strong>{buzzerState.status === "OPEN" ? "Aguardando o primeiro clique" : "Nenhuma rodada disputada ainda"}</strong>
                    <p>{buzzerState.status === "OPEN" ? "Assim que alguém apertar, a ordem aparecerá aqui em tempo real." : "Abra o Buzzer quando quiser transformar uma pergunta em disputa ao vivo."}</p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="arena-dynamic-workspace boss-workspace">
              <section className="boss-hero">
                <div className="boss-titlebar">
                  <div>
                    <span className="eyebrow accent">DINÂMICA AO VIVO</span>
                    <h2>Boss Battle</h2>
                    <p>Transforme desafios da aula em dano coletivo contra um objetivo compartilhado.</p>
                  </div>
                  <div className="boss-title-actions">
                    <span className={`boss-phase-badge ${currentSession.boss?.currentHp === 0 ? "defeated" : currentSession.boss ? "active" : "idle"}`}>
                      {bossLifecycle}
                    </span>
                    <button type="button" className="smart-draw-settings" onClick={openProjector} disabled={!joinCode}>
                      Projetar ↗
                    </button>
                  </div>
                </div>

                {currentSession.boss ? (
                  <div className="boss-live-grid">
                    <section className="boss-stage" aria-label={`Boss ${currentSession.boss.name}`}>
                      <div className={`boss-core ${currentSession.boss.currentHp === 0 ? "defeated" : bossHpPercent <= 30 ? "critical" : ""}`}>
                        <span className="boss-core-rune" aria-hidden="true">◆</span>
                        <span className="boss-core-label">BOSS</span>
                        <strong>{currentSession.boss.name}</strong>
                        <small>{bossPhase}</small>
                      </div>

                      <div className="boss-hp-panel">
                        <div className="boss-hp-head">
                          <span>HP DO BOSS</span>
                          <strong>{currentSession.boss.currentHp} / {currentSession.boss.maxHp}</strong>
                        </div>
                        <div className="boss-hp-track" role="progressbar" aria-label="Vida do Boss" aria-valuemin={0} aria-valuemax={currentSession.boss.maxHp} aria-valuenow={currentSession.boss.currentHp}>
                          <span style={{ width: `${bossHpPercent}%` }} />
                        </div>
                        <div className="boss-hp-foot">
                          <span>{bossHpPercent}% restante</span>
                          <span>{bossDamageTotal} de dano acumulado</span>
                        </div>
                      </div>

                      <div className="boss-session-metrics">
                        <div><strong>{currentSession.presentStudentIds.length}</strong><span>heróis presentes</span></div>
                        <div><strong>{bossDamageTotal}</strong><span>dano causado</span></div>
                        <div><strong>{bossPhase}</strong><span>estado atual</span></div>
                      </div>

                      {currentSession.boss.currentHp === 0 && (
                        <div className="boss-victory-banner" role="status">
                          <span aria-hidden="true">🏆</span>
                          <div>
                            <strong>BOSS DERROTADO</strong>
                            <p>Objetivo coletivo concluído. A vitória já foi persistida na sessão.</p>
                          </div>
                        </div>
                      )}
                    </section>

                    <aside className="boss-combat-panel">
                      <div className="boss-combat-head">
                        <div>
                          <span className="eyebrow accent">CONTROLE DE COMBATE</span>
                          <h3>Aplicar dano</h3>
                        </div>
                        <span>manual</span>
                      </div>

                      <p className="boss-combat-note">
                        Dano manual nesta versão — Quiz e XP não reduzem HP automaticamente.
                      </p>

                      <div className="boss-attacks">
                        <button type="button" disabled={mechanicsBusy || currentSession.boss.currentHp === 0} onClick={() => { void damageBoss(10); }}>
                          <span>⚔</span><strong>−10 HP</strong><small>Ataque leve</small>
                        </button>
                        <button type="button" disabled={mechanicsBusy || currentSession.boss.currentHp === 0} onClick={() => { void damageBoss(20); }}>
                          <span>⚡</span><strong>−20 HP</strong><small>Ataque médio</small>
                        </button>
                        <button type="button" disabled={mechanicsBusy || currentSession.boss.currentHp === 0} onClick={() => { void damageBoss(30); }}>
                          <span>✦</span><strong>−30 HP</strong><small>Ataque crítico</small>
                        </button>
                      </div>

                      <div className="boss-rule-card">
                        <strong>Regra desta versão</strong>
                        <p>O professor decide quando um desafio foi cumprido e aplica o dano. O backend persiste HP, derrota e sincroniza participantes e Projetor.</p>
                      </div>

                      {currentSession.boss.currentHp === 0 && (
                        <div className="boss-next-challenge">
                          <span className="eyebrow accent">PRÓXIMO DESAFIO</span>
                          <input className="input" value={bossName} onChange={(event) => setBossName(event.target.value)} placeholder="Nome do novo Boss" />
                          <div className="boss-hp-config">
                            <input className="input" type="number" min="10" value={bossHp} onChange={(event) => setBossHp(Math.max(10, Number(event.target.value)))} aria-label="HP do novo Boss" />
                            <button className="button primary" disabled={mechanicsBusy} onClick={() => { void createBoss(); }}>Iniciar novo Boss</button>
                          </div>
                        </div>
                      )}
                    </aside>
                  </div>
                ) : (
                  <div className="boss-setup-grid">
                    <section className="boss-setup-card">
                      <span className="eyebrow accent">PREPARAR BATALHA</span>
                      <h3>Crie o objetivo coletivo</h3>
                      <p>Defina um nome memorável e a quantidade de HP. O Boss será sincronizado com toda a sessão.</p>

                      <label>
                        <span>Nome do Boss</span>
                        <input className="input" value={bossName} onChange={(event) => setBossName(event.target.value)} placeholder="Ex.: Spaghetti Code" />
                      </label>

                      <label>
                        <span>HP inicial</span>
                        <input className="input" type="number" min="10" value={bossHp} onChange={(event) => setBossHp(Math.max(10, Number(event.target.value)))} />
                      </label>

                      <div className="boss-hp-presets" aria-label="Atalhos de HP">
                        {[50, 100, 150, 200].map((hp) => (
                          <button key={hp} type="button" className={bossHp === hp ? "active" : ""} onClick={() => setBossHp(hp)}>
                            {hp} HP
                          </button>
                        ))}
                      </div>

                      <button className="button primary boss-start-button" disabled={mechanicsBusy || !bossName.trim()} onClick={() => { void createBoss(); }}>
                        {mechanicsBusy ? "Invocando..." : "Iniciar Boss Battle"}
                      </button>
                    </section>

                    <aside className="boss-preview-card">
                      <span className="eyebrow accent">PREVIEW</span>
                      <div className="boss-core preview">
                        <span className="boss-core-rune" aria-hidden="true">◆</span>
                        <span className="boss-core-label">BOSS</span>
                        <strong>{bossName.trim() || "Seu Boss"}</strong>
                        <small>{bossHp} HP</small>
                      </div>
                      <div className="boss-rule-card">
                        <strong>Objetivo compartilhado</strong>
                        <p>Todos acompanham a mesma vida do Boss. Cada ataque aplicado pelo professor é persistido e transmitido em tempo real.</p>
                      </div>
                    </aside>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}


        </main>

        <ArenaContextRail
          activeDynamic={activeDynamic}
          selectorMode={selectorMode}
          students={students}
          presentStudentIds={currentSession.presentStudentIds}
          sessionParticipants={sessionParticipants}
          drawnCount={drawnStudentIds.size}
          drawHistory={recentDrawEvents.map((event) => ({
            id: event.id,
            studentId: typeof event.payload.studentId === "string" ? event.payload.studentId : "",
            occurredAt: event.occurredAt,
          }))}
          sessionId={currentSession.id}
          joinCode={joinCode}
          publicBaseUrl={publicBaseUrl}
          onOpenAttendance={() => selectTool("attendance")}
          onCopySessionCode={() => { void copySessionCode(); }}
          onOpenQr={openSessionQr}
        />
      </div>

      {sessionQrOpen && joinCode && publicBaseUrl && (
        <div
          className="arena-session-qr-modal"
          role="presentation"
          onClick={closeSessionQr}
        >
          <section
            className="arena-session-qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arena-session-qr-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="arena-session-qr-close"
              onClick={closeSessionQr}
              aria-label="Fechar QR Code ampliado"
            >
              ×
            </button>
            <span className="arena-session-qr-eyebrow">ENTRE NA ARENA</span>
            <h2 id="arena-session-qr-title">Escaneie para participar</h2>
            <div className="arena-session-qr-large">
              <img
                src={joinQrImageUrl(currentSession.id, publicBaseUrl, joinCode.code, 720)}
                alt={`QR Code ampliado da sessão ${joinCode.code}`}
              />
            </div>
            <strong>{joinCode.code}</strong>
            <p>Aponte a câmera do celular para acessar a sessão.</p>
          </section>
        </div>
      )}

      <DrawSettingsDrawer
        open={drawSettingsOpen}
        mode={selectorMode}
        busy={drawPresentationBusy}
        onClose={closeDrawSettings}
        onPresentationChange={(mode) => { void changeDrawPresentation(mode); }}
      />

      <ArenaToolDrawer
        open={activeTool === "timer"}
        title="Timer"
        subtitle="Controle o tempo sem sair da dinâmica atual."
        onClose={closeTool}
      >
        <TimerPanel
          sessionId={currentSession.id}
          state={timerState}
          onStateChange={setTimerState}
          notify={notify}
        />
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "groups"}
        title="Organizar turma"
        subtitle="Monte duplas e grupos mantendo a dinâmica principal visível."
        onClose={closeTool}
      >
        <div className="arena-tool-groups">
          <div className="group-controls">
            <label>
              Formato
              <select className="select" value={groupSize} onChange={(event) => setGroupSize(Number(event.target.value))}>
                <option value={1}>Individual</option>
                <option value={2}>Duplas</option>
                <option value={3}>Trios</option>
                <option value={4}>Grupos de 4</option>
                <option value={5}>Grupos de 5</option>
              </select>
            </label>
            <button className="button primary" onClick={() => { void createGroups(); }}>
              {groupSize === 1 ? "Ativar individual" : "Organizar turma"}
            </button>
          </div>
          {groups.length > 0 ? (
            <div className="groups-grid arena-tool-groups-grid">
              {groups.map((group, index) => (
                <div className="group-card" key={index}>
                  <b>{groupSize === 1 ? `INDIVIDUAL ${String(index + 1).padStart(2, "0")}` : `GRUPO ${String(index + 1).padStart(2, "0")}`}</b>
                  {group.map((id) => (
                    <span key={id}>
                      {students.find((student) => student.id === id)?.nickname || students.find((student) => student.id === id)?.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <MiniEmpty text="Escolha um formato e organize a turma quando precisar." />
          )}
        </div>
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "attendance"}
        title="Presença e acesso"
        subtitle="Gerencie check-in, presença e dispositivos sem abandonar a dinâmica."
        size="wide"
        onClose={closeTool}
      >
        <div className="arena-tool-attendance">
          <SessionAccessCard
            sessionId={currentSession.id}
            joinCode={joinCode}
            publicBaseUrl={publicBaseUrl}
            notify={notify}
            onRotate={rotateSessionCode}
            rotateBusy={realtimeBusy}
            compact
            drawer
            title="Entrada dos alunos"
            subtitle=""
            onExpandQr={openSessionQr}
          />

          <div className="arena-tool-roster">
            <div className="arena-tool-roster-head">
              <strong>Participantes</strong>
              <div className="arena-tool-roster-badges">
                <span className="online">{sessionParticipants.filter((participant) => participant.connected).length} online</span>
                <span>{currentSession.presentStudentIds.length}/{sessionParticipants.length} presentes</span>
              </div>
            </div>
            {sessionParticipants.map((participant) => {
              const student = data.students.find((item) => item.id === participant.studentId);
              if (!student) return null;
              return (
                <div key={participant.id} className="arena-tool-roster-row">
                  <Avatar student={student} />
                  <div>
                    <strong>{student.name}</strong>
                    <small>{participant.connected ? "online" : "offline"}</small>
                  </div>
                  <label className="arena-checkin-presence-control">
                    <input
                      type="checkbox"
                      checked={participant.present}
                      disabled={presenceBusyId === participant.id}
                      onChange={(event) => { void changePresence(participant, event.target.checked); }}
                    />
                    <span aria-hidden="true" />
                    <small>{participant.present ? "Presente" : "Ausente"}</small>
                  </label>
                  {participant.connected && (
                    <button
                      type="button"
                      className="arena-tool-release"
                      onClick={() => { void releaseDevice(participant); }}
                      aria-label={`Liberar dispositivo de ${student.name}`}
                      title="Liberar dispositivo"
                    >
                      ⋯
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ArenaToolDrawer>

      <ArenaToolDrawer
        open={activeTool === "score"}
        title="Pontuação rápida"
        subtitle="Aplique XP mantendo a dinâmica principal no palco."
        onClose={closeTool}
      >
        <div className="arena-tool-score">
          <label className="field-label">Aluno</label>
          <select className="select full" value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value || undefined)}>
            <option value="">Selecione um aluno</option>
            {students
              .filter((student) => currentSession.presentStudentIds.includes(student.id))
              .map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>

          <div className="score-presets arena-tool-score-presets">
            {SCORE_PRESETS.map((preset) => (
              <button
                key={`${preset.points}-${preset.label}`}
                disabled={!selected}
                onClick={() => { setReason(preset.label); void addScore(preset.points, preset.category, preset.label); }}
              >
                <b>+{preset.points}</b>
                <span>{preset.points === 5 ? "Participação" : preset.label}</span>
              </button>
            ))}
          </div>

          <div className="custom-score arena-tool-score-custom">
            <input className="input compact" type="number" value={customPoints} onChange={(event) => setCustomPoints(Number(event.target.value))} />
            <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo ou observação" />
            <button className="button primary" disabled={!selected || !reason.trim()} onClick={() => addScore(customPoints, "ADJUSTMENT", reason)}>
              Aplicar
            </button>
          </div>
        </div>
      </ArenaToolDrawer>
    </ArenaLiveShell>
  );
}

function ActivitiesView({ data, classroomId, classroomName, students, onUseInArena, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  classroomName: string;
  students: Student[];
  onUseInArena: (activityId: string) => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: (message: string) => void;
}) {
  type ActivityModal = "editor" | "delivery" | "import" | "external-results" | null;
  type EditorTab = "general" | "questions" | "flow";

  const [modal, setModal] = useState<ActivityModal>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("general");
  const [activityId, setActivityId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [points, setPoints] = useState(10);
  const [bonus, setBonus] = useState(5);
  const [resourceKind, setResourceKind] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");
  const [platform, setPlatform] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>([]);
  const [stepsActivityId, setStepsActivityId] = useState<string | undefined>();
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsDirty, setStepsDirty] = useState(false);
  const [deliveryActivityId, setDeliveryActivityId] = useState<string | undefined>();
  const [dashboardActivityId, setDashboardActivityId] = useState<string | undefined>();
  const [externalResultActivityId, setExternalResultActivityId] = useState<string | undefined>();
  const [delivered, setDelivered] = useState<string[]>([]);
  const [onTime, setOnTime] = useState<string[]>([]);
  const [sourceClassroomId, setSourceClassroomId] = useState("");
  const [sourceActivityId, setSourceActivityId] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);

  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId).slice().sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()),
    [data.activities, classroomId],
  );
  const otherClassrooms = data.classrooms.filter((classroom) => classroom.id !== classroomId);
  const sourceActivities = data.activities.filter((activity) => activity.classroomId === sourceClassroomId);
  const deliveryActivity = classActivities.find((activity) => activity.id === deliveryActivityId);
  const dashboardActivity = classActivities.find((activity) => activity.id === dashboardActivityId);
  const externalResultActivity = classActivities.find((activity) => activity.id === externalResultActivityId);
  const activityEvents = data.scoreEvents.filter((event) => event.classroomId === classroomId && (event.source === "ACTIVITY" || event.category === "SUBMISSION"));
  const totalQuestions = classActivities.reduce((sum, activity) => sum + (activity.questions?.length ?? 0), 0);
  const activityXp = activityEvents.reduce((sum, event) => sum + event.points, 0);

  function draftInput(): ActivityUpsertInput {
    return {
      classroomId,
      title: title.trim(),
      topic: topic.trim() || undefined,
      points,
      onTimeBonus: bonus,
      resource: {
        kind: resourceKind,
        platform: resourceKind === "EXTERNAL" ? platform.trim() || undefined : undefined,
        url: resourceKind === "EXTERNAL" ? resourceUrl.trim() || undefined : undefined,
      },
      questions,
    };
  }

  function resetDraft() {
    setActivityId(undefined);
    setTitle("");
    setTopic("");
    setPoints(10);
    setBonus(5);
    setResourceKind("INTERNAL");
    setPlatform("");
    setResourceUrl("");
    setQuestions([]);
    setActivitySteps([]);
    setStepsActivityId(undefined);
    setStepsLoading(false);
    setStepsDirty(false);
    setEditorTab("general");
  }

  function openNewActivity() {
    resetDraft();
    setModal("editor");
  }

  function openActivity(activity: Activity, tab: EditorTab = "general") {
    setActivityId(activity.id);
    setTitle(activity.title);
    setTopic(activity.topic ?? "");
    setPoints(activity.points);
    setBonus(activity.onTimeBonus);
    setResourceKind(activity.resource?.kind ?? "INTERNAL");
    setPlatform(activity.resource?.platform ?? "");
    setResourceUrl(activity.resource?.url ?? "");
    setQuestions(activity.questions ?? []);
    setActivitySteps([]);
    setStepsActivityId(undefined);
    setStepsLoading(false);
    setStepsDirty(false);
    setEditorTab(tab);
    setModal("editor");
  }

  function validateDraft() {
    if (!title.trim()) {
      notify("Informe o título da atividade.");
      return false;
    }
    if (resourceKind === "EXTERNAL" && resourceUrl.trim()) {
      try {
        new URL(resourceUrl.trim());
      } catch {
        notify("Informe um link externo válido.");
        return false;
      }
    }
    return true;
  }

  async function saveActivity(closeAfter = true): Promise<Activity | undefined> {
    if (!validateDraft() || activityBusy) return undefined;
    setActivityBusy(true);
    try {
      const existing = activityId ? data.activities.find((activity) => activity.id === activityId) : undefined;
      const saved = existing
        ? await updateActivityApi(existing.id, draftInput())
        : await createActivityApi(draftInput());
      patch((current) => ({
        ...current,
        activities: existing
          ? current.activities.map((item) => item.id === saved.id ? saved : item)
          : [...current.activities, saved],
      }));
      setActivityId(saved.id);
      setQuestions(saved.questions ?? []);
      notify(existing ? "Atividade atualizada no PostgreSQL." : "Atividade criada no PostgreSQL.");
      if (closeAfter) setModal(null);
      return saved;
    } catch (error) {
      notify(errorMessage(error));
      return undefined;
    } finally {
      setActivityBusy(false);
    }
  }

  async function loadFlow(activityIdToLoad: string) {
    setStepsLoading(true);
    try {
      const steps = await fetchActivitySteps(activityIdToLoad);
      setActivitySteps(steps);
      setStepsActivityId(activityIdToLoad);
      setStepsDirty(false);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setStepsLoading(false);
    }
  }

  async function openFlowTab() {
    if (activityBusy || stepsLoading) return;

    const saved = await saveActivity(false);
    if (!saved) return;

    if (stepsActivityId !== saved.id) {
      await loadFlow(saved.id);
    }

    setEditorTab("flow");
  }

  async function saveFlow() {
    if (!activityId || activityBusy || stepsLoading) return;

    const errors = validateActivitySteps(activitySteps, questions);
    if (errors.length) {
      notify(errors[0]);
      return;
    }

    setActivityBusy(true);
    try {
      const saved = await replaceActivitySteps(activityId, activitySteps);
      setActivitySteps(saved);
      setStepsActivityId(activityId);
      setStepsDirty(false);
      notify("Roteiro ao Vivo salvo no PostgreSQL.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setActivityBusy(false);
    }
  }

  function openDelivery(activity: Activity) {
    setDeliveryActivityId(activity.id);
    setDelivered([]);
    setOnTime([]);
    setModal("delivery");
  }

  async function registerDelivery() {
    if (!deliveryActivity || !delivered.length) return;
    try {
      const inputs = delivered.flatMap((studentId) => {
        const rows: CreateScoreEventInput[] = [];
        if (deliveryActivity.points) {
          rows.push({
            classroomId,
            studentId,
            points: deliveryActivity.points,
            category: "SUBMISSION" as const,
            description: `Entrega: ${deliveryActivity.title}`,
            source: "ACTIVITY" as const,
            activityId: deliveryActivity.id,
          });
        }
        if (onTime.includes(studentId) && deliveryActivity.onTimeBonus) {
          rows.push({
            classroomId,
            studentId,
            points: deliveryActivity.onTimeBonus,
            category: "BONUS" as const,
            description: `Bônus no prazo: ${deliveryActivity.title}`,
            source: "ACTIVITY" as const,
            activityId: deliveryActivity.id,
          });
        }
        return rows;
      });
      if (!inputs.length) {
        notify("A atividade não possui XP configurado para registrar.");
        return;
      }
      const events = await createScoreEventsApi(inputs);
      patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, ...events] }));
      setModal(null);
      notify(`XP persistido para ${delivered.length} aluno(s).`);
    } catch (error) {
      notify(errorMessage(error));
    }
  }


  function openExternalResults(activity: Activity) {
    setExternalResultActivityId(activity.id);
    setModal("external-results");
  }

  function handleExternalImported(events: ArenaData["scoreEvents"]) {
    if (!events.length) return;
    patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, ...events] }));
  }

  function openImport() {
    const firstClassroom = otherClassrooms[0]?.id ?? "";
    setSourceClassroomId(firstClassroom);
    setSourceActivityId(data.activities.find((activity) => activity.classroomId === firstClassroom)?.id ?? "");
    setModal("import");
  }

  function changeSourceClassroom(nextClassroomId: string) {
    setSourceClassroomId(nextClassroomId);
    setSourceActivityId(data.activities.find((activity) => activity.classroomId === nextClassroomId)?.id ?? "");
  }

  async function importActivityCopy() {
    const source = data.activities.find((activity) => activity.id === sourceActivityId && activity.classroomId === sourceClassroomId);
    if (!source || activityBusy) {
      if (!source) notify("Selecione uma atividade de origem.");
      return;
    }
    setActivityBusy(true);
    try {
      const copy = await copyActivityApi(source.id, classroomId);
      patch((current) => ({ ...current, activities: [...current.activities, copy] }));
      setModal(null);
      notify(`Atividade "${source.title}" copiada para ${classroomName} no PostgreSQL.`);
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setActivityBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-action-bar">
        <div>
          <span className="eyebrow accent">CONTEXTO DA TURMA</span>
          <h2>{classroomName}</h2>
          <p>Atividades, questões e XP desta página pertencem à turma selecionada no topo.</p>
        </div>
        <div className="page-action-buttons">
          <button className="button" onClick={openImport}>Importar atividade</button>
          <button className="button primary" onClick={openNewActivity}>+ Nova atividade</button>
        </div>
      </div>

      <div className="metrics-grid activity-metrics">
        <Metric label="Atividades" value={classActivities.length.toString()} hint="nesta turma" />
        <Metric label="Questões" value={totalQuestions.toString()} hint="conteúdo reutilizável na Arena" />
        <Metric label="XP de atividades" value={activityXp.toString()} hint="entregas e bônus registrados" />
        <Metric label="Integração" value="Arena" hint="atividades podem alimentar desafios" />
      </div>

      {dashboardActivity && (
        <ActivitySubmissionDashboard
          activityId={dashboardActivity.id}
          activityTitle={dashboardActivity.title}
          onClose={() => setDashboardActivityId(undefined)}
        />
      )}

      <Panel title="Atividades da turma" subtitle="Abra para editar, acompanhar entregas ou usar as questões diretamente na Arena">
        {classActivities.length ? (
          <div className="activity-catalog">
            {classActivities.map((activity) => {
              const submissionCount = new Set(activityEvents.filter((event) => event.activityId === activity.id && event.description.startsWith("Entrega:")).map((event) => event.studentId)).size;
              return (
                <article className="activity-catalog-card" key={activity.id}>
                  <div className="activity-card-head">
                    <div>
                      <div className="activity-card-kicker">{activity.resource?.kind === "EXTERNAL" ? activity.resource.platform || "Recurso externo" : "Atividade interna"}</div>
                      <h3>{activity.title}</h3>
                      <p>{activity.topic || "Sem tópico definido"}</p>
                    </div>
                    <div className="activity-xp"><strong>{activity.points} XP</strong><span>+{activity.onTimeBonus} prazo</span></div>
                  </div>
                  <div className="activity-card-stats">
                    <span>{activity.questions?.length ?? 0} questões</span>
                    <span>{submissionCount}/{students.length} entregaram</span>
                    {activity.copiedFromClassroomId && <span>Cópia reutilizada</span>}
                  </div>
                  {activity.resource?.kind === "EXTERNAL" && activity.resource.url && <a className="activity-resource-link" href={activity.resource.url} target="_blank" rel="noreferrer">Abrir recurso externo ↗</a>}
                  <div className="activity-card-actions">
                    <button className="button ghost" onClick={() => openActivity(activity)}>Abrir / editar</button>
                    <button className="button" onClick={() => setDashboardActivityId(activity.id)}>Entregas</button>
                    <button className="button" onClick={() => openDelivery(activity)}>Registrar XP manual</button>
                    {activity.resource?.kind === "EXTERNAL" && <button className="button" onClick={() => openExternalResults(activity)}>Importar resultados</button>}
                    <button className="button primary" disabled={!(activity.questions?.length)} onClick={() => onUseInArena(activity.id)}>Usar na Arena</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nenhuma atividade nesta turma" text="Crie uma atividade do zero ou importe uma cópia de outra turma. Questões podem ser reutilizadas depois na Arena." actionLabel="Criar atividade" onAction={openNewActivity} />
        )}
      </Panel>

      <Modal open={modal === "editor"} title={activityId ? "Editar atividade" : "Nova atividade"} subtitle={`Turma: ${classroomName}`} size="large" onClose={() => setModal(null)}>
        <div className="modal-tabs">
          <button className={editorTab === "general" ? "active" : ""} onClick={() => setEditorTab("general")}>Geral e XP</button>
          <button className={editorTab === "questions" ? "active" : ""} onClick={() => setEditorTab("questions")}>Questões <span>{questions.length}</span></button>
          <button
            className={editorTab === "flow" ? "active" : ""}
            disabled={activityBusy || stepsLoading}
            onClick={() => { void openFlowTab(); }}
          >
            Roteiro
            {stepsActivityId === activityId && <span>{activitySteps.length}</span>}
          </button>
        </div>
        {editorTab === "general" ? (
          <div className="modal-section-stack">
            <div className="context-lock"><span>Turma</span><strong>{classroomName}</strong><small>A atividade será salva somente neste contexto.</small></div>
            <div className="form-grid">
              <label className="field-label">Título</label>
              <input className="input" placeholder="Ex.: Atividade 07 — Funções" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="form-two">
                <label>Tema / tópico<input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Estruturas de repetição" /></label>
                <label>Tipo<select className="select full" value={resourceKind} onChange={(e) => setResourceKind(e.target.value as "INTERNAL" | "EXTERNAL")}><option value="INTERNAL">Atividade interna</option><option value="EXTERNAL">Atividade / recurso externo</option></select></label>
              </div>
              {resourceKind === "EXTERNAL" && <div className="form-two"><label>Plataforma<input className="input" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Wayground, Forms, Kahoot..." /></label><label>Link<input className="input" type="url" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." /></label></div>}
              <div className="form-two"><label>XP da entrega<input className="input" type="number" min="0" value={points} onChange={(e) => setPoints(Math.max(0, Number(e.target.value) || 0))} /></label><label>Bônus no prazo<input className="input" type="number" min="0" value={bonus} onChange={(e) => setBonus(Math.max(0, Number(e.target.value) || 0))} /></label></div>
            </div>
            <div className="activity-summary-line"><span>{questions.length} questão(ões) vinculadas</span><button className="text-button" onClick={() => setEditorTab("questions")}>Gerenciar questões →</button></div>
          </div>
        ) : editorTab === "questions" ? (
          <ActivityQuestionBuilder questions={questions} setQuestions={setQuestions} defaultTheme={topic || title} notify={notify} />
        ) : stepsLoading ? (
          <div className="loading-screen compact">Carregando roteiro...</div>
        ) : (
          <ActivityStepEditor
            steps={activitySteps}
            questions={questions}
            disabled={activityBusy}
            onChange={(steps) => {
              setActivitySteps(steps);
              setStepsDirty(true);
            }}
          />
        )}
        <div className="modal-footer">
          <button className="button ghost" onClick={() => setModal(null)}>
            {editorTab === "flow" && stepsDirty ? "Fechar sem salvar" : "Cancelar"}
          </button>
          {editorTab === "flow" ? (
            <button
              className="button primary"
              disabled={!activityId || activityBusy || stepsLoading || !stepsDirty}
              onClick={() => { void saveFlow(); }}
            >
              {activityBusy ? "Salvando..." : stepsDirty ? "Salvar roteiro" : "Roteiro salvo"}
            </button>
          ) : (
            <button
              className="button primary"
              disabled={activityBusy}
              onClick={() => {
                if (!title.trim()) {
                  setEditorTab("general");
                  notify("As questões já estão no rascunho. Informe o título da atividade para salvar.");
                  return;
                }
                void saveActivity(true);
              }}
            >
              {activityBusy ? "Salvando..." : title.trim() ? "Salvar atividade" : "Definir título e salvar"}
            </button>
          )}
        </div>
      </Modal>

      <Modal open={modal === "delivery"} title="Registrar entrega / participação" subtitle={deliveryActivity?.title} size="medium" onClose={() => setModal(null)}>
        {deliveryActivity && <>
          <div className="delivery-summary"><div><span>XP da entrega</span><strong>+{deliveryActivity.points}</strong></div><div><span>Bônus no prazo</span><strong>+{deliveryActivity.onTimeBonus}</strong></div><div><span>Selecionados</span><strong>{delivered.length}</strong></div></div>
          <div className="delivery-list modal-delivery-list">
            {students.map((student) => (
              <div className="delivery-row" key={student.id}>
                <label><input type="checkbox" checked={delivered.includes(student.id)} onChange={(e) => { setDelivered((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id)); if (!e.target.checked) setOnTime((current) => current.filter((id) => id !== student.id)); }} /><Avatar student={student} /><span>{student.name}</span></label>
                <label className="on-time"><input type="checkbox" disabled={!delivered.includes(student.id)} checked={onTime.includes(student.id)} onChange={(e) => setOnTime((current) => e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} />No prazo</label>
              </div>
            ))}
          </div>
          <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!delivered.length} onClick={() => { void registerDelivery(); }}>Registrar e aplicar XP</button></div>
        </>}
      </Modal>

      <ExternalResultImportModal
        open={modal === "external-results"}
        activity={externalResultActivity}
        students={students}
        onClose={() => setModal(null)}
        onImported={handleExternalImported}
        notify={notify}
      />

      <Modal open={modal === "import"} title="Importar atividade de outra turma" subtitle={`Destino: ${classroomName}`} size="medium" onClose={() => setModal(null)}>
        {otherClassrooms.length ? (
          <div className="modal-section-stack">
            <div className="form-grid">
              <label className="field-label">Turma de origem</label>
              <select className="select full" value={sourceClassroomId} onChange={(e) => changeSourceClassroom(e.target.value)}>{otherClassrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select>
              <label className="field-label">Atividade</label>
              <select className="select full" value={sourceActivityId} onChange={(e) => setSourceActivityId(e.target.value)}><option value="">Selecione</option>{sourceActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {activity.questions?.length ?? 0} questões</option>)}</select>
            </div>
            <div className="copy-policy"><strong>Será criada uma cópia independente.</strong><p>Conteúdo, questões, roteiro, XP e recurso externo são copiados. Entregas, alunos, resultados, ScoreEvents e histórico não são copiados.</p></div>
            <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!sourceActivityId || activityBusy} onClick={() => { void importActivityCopy(); }}>Importar cópia</button></div>
          </div>
        ) : <MiniEmpty text="Crie uma segunda turma para reutilizar atividades entre contextos. Em uma evolução futura, modelos também poderão vir de uma biblioteca." />}
      </Modal>
    </div>
  );
}

function RankingView({ leaderboard, events, classroomId }: { leaderboard: { student: Student; xp: number }[]; events: ArenaData["scoreEvents"]; classroomId: string }) {
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  return (
    <div className="stack-lg">
      <div className="ranking-podium">
        {leaderboard.slice(0, 3).map((row, index) => <div key={row.student.id} className={`podium p${index + 1}`}><span>#{index + 1}</span><Avatar student={row.student} large /><strong>{row.student.nickname || row.student.name}</strong><b>{row.xp} XP</b><small>{getLevel(row.xp).name}</small></div>)}
      </div>
      <Panel title="Ranking geral" subtitle="XP total e progressão por nível">
        <div className="ranking-full">
          {leaderboard.map((row, index) => {
            const level = getLevel(row.xp);
            const weekly = events.filter((e) => e.classroomId === classroomId && e.studentId === row.student.id && new Date(e.createdAt) >= weekStart).reduce((sum, e) => sum + e.points, 0);
            return <div className="ranking-full-row" key={row.student.id}><b className="place">#{index + 1}</b><Avatar student={row.student} /><div className="rank-main"><div><strong>{row.student.name}</strong><span>{level.name}</span></div><div className="progress"><span style={{ width: `${getLevelProgress(row.xp)}%` }} /></div></div><div className="weekly">7 dias <b>{weekly >= 0 ? "+" : ""}{weekly}</b></div><strong>{row.xp} XP</strong></div>;
          })}
          {!leaderboard.length && <MiniEmpty text="O ranking aparecerá após cadastrar alunos." />}
        </div>
      </Panel>
    </div>
  );
}

function HistoryView({ classroomId, events, students, onReverse }: { classroomId: string; events: ArenaData["scoreEvents"]; students: Student[]; onReverse: (id: string) => void }) {
  const [mode, setMode] = useState<"timeline" | "xp">("timeline");
  const [query, setQuery] = useState("");
  const filtered = events.slice().reverse().filter((event) => {
    const student = students.find((s) => s.id === event.studentId);
    return `${student?.name ?? ""} ${event.description} ${event.category}`.toLowerCase().includes(query.toLowerCase());
  });
  return (
    <div className="stack-lg">
      <Tabs
        label="Tipos de histórico da turma"
        activeId={mode}
        onChange={(id) => setMode(id as "timeline" | "xp")}
        items={[
          { id: "timeline", label: "Linha do tempo", description: "Condução e dinâmicas da aula" },
          { id: "xp", label: "Histórico de XP", description: `${events.length} lançamento(s)` },
        ]}
      />

      {mode === "timeline" ? (
        <Panel title="Linha do tempo da aula" subtitle="Trilha cronológica operacional das sessões, sem duplicar o histórico de XP">
          <SessionTimeline classroomId={classroomId} />
        </Panel>
      ) : (
        <Panel title="Histórico de XP" subtitle="Auditoria completa de respostas, entregas, bônus e ajustes">
          <input className="input search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno, motivo ou categoria..." />
          <div className="history-list">
            {filtered.map((event) => { const student = students.find((s) => s.id === event.studentId); return <div className="history-row" key={event.id}><Avatar student={student ?? { id: "x", name: "?", nickname: "", createdAt: "" }} /><div className="grow"><strong>{student?.name ?? "Aluno removido"}</strong><small>{event.description} · {dateTime(event.createdAt)}</small></div><span className="category-tag">{event.reversalOf ? "REVERSÃO" : event.reversed ? "REVERTIDO" : event.category}</span><b className={event.points >= 0 ? "positive" : "negative"}>{event.points >= 0 ? "+" : ""}{event.points} XP</b><button className="icon-button danger" disabled={Boolean(event.reversalOf || event.reversed)} title={event.reversalOf ? "Evento de reversão" : event.reversed ? "Lançamento já revertido" : "Reverter lançamento"} onClick={() => onReverse(event.id)}>↶</button></div>; })}
            {!filtered.length && <MiniEmpty text="Nenhum lançamento encontrado." />}
          </div>
        </Panel>
      )}
    </div>
  );
}

function BackupView({ data, setData, notify, refreshClassroomDomain }: {
  data: ArenaData;
  setData: React.Dispatch<React.SetStateAction<ArenaData>>;
  notify: (message: string) => void;
  refreshClassroomDomain: (preferredClassroomId?: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `arena-dev-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<ArenaData>;
        if (!Array.isArray(parsed.classrooms) || !Array.isArray(parsed.activities)) throw new Error();
        notify("Snapshot válido. A restauração direta foi desativada porque o núcleo agora é autoritativo no PostgreSQL; a restauração server-side entra em um incremento próprio.");
      } catch {
        notify("Arquivo de snapshot inválido.");
      }
    };
    reader.readAsText(file);
  }

  async function loadDemo() {
    if (busy) return;
    setBusy(true);
    try {
      const classroom = await createClassroomApi({ name: `Desenvolvimento de Sistemas · Demo ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` });
      const names = ["Ana Luiza", "Carlos Henrique", "João Pedro", "Maria Francisca", "Pedro Augusto", "Rafael Lima"];
      const createdStudents: Student[] = [];
      for (const name of names) {
        const result = await createAndEnrollStudent(classroom.id, { name, preferredName: name.split(" ")[0] });
        createdStudents.push(result.student);
      }

      const demoEvents = await createScoreEventsApi(createdStudents.slice(0, 4).map((student, index) => ({
        classroomId: classroom.id,
        studentId: student.id,
        points: (index + 1) * 20,
        category: "BONUS" as const,
        description: "Dados de demonstração",
        source: "MANUAL" as const,
      })));
      await refreshClassroomDomain(classroom.id);
      setData((current) => ({
        ...current,
        activeClassroomId: classroom.id,
        scoreEvents: [...current.scoreEvents.filter((event) => event.classroomId !== classroom.id), ...demoEvents],
      }));
      notify("Demonstração criada no PostgreSQL, incluindo XP.");
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="two-col">
      <Panel title="Backup dos dados" subtitle="Snapshot dos módulos atuais do Arena Dev">
        <div className="backup-card"><span className="backup-icon">↓</span><div><h3>Exportar snapshot</h3><p>Inclui uma fotografia da visão atual carregada do backend/PostgreSQL.</p></div><button className="button primary" onClick={exportData}>Exportar JSON</button></div>
        <div className="backup-card"><span className="backup-icon">↑</span><div><h3>Validar snapshot</h3><p>Confere o JSON exportado. Restauração server-side será implementada separadamente para não sobrescrever dados persistentes de forma insegura.</p></div><label className="button file-button">Validar JSON<input type="file" accept="application/json" onChange={(e) => importData(e.target.files?.[0])} /></label></div>
      </Panel>
      <Panel title="Ambiente de demonstração" subtitle="Teste o fluxo usando a persistência atual">
        <div className="demo-block"><div className="target-mark small">A</div><h3>Carregar turma demonstrativa</h3><p>Cria turma, alunos e XP de demonstração diretamente no PostgreSQL.</p><button className="button" disabled={busy} onClick={() => { void loadDemo(); }}>{busy ? "Criando..." : "Carregar demonstração"}</button></div>
        <div className="local-note"><strong>Persistência + tempo real</strong><p>Turmas, sessões, presença, XP, atividades, mecânicas, códigos de entrada e Buzzer ficam no backend/PostgreSQL. O WebSocket é usado somente para estado conectado e eventos ao vivo.</p></div>
      </Panel>
    </div>
  );
}

function Modal({ open, title, subtitle, size = "medium", bodyClassName, onClose, children }: {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: "medium" | "large";
  bodyClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useBodyScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className={`modal-card ${size}`} role="dialog" aria-modal="true" aria-labelledby="arena-modal-title">
        <header className="modal-header">
          <div><h2 id="arena-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="modal-close" type="button" aria-label="Fechar" onClick={onClose}>×</button>
        </header>
        <div className={bodyClassName ? `modal-body ${bodyClassName}` : "modal-body"}>{children}</div>
      </section>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></div>{children}</div>;
}
function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function Avatar({ student, large = false }: { student: Student; large?: boolean }) { const initials = student.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return <div className={large ? "avatar large" : "avatar"}>{initials}</div>; }
function MiniEmpty({ text }: { text: string }) { return <div className="mini-empty">{text}</div>; }
function EmptyState({ title, text, actionLabel, onAction }: { title: string; text: string; actionLabel: string; onAction: () => void }) { return <div className="empty-state"><div className="target-mark">A</div><h2>{title}</h2><p>{text}</p><button className="button primary large" onClick={onAction}>{actionLabel}</button></div>; }
function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div className="step"><span>{n}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
