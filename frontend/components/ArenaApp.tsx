"use client";

import { useEffect, useMemo, useState } from "react";
import ActivityQuestionBuilder from "@/components/ActivityQuestionBuilder";
import { QUESTION_DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/lib/activity-questions";
import { createBalancedGroups, getLevel, getLevelProgress, weightedDraw, xpForStudent } from "@/lib/game";
import { EMPTY_DATA, loadData, saveData, uid } from "@/lib/store";
import type { Activity, ActivityQuestion, ArenaData, ScoreCategory, Student } from "@/lib/types";

type View = "dashboard" | "classroom" | "arena" | "activities" | "ranking" | "history" | "backup";

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Visão geral", icon: "◫" },
  { id: "classroom", label: "Turma e alunos", icon: "◎" },
  { id: "arena", label: "Arena", icon: "◆" },
  { id: "activities", label: "Atividades e XP", icon: "✓" },
  { id: "ranking", label: "Ranking", icon: "▲" },
  { id: "history", label: "Histórico", icon: "≡" },
  { id: "backup", label: "Backup", icon: "⇅" },
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

export default function ArenaApp() {
  const [data, setData] = useState<ArenaData>(EMPTY_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [toast, setToast] = useState("");
  const [arenaActivityId, setArenaActivityId] = useState<string | undefined>();

  useEffect(() => {
    setData(loadData());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveData(data);
  }, [data, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

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

  const currentSession = data.sessions.find((item) => item.id === data.currentSessionId && !item.endedAt);

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

  function setActiveClassroom(id: string) {
    setArenaActivityId(undefined);
    patch((current) => ({ ...current, activeClassroomId: id, currentSessionId: undefined }));
  }

  if (!hydrated) {
    return <div className="loading-screen">Carregando Arena Dev...</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>ARENA DEV</strong>
            <small>Classroom Edition · V1</small>
          </div>
        </div>

        <nav className="nav-list">
          {NAV.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="status-dot" />
          <div>
            <strong>Modo local</strong>
            <small>Dados salvos neste navegador</small>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">PAINEL DO PROFESSOR</span>
            <h1>{NAV.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <select
              className="select"
              value={activeClassroom?.id ?? ""}
              onChange={(event) => setActiveClassroom(event.target.value)}
              disabled={!data.classrooms.length}
            >
              {!data.classrooms.length && <option value="">Nenhuma turma</option>}
              {data.classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            {currentSession && <span className="live-pill"><span /> Sessão ativa</span>}
          </div>
        </header>

        <section className="content">
          {!activeClassroom && view !== "classroom" && view !== "backup" ? (
            <EmptyState
              title="Crie sua primeira turma"
              text="O Arena Dev começa pela turma. Depois você cadastra os alunos e inicia a primeira sessão."
              actionLabel="Criar turma"
              onAction={() => setView("classroom")}
            />
          ) : null}

          {view === "dashboard" && activeClassroom && (
            <Dashboard
              classroomName={activeClassroom.name}
              students={classStudents}
              leaderboard={leaderboard}
              events={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id)}
              currentSession={currentSession}
              onOpenArena={() => setView("arena")}
              onOpenStudents={() => setView("classroom")}
            />
          )}

          {view === "classroom" && (
            <ClassroomView
              data={data}
              activeClassroomId={activeClassroomId}
              classStudents={classStudents}
              setActiveClassroom={setActiveClassroom}
              patch={patch}
              notify={notify}
            />
          )}

          {view === "arena" && activeClassroom && (
            <ArenaView
              data={data}
              classroomId={activeClassroom.id}
              students={classStudents}
              currentSession={currentSession}
              leaderboard={leaderboard}
              preferredActivityId={arenaActivityId}
              onPreferredActivityChange={setArenaActivityId}
              patch={patch}
              notify={notify}
            />
          )}

          {view === "activities" && activeClassroom && (
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

          {view === "ranking" && activeClassroom && (
            <RankingView leaderboard={leaderboard} events={data.scoreEvents} classroomId={activeClassroom.id} />
          )}

          {view === "history" && activeClassroom && (
            <HistoryView
              events={data.scoreEvents.filter((event) => event.classroomId === activeClassroom.id)}
              students={data.students}
              onDelete={(eventId) => {
                patch((current) => ({ ...current, scoreEvents: current.scoreEvents.filter((event) => event.id !== eventId) }));
                notify("Lançamento removido.");
              }}
            />
          )}

          {view === "backup" && <BackupView data={data} setData={setData} notify={notify} />}
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Dashboard({ classroomName, students, leaderboard, events, currentSession, onOpenArena, onOpenStudents }: {
  classroomName: string;
  students: Student[];
  leaderboard: { student: Student; xp: number }[];
  events: ArenaData["scoreEvents"];
  currentSession?: ArenaData["sessions"][number];
  onOpenArena: () => void;
  onOpenStudents: () => void;
}) {
  const totalXp = leaderboard.reduce((sum, row) => sum + row.xp, 0);
  const today = new Date().toDateString();
  const todayEvents = events.filter((event) => new Date(event.createdAt).toDateString() === today);
  return (
    <div className="stack-lg">
      <div className="hero-card">
        <div>
          <span className="eyebrow accent">TURMA ATUAL</span>
          <h2>{classroomName}</h2>
          <p>Gerencie participação, sorteios e progressão sem interromper o ritmo da aula.</p>
        </div>
        <button className="button primary large" onClick={onOpenArena}>{currentSession ? "Continuar arena" : "Iniciar arena"}</button>
      </div>

      <div className="metrics-grid">
        <Metric label="Alunos ativos" value={students.length.toString()} hint="aptos para a arena" />
        <Metric label="XP distribuído" value={totalXp.toString()} hint="nesta turma" />
        <Metric label="Eventos hoje" value={todayEvents.length.toString()} hint="respostas, entregas e bônus" />
        <Metric label="Sessão" value={currentSession ? "ATIVA" : "—"} hint={currentSession ? currentSession.title : "nenhuma em andamento"} />
      </div>

      <div className="two-col">
        <Panel title="Top da turma" subtitle="Ranking por XP acumulado">
          {leaderboard.length ? (
            <div className="ranking-compact">
              {leaderboard.slice(0, 5).map((row, index) => (
                <div key={row.student.id} className="ranking-row">
                  <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                  <Avatar student={row.student} />
                  <div className="grow"><strong>{row.student.nickname || row.student.name}</strong><small>{getLevel(row.xp).name}</small></div>
                  <b>{row.xp} XP</b>
                </div>
              ))}
            </div>
          ) : <MiniEmpty text="Ainda não há alunos ou pontuação." />}
        </Panel>
        <Panel title="Ações rápidas" subtitle="Prepare a próxima dinâmica">
          <div className="quick-actions">
            <button className="quick-button" onClick={onOpenStudents}><span>01</span><div><strong>Gerenciar alunos</strong><small>Cadastro, importação e status</small></div></button>
            <button className="quick-button" onClick={onOpenArena}><span>02</span><div><strong>Abrir Arena</strong><small>Presença, sorteio e pontuação</small></div></button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ClassroomView({ data, activeClassroomId, classStudents, setActiveClassroom, patch, notify }: {
  data: ArenaData;
  activeClassroomId?: string;
  classStudents: Student[];
  setActiveClassroom: (id: string) => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: (message: string) => void;
}) {
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bulk, setBulk] = useState("");

  function addClassroom() {
    if (!className.trim()) return;
    const id = uid("class");
    patch((current) => ({
      ...current,
      classrooms: [...current.classrooms, { id, name: className.trim(), code: classCode.trim(), createdAt: new Date().toISOString() }],
      activeClassroomId: id,
      currentSessionId: undefined,
    }));
    setClassName(""); setClassCode("");
    notify("Turma criada.");
  }

  function addStudent(studentName: string, studentNickname = "") {
    if (!activeClassroomId || !studentName.trim()) return;
    const studentId = uid("student");
    patch((current) => ({
      ...current,
      students: [...current.students, { id: studentId, name: studentName.trim(), nickname: studentNickname.trim(), createdAt: new Date().toISOString() }],
      enrollments: [...current.enrollments, { id: uid("enrollment"), classroomId: activeClassroomId, studentId, active: true, joinedAt: new Date().toISOString() }],
    }));
  }

  function importStudents() {
    const names = bulk.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean);
    if (!names.length || !activeClassroomId) return;
    names.forEach((studentName) => addStudent(studentName));
    setBulk("");
    notify(`${names.length} aluno(s) importado(s).`);
  }

  function removeStudent(studentId: string) {
    if (!activeClassroomId) return;
    patch((current) => ({
      ...current,
      enrollments: current.enrollments.filter((enrollment) => !(enrollment.classroomId === activeClassroomId && enrollment.studentId === studentId)),
    }));
    notify("Aluno removido da turma.");
  }

  function toggleStudent(studentId: string) {
    patch((current) => ({
      ...current,
      enrollments: current.enrollments.map((enrollment) => enrollment.classroomId === activeClassroomId && enrollment.studentId === studentId ? { ...enrollment, active: !enrollment.active } : enrollment),
    }));
  }

  const allRows = data.enrollments
    .filter((e) => e.classroomId === activeClassroomId)
    .map((e) => ({ enrollment: e, student: data.students.find((s) => s.id === e.studentId)! }))
    .filter((row) => row.student)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  return (
    <div className="stack-lg">
      <div className="two-col uneven">
        <Panel title="Turmas" subtitle="Crie e alterne entre suas turmas">
          <div className="form-grid">
            <input className="input" placeholder="Nome da turma" value={className} onChange={(e) => setClassName(e.target.value)} />
            <input className="input" placeholder="Código opcional" value={classCode} onChange={(e) => setClassCode(e.target.value)} />
            <button className="button primary" onClick={addClassroom}>Criar turma</button>
          </div>
          <div className="class-list">
            {data.classrooms.map((classroom) => (
              <button key={classroom.id} className={classroom.id === activeClassroomId ? "class-card selected" : "class-card"} onClick={() => setActiveClassroom(classroom.id)}>
                <div><strong>{classroom.name}</strong><small>{classroom.code || "Sem código"}</small></div>
                <span>{data.enrollments.filter((e) => e.classroomId === classroom.id && e.active).length}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Cadastro rápido" subtitle={activeClassroomId ? "Adicionar um aluno" : "Crie uma turma primeiro"}>
          <div className="form-grid">
            <input className="input" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} disabled={!activeClassroomId} />
            <input className="input" placeholder="Apelido (opcional)" value={nickname} onChange={(e) => setNickname(e.target.value)} disabled={!activeClassroomId} />
            <button className="button" disabled={!activeClassroomId || !name.trim()} onClick={() => { addStudent(name, nickname); setName(""); setNickname(""); notify("Aluno cadastrado."); }}>Adicionar aluno</button>
          </div>
          <div className="separator"><span>ou</span></div>
          <textarea className="textarea" rows={7} placeholder={"Cole uma lista, um aluno por linha\nAna Luiza\nCarlos Henrique\nJoão Pedro"} value={bulk} onChange={(e) => setBulk(e.target.value)} disabled={!activeClassroomId} />
          <button className="button ghost full" onClick={importStudents} disabled={!bulk.trim()}>Importar lista</button>
        </Panel>
      </div>

      <Panel title="Alunos da turma" subtitle={`${classStudents.length} ativos · ${allRows.length} cadastrados`}>
        {!allRows.length ? <MiniEmpty text="Nenhum aluno cadastrado nesta turma." /> : (
          <div className="student-table">
            <div className="table-head"><span>Aluno</span><span>Status</span><span>XP</span><span>Ações</span></div>
            {allRows.map(({ student, enrollment }) => {
              const xp = activeClassroomId ? xpForStudent(data.scoreEvents, activeClassroomId, student.id) : 0;
              return (
                <div className="table-row" key={enrollment.id}>
                  <div className="student-cell"><Avatar student={student} /><div><strong>{student.name}</strong><small>{student.nickname || "Sem apelido"}</small></div></div>
                  <span className={enrollment.active ? "status active" : "status"}>{enrollment.active ? "Ativo" : "Inativo"}</span>
                  <b>{xp} XP</b>
                  <div className="row-actions"><button className="text-button" onClick={() => toggleStudent(student.id)}>{enrollment.active ? "Inativar" : "Ativar"}</button><button className="text-button danger" onClick={() => removeStudent(student.id)}>Remover</button></div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ArenaView({ data, classroomId, students, currentSession, leaderboard, preferredActivityId, onPreferredActivityChange, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  students: Student[];
  currentSession?: ArenaData["sessions"][number];
  leaderboard: { student: Student; xp: number }[];
  preferredActivityId?: string;
  onPreferredActivityChange: (activityId?: string) => void;
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: (message: string) => void;
}) {
  const [presentIds, setPresentIds] = useState<string[]>(students.map((s) => s.id));
  const [title, setTitle] = useState(`Aula · ${todayTitle()}`);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentSession?.lastDrawnStudentId);
  const [drawPhase, setDrawPhase] = useState<"idle" | "drawing">("idle");
  const [reason, setReason] = useState("Resposta correta");
  const [customPoints, setCustomPoints] = useState(10);
  const [groups, setGroups] = useState<string[][]>([]);
  const [groupSize, setGroupSize] = useState(2);
  const [bossName, setBossName] = useState("Spaghetti Code");
  const [bossHp, setBossHp] = useState(100);
  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId && (activity.questions?.length ?? 0) > 0),
    [data.activities, classroomId],
  );
  const [activityId, setActivityId] = useState<string>(currentSession?.activityId ?? preferredActivityId ?? "");

  useEffect(() => {
    if (preferredActivityId) {
      if (currentSession && currentSession.activityId !== preferredActivityId) changeArenaActivity(preferredActivityId);
      else if (!currentSession) setActivityId(preferredActivityId);
      onPreferredActivityChange(undefined);
      return;
    }
    if (currentSession?.activityId) setActivityId(currentSession.activityId);
  }, [currentSession?.activityId, currentSession?.id, preferredActivityId]);

  useEffect(() => {
    if (!currentSession) setPresentIds(students.map((s) => s.id));
  }, [students, currentSession]);

  function startSession() {
    if (!presentIds.length) return;
    const id = uid("session");
    patch((current) => ({
      ...current,
      sessions: [...current.sessions, { id, classroomId, title: title.trim() || `Aula · ${todayTitle()}`, startedAt: new Date().toISOString(), presentStudentIds: presentIds, drawCounts: {}, activityId: activityId || undefined, answeredQuestionIds: [] }],
      currentSessionId: id,
    }));
    notify("Arena iniciada.");
  }

  function endSession() {
    if (!currentSession) return;
    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === currentSession.id ? { ...session, endedAt: new Date().toISOString() } : session),
      currentSessionId: undefined,
    }));
    setSelectedId(undefined);
    setGroups([]);
    onPreferredActivityChange(undefined);
    notify("Sessão encerrada.");
  }

  function draw() {
    if (!currentSession || drawPhase === "drawing") return;
    const candidates = students.filter((student) => currentSession.presentStudentIds.includes(student.id));
    const winner = weightedDraw(candidates, currentSession);
    if (!winner) return;
    setDrawPhase("drawing");
    setSelectedId(undefined);
    window.setTimeout(() => {
      setSelectedId(winner.id);
      patch((current) => ({
        ...current,
        sessions: current.sessions.map((session) => session.id === currentSession.id ? {
          ...session,
          lastDrawnStudentId: winner.id,
          drawCounts: { ...session.drawCounts, [winner.id]: (session.drawCounts[winner.id] ?? 0) + 1 },
        } : session),
      }));
      setDrawPhase("idle");
    }, 900);
  }

  function addScore(points: number, category: ScoreCategory, description: string) {
    if (!selectedId || !currentSession) return;
    patch((current) => ({
      ...current,
      scoreEvents: [...current.scoreEvents, { id: uid("score"), classroomId, studentId: selectedId, sessionId: currentSession.id, points, category, description, source: "ARENA", activityId: currentSession.activityId, questionId: currentSession.currentQuestionId, createdAt: new Date().toISOString() }],
    }));
    notify(`${points >= 0 ? "+" : ""}${points} XP registrado.`);
  }

  function changeArenaActivity(nextActivityId: string) {
    setActivityId(nextActivityId);
    if (!currentSession) return;
    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === currentSession.id ? {
        ...session,
        activityId: nextActivityId || undefined,
        currentQuestionId: undefined,
        answeredQuestionIds: [],
      } : session),
    }));
    notify(nextActivityId ? "Atividade conectada à Arena." : "Arena em modo livre.");
  }

  function nextActivityQuestion() {
    if (!currentSession?.activityId) {
      notify("Selecione uma atividade com questões ou use o modo livre.");
      return;
    }
    const activity = data.activities.find((item) => item.id === currentSession.activityId);
    const questions = activity?.questions ?? [];
    const answered = new Set(currentSession.answeredQuestionIds ?? []);
    const next = questions.find((question) => !answered.has(question.id));
    if (!next) {
      notify("Todas as questões desta atividade já foram apresentadas.");
      return;
    }
    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === currentSession.id ? {
        ...session,
        currentQuestionId: next.id,
        answeredQuestionIds: [...(session.answeredQuestionIds ?? []), next.id],
      } : session),
    }));
  }

  function restartActivityQuestions() {
    if (!currentSession) return;
    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === currentSession.id ? {
        ...session,
        currentQuestionId: undefined,
        answeredQuestionIds: [],
      } : session),
    }));
    notify("Sequência de questões reiniciada.");
  }

  function createGroups() {
    if (!currentSession) return;
    const prior = data.groupHistory.filter((record) => record.classroomId === classroomId).map((record) => record.groups);
    const next = createBalancedGroups(currentSession.presentStudentIds, groupSize, prior);
    setGroups(next);
    if (groupSize === 1) {
      notify("Organização individual ativada.");
      return;
    }
    patch((current) => ({ ...current, groupHistory: [...current.groupHistory, { id: uid("groups"), classroomId, sessionId: currentSession.id, createdAt: new Date().toISOString(), groups: next }] }));
    notify(`${next.length} grupo(s) organizado(s).`);
  }

  function createBoss() {
    if (!currentSession) return;
    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === currentSession.id ? { ...session, boss: { name: bossName.trim() || "Boss", maxHp: bossHp, currentHp: bossHp } } : session),
    }));
    notify("Boss iniciado.");
  }

  function damageBoss(amount: number) {
    if (!currentSession?.boss) return;
    patch((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === currentSession.id && session.boss ? { ...session, boss: { ...session.boss, currentHp: Math.max(0, session.boss.currentHp - amount) } } : session),
    }));
  }

  const selected = students.find((student) => student.id === selectedId);
  const selectedXp = selected ? xpForStudent(data.scoreEvents, classroomId, selected.id) : 0;
  const activeActivity = data.activities.find((activity) => activity.id === (currentSession?.activityId ?? activityId));
  const currentQuestion = activeActivity?.questions?.find((question) => question.id === currentSession?.currentQuestionId);

  if (!currentSession) {
    return (
      <div className="two-col uneven">
        <Panel title="Abrir nova sessão" subtitle="A presença define quem participa dos sorteios">
          <div className="form-grid">
            <label className="field-label">Título da sessão</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <label className="field-label">Fonte dos desafios</label>
            <select className="select full" value={activityId} onChange={(e) => changeArenaActivity(e.target.value)}>
              <option value="">Modo livre — pergunta oral ou conteúdo externo</option>
              {classActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {activity.questions?.length ?? 0} questões</option>)}
            </select>
            {activeActivity && <div className="arena-source-note"><strong>{activeActivity.title}</strong><span>{activeActivity.topic || "Sem tópico"} · {activeActivity.questions?.length ?? 0} questão(ões)</span></div>}
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
          <button className="button primary large full" onClick={startSession} disabled={!presentIds.length}>Iniciar Arena</button>
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
    <div className="stack-lg">
      <div className="arena-header">
        <div><span className="live-pill"><span /> AO VIVO</span><h2>{currentSession.title}</h2><p>{currentSession.presentStudentIds.length} presentes · iniciada {dateTime(currentSession.startedAt)}</p></div>
        <button className="button danger-outline" onClick={endSession}>Encerrar sessão</button>
      </div>

      <div className="arena-activity-strip">
        <div>
          <span className="eyebrow accent">FONTE DA ARENA</span>
          <strong>{activeActivity?.title ?? "Modo livre"}</strong>
          <small>{activeActivity ? `${activeActivity.questions?.length ?? 0} questões disponíveis` : "Pergunte oralmente ou utilize qualquer recurso da aula"}</small>
        </div>
        <select className="select" value={currentSession.activityId ?? ""} onChange={(e) => changeArenaActivity(e.target.value)}>
          <option value="">Modo livre</option>
          {classActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
        </select>
      </div>

      {activeActivity && (
        <Panel title="Questão da Arena" subtitle={`${activeActivity.title} · ${(currentSession.answeredQuestionIds ?? []).length}/${activeActivity.questions?.length ?? 0} apresentadas`}>
          {currentQuestion ? (
            <div className="arena-question-card">
              <div className="question-meta"><span>{QUESTION_TYPE_LABEL[currentQuestion.type]}</span><span>{QUESTION_DIFFICULTY_LABEL[currentQuestion.difficulty]}</span><span>{currentQuestion.points} XP sugeridos</span></div>
              <h3>{currentQuestion.statement}</h3>
              {currentQuestion.code && <pre>{currentQuestion.code}</pre>}
              {currentQuestion.options && <div className="arena-question-options">{currentQuestion.options.map((option) => <div key={option.id}><b>{option.id}</b><span>{option.text}</span></div>)}</div>}
            </div>
          ) : <MiniEmpty text="Clique em próxima questão quando quiser usar o conteúdo da atividade na Arena." />}
          <div className="inline-actions solid-actions">
            {(currentSession.answeredQuestionIds?.length ?? 0) >= (activeActivity.questions?.length ?? 0) && <button className="button ghost" onClick={restartActivityQuestions}>Reiniciar questões</button>}
            <button className="button primary" onClick={nextActivityQuestion}>Próxima questão</button>
          </div>
        </Panel>
      )}

      <div className="arena-grid">
        <div className="arena-main-card">
          <span className="eyebrow accent">SORTEIO INTELIGENTE</span>
          <div className={drawPhase === "drawing" ? "draw-stage spinning" : "draw-stage"}>
            {drawPhase === "drawing" ? (
              <div className="draw-loading"><span /><span /><span /></div>
            ) : selected ? (
              <>
                <Avatar student={selected} large />
                <h3>{selected.nickname || selected.name}</h3>
                <p>{selected.name}</p>
                <div className="xp-badge">{selectedXp} XP · {getLevel(selectedXp).name}</div>
              </>
            ) : (
              <><div className="target-mark">+</div><h3>Pronto para sortear</h3><p>O algoritmo prioriza quem participou menos.</p></>
            )}
          </div>
          <button className="button primary huge" onClick={draw} disabled={drawPhase === "drawing"}>SORTEAR DEV</button>
          {selected && <small className="draw-count">Sorteado nesta sessão: {currentSession.drawCounts[selected.id] ?? 0} vez(es)</small>}
        </div>

        <div className="score-card">
          <div className="panel-heading"><div><h3>Pontuação rápida</h3><p>{selected ? `Aplicar a ${selected.nickname || selected.name}` : "Sorteie ou selecione um aluno"}</p></div></div>
          <div className="score-presets">
            {currentQuestion && <button disabled={!selected} onClick={() => addScore(currentQuestion.points, "QUESTION", `Questão: ${currentQuestion.statement}`)}><b>+{currentQuestion.points}</b><span>Questão atual</span></button>}
            {SCORE_PRESETS.map((preset) => (
              <button key={`${preset.points}-${preset.label}`} disabled={!selected} onClick={() => { setReason(preset.label); addScore(preset.points, preset.category, preset.label); }}>
                <b>+{preset.points}</b><span>{preset.label}</span>
              </button>
            ))}
          </div>
          <div className="custom-score">
            <input className="input compact" type="number" value={customPoints} onChange={(e) => setCustomPoints(Number(e.target.value))} />
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" />
            <button className="button" disabled={!selected || !reason.trim()} onClick={() => addScore(customPoints, "ADJUSTMENT", reason)}>Aplicar</button>
          </div>
          <div className="student-select-list">
            <span className="field-label">Selecionar manualmente</span>
            <select className="select full" value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value || undefined)}>
              <option value="">Selecione um aluno</option>
              {students.filter((s) => currentSession.presentStudentIds.includes(s.id)).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="two-col">
        <Panel title="Boss Battle" subtitle="Transforme questões em um objetivo coletivo">
          {currentSession.boss ? (
            <div className="boss-box">
              <div className="boss-head"><div><span className="eyebrow accent">BOSS</span><h3>{currentSession.boss.name}</h3></div><b>{currentSession.boss.currentHp}/{currentSession.boss.maxHp} HP</b></div>
              <div className="hp-track"><span style={{ width: `${(currentSession.boss.currentHp / currentSession.boss.maxHp) * 100}%` }} /></div>
              <div className="damage-buttons"><button onClick={() => damageBoss(10)}>−10 HP</button><button onClick={() => damageBoss(20)}>−20 HP</button><button onClick={() => damageBoss(30)}>−30 HP</button></div>
              {currentSession.boss.currentHp === 0 && <div className="boss-defeated">BOSS DERROTADO · objetivo coletivo concluído</div>}
            </div>
          ) : (
            <div className="boss-create">
              <input className="input" value={bossName} onChange={(e) => setBossName(e.target.value)} placeholder="Nome do Boss" />
              <input className="input" type="number" min="10" value={bossHp} onChange={(e) => setBossHp(Math.max(10, Number(e.target.value)))} />
              <button className="button" onClick={createBoss}>Criar Boss</button>
            </div>
          )}
        </Panel>

        <Panel title="Organização da turma" subtitle="Alterne entre individual, duplas e grupos sem encerrar a sessão">
          <div className="group-controls">
            <label>Formato<select className="select" value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))}><option value={1}>Individual</option><option value={2}>Duplas</option><option value={3}>Trios</option><option value={4}>Grupos de 4</option><option value={5}>Grupos de 5</option></select></label>
            <button className="button" onClick={createGroups}>{groupSize === 1 ? "Voltar ao individual" : "Organizar turma"}</button>
          </div>
          {groups.length > 0 ? <div className="groups-grid">{groups.map((group, i) => <div className="group-card" key={i}><b>{groupSize === 1 ? `INDIVIDUAL ${String(i + 1).padStart(2, "0")}` : `GRUPO ${String(i + 1).padStart(2, "0")}`}</b>{group.map((id) => <span key={id}>{students.find((s) => s.id === id)?.nickname || students.find((s) => s.id === id)?.name}</span>)}</div>)}</div> : <MiniEmpty text="Escolha como a turma deve se organizar nesta etapa da aula." />}
        </Panel>
      </div>

      <Panel title="Ranking ao vivo" subtitle="Atualizado a cada lançamento de XP">
        <div className="live-ranking">{leaderboard.slice(0, 8).map((row, index) => <div key={row.student.id}><span>{index + 1}</span><Avatar student={row.student} /><strong>{row.student.nickname || row.student.name}</strong><b>{row.xp} XP</b></div>)}</div>
      </Panel>
    </div>
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
  type ActivityModal = "editor" | "delivery" | "import" | null;
  type EditorTab = "general" | "questions";

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
  const [deliveryActivityId, setDeliveryActivityId] = useState<string | undefined>();
  const [delivered, setDelivered] = useState<string[]>([]);
  const [onTime, setOnTime] = useState<string[]>([]);
  const [sourceClassroomId, setSourceClassroomId] = useState("");
  const [sourceActivityId, setSourceActivityId] = useState("");

  const classActivities = useMemo(
    () => data.activities.filter((activity) => activity.classroomId === classroomId).slice().sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()),
    [data.activities, classroomId],
  );
  const otherClassrooms = data.classrooms.filter((classroom) => classroom.id !== classroomId);
  const sourceActivities = data.activities.filter((activity) => activity.classroomId === sourceClassroomId);
  const deliveryActivity = classActivities.find((activity) => activity.id === deliveryActivityId);
  const activityEvents = data.scoreEvents.filter((event) => event.classroomId === classroomId && (event.source === "ACTIVITY" || event.category === "SUBMISSION"));
  const totalQuestions = classActivities.reduce((sum, activity) => sum + (activity.questions?.length ?? 0), 0);
  const activityXp = activityEvents.reduce((sum, event) => sum + event.points, 0);

  function draftActivity(id: string, createdAt: string): Activity {
    return {
      id,
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
      createdAt,
      updatedAt: new Date().toISOString(),
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

  function saveActivity(closeAfter = true) {
    if (!validateDraft()) return;
    const existing = activityId ? data.activities.find((activity) => activity.id === activityId) : undefined;
    const id = existing?.id ?? uid("activity");
    const activity = draftActivity(id, existing?.createdAt ?? new Date().toISOString());
    patch((current) => ({
      ...current,
      activities: existing
        ? current.activities.map((item) => item.id === id ? { ...activity, copiedFromActivityId: existing.copiedFromActivityId, copiedFromClassroomId: existing.copiedFromClassroomId } : item)
        : [...current.activities, activity],
    }));
    setActivityId(id);
    notify(existing ? "Atividade atualizada." : "Atividade criada para esta turma.");
    if (closeAfter) setModal(null);
  }

  function openDelivery(activity: Activity) {
    setDeliveryActivityId(activity.id);
    setDelivered([]);
    setOnTime([]);
    setModal("delivery");
  }

  function registerDelivery() {
    if (!deliveryActivity || !delivered.length) return;
    const now = new Date().toISOString();
    const events = delivered.flatMap((studentId) => {
      const rows: ArenaData["scoreEvents"] = [{
        id: uid("score"),
        classroomId,
        studentId,
        points: deliveryActivity.points,
        category: "SUBMISSION",
        description: `Entrega: ${deliveryActivity.title}`,
        source: "ACTIVITY",
        activityId: deliveryActivity.id,
        createdAt: now,
      }];
      if (onTime.includes(studentId) && deliveryActivity.onTimeBonus) {
        rows.push({
          id: uid("score"),
          classroomId,
          studentId,
          points: deliveryActivity.onTimeBonus,
          category: "BONUS",
          description: `Bônus no prazo: ${deliveryActivity.title}`,
          source: "ACTIVITY",
          activityId: deliveryActivity.id,
          createdAt: now,
        });
      }
      return rows;
    });
    patch((current) => ({ ...current, scoreEvents: [...current.scoreEvents, ...events] }));
    setModal(null);
    notify(`XP registrado para ${delivered.length} aluno(s).`);
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

  function importActivityCopy() {
    const source = data.activities.find((activity) => activity.id === sourceActivityId && activity.classroomId === sourceClassroomId);
    if (!source) {
      notify("Selecione uma atividade de origem.");
      return;
    }
    const now = new Date().toISOString();
    const copy: Activity = {
      ...source,
      id: uid("activity"),
      classroomId,
      title: source.title,
      questions: (source.questions ?? []).map((question) => ({
        ...question,
        id: uid("question"),
        options: question.options?.map((option) => ({ ...option })),
        evaluationCriteria: question.evaluationCriteria ? [...question.evaluationCriteria] : undefined,
      })),
      createdAt: now,
      updatedAt: now,
      copiedFromActivityId: source.id,
      copiedFromClassroomId: source.classroomId,
    };
    patch((current) => ({ ...current, activities: [...current.activities, copy] }));
    setModal(null);
    notify(`Atividade "${source.title}" copiada para ${classroomName}.`);
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

      <Panel title="Atividades da turma" subtitle="Abra para editar, registrar entregas ou usar as questões diretamente na Arena">
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
                    <button className="button" onClick={() => openDelivery(activity)}>Registrar entrega</button>
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
        ) : (
          <ActivityQuestionBuilder questions={questions} setQuestions={setQuestions} defaultTheme={topic || title} notify={notify} />
        )}
        <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!title.trim()} onClick={() => saveActivity(true)}>Salvar atividade</button></div>
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
          <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!delivered.length} onClick={registerDelivery}>Registrar e aplicar XP</button></div>
        </>}
      </Modal>

      <Modal open={modal === "import"} title="Importar atividade de outra turma" subtitle={`Destino: ${classroomName}`} size="medium" onClose={() => setModal(null)}>
        {otherClassrooms.length ? (
          <div className="modal-section-stack">
            <div className="form-grid">
              <label className="field-label">Turma de origem</label>
              <select className="select full" value={sourceClassroomId} onChange={(e) => changeSourceClassroom(e.target.value)}>{otherClassrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}</select>
              <label className="field-label">Atividade</label>
              <select className="select full" value={sourceActivityId} onChange={(e) => setSourceActivityId(e.target.value)}><option value="">Selecione</option>{sourceActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title} · {activity.questions?.length ?? 0} questões</option>)}</select>
            </div>
            <div className="copy-policy"><strong>Será criada uma cópia independente.</strong><p>Conteúdo, questões, XP e recurso externo são copiados. Entregas, alunos, resultados, ScoreEvents e histórico não são copiados.</p></div>
            <div className="modal-footer"><button className="button ghost" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!sourceActivityId} onClick={importActivityCopy}>Importar cópia</button></div>
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
            return <div className="ranking-full-row" key={row.student.id}><b className="place">#{index + 1}</b><Avatar student={row.student} /><div className="rank-main"><div><strong>{row.student.name}</strong><span>{level.name}</span></div><div className="progress"><span style={{ width: `${getLevelProgress(row.xp)}%` }} /></div></div><div className="weekly">7 dias <b>+{weekly}</b></div><strong>{row.xp} XP</strong></div>;
          })}
          {!leaderboard.length && <MiniEmpty text="O ranking aparecerá após cadastrar alunos." />}
        </div>
      </Panel>
    </div>
  );
}

function HistoryView({ events, students, onDelete }: { events: ArenaData["scoreEvents"]; students: Student[]; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = events.slice().reverse().filter((event) => {
    const student = students.find((s) => s.id === event.studentId);
    return `${student?.name ?? ""} ${event.description} ${event.category}`.toLowerCase().includes(query.toLowerCase());
  });
  return (
    <Panel title="Histórico de XP" subtitle="Auditoria completa de respostas, entregas, bônus e ajustes">
      <input className="input search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno, motivo ou categoria..." />
      <div className="history-list">
        {filtered.map((event) => { const student = students.find((s) => s.id === event.studentId); return <div className="history-row" key={event.id}><Avatar student={student ?? { id: "x", name: "?", nickname: "", createdAt: "" }} /><div className="grow"><strong>{student?.name ?? "Aluno removido"}</strong><small>{event.description} · {dateTime(event.createdAt)}</small></div><span className="category-tag">{event.category}</span><b className={event.points >= 0 ? "positive" : "negative"}>{event.points >= 0 ? "+" : ""}{event.points} XP</b><button className="icon-button danger" title="Remover lançamento" onClick={() => onDelete(event.id)}>×</button></div>; })}
        {!filtered.length && <MiniEmpty text="Nenhum lançamento encontrado." />}
      </div>
    </Panel>
  );
}

function BackupView({ data, setData, notify }: { data: ArenaData; setData: (data: ArenaData) => void; notify: (message: string) => void }) {
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
        const parsed = JSON.parse(String(reader.result)) as ArenaData;
        if (!Array.isArray(parsed.classrooms) || !Array.isArray(parsed.students) || !Array.isArray(parsed.scoreEvents)) throw new Error();
        setData({ ...EMPTY_DATA, ...parsed });
        notify("Backup importado com sucesso.");
      } catch { notify("Arquivo de backup inválido."); }
    };
    reader.readAsText(file);
  }

  function loadDemo() {
    const classroomId = uid("class");
    const names = ["Ana Luiza", "Carlos Henrique", "João Pedro", "Maria Francisca", "Pedro Augusto", "Rafael Lima"];
    const students = names.map((name) => ({ id: uid("student"), name, nickname: name.split(" ")[0], createdAt: new Date().toISOString() }));
    const enrollments = students.map((student) => ({ id: uid("enrollment"), classroomId, studentId: student.id, active: true, joinedAt: new Date().toISOString() }));
    const scoreEvents = students.flatMap((student, index) => index < 4 ? [{ id: uid("score"), classroomId, studentId: student.id, points: (index + 1) * 20, category: "BONUS" as const, description: "Dados de demonstração", createdAt: new Date().toISOString() }] : []);
    setData({ ...EMPTY_DATA, classrooms: [{ id: classroomId, name: "Desenvolvimento de Sistemas", code: "DS-DEMO", createdAt: new Date().toISOString() }], students, enrollments, scoreEvents, activeClassroomId: classroomId });
    notify("Demonstração carregada.");
  }

  return (
    <div className="two-col">
      <Panel title="Backup dos dados" subtitle="Como a V1 é local-first, faça backup periódico">
        <div className="backup-card"><span className="backup-icon">↓</span><div><h3>Exportar tudo</h3><p>Turmas, alunos, sessões, histórico, atividades e grupos em um único JSON.</p></div><button className="button primary" onClick={exportData}>Exportar JSON</button></div>
        <div className="backup-card"><span className="backup-icon">↑</span><div><h3>Restaurar backup</h3><p>Substitui os dados locais pela cópia selecionada.</p></div><label className="button file-button">Importar JSON<input type="file" accept="application/json" onChange={(e) => importData(e.target.files?.[0])} /></label></div>
      </Panel>
      <Panel title="Ambiente de demonstração" subtitle="Teste o sistema sem cadastrar sua turma real">
        <div className="demo-block"><div className="target-mark small">A</div><h3>Carregar turma demonstrativa</h3><p>Cria uma turma com seis alunos e pontuação inicial para você navegar por todas as telas.</p><button className="button" onClick={loadDemo}>Carregar demonstração</button></div>
        <div className="local-note"><strong>Privacidade da V1</strong><p>Nenhum dado é enviado para servidor. Tudo permanece no armazenamento local deste navegador até você limpar os dados do site.</p></div>
      </Panel>
    </div>
  );
}

function Modal({ open, title, subtitle, size = "medium", onClose, children }: {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: "medium" | "large";
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
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
        <div className="modal-body">{children}</div>
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
