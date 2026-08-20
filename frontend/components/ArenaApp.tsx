"use client";

import { useEffect, useMemo, useState } from "react";
import { createBalancedGroups, getLevel, getLevelProgress, weightedDraw, xpForStudent } from "@/lib/game";
import { EMPTY_DATA, loadData, saveData, uid } from "@/lib/store";
import type { ArenaData, ScoreCategory, Student } from "@/lib/types";

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
              patch={patch}
              notify={notify}
            />
          )}

          {view === "activities" && activeClassroom && (
            <ActivitiesView
              data={data}
              classroomId={activeClassroom.id}
              students={classStudents}
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

function ArenaView({ data, classroomId, students, currentSession, leaderboard, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  students: Student[];
  currentSession?: ArenaData["sessions"][number];
  leaderboard: { student: Student; xp: number }[];
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

  useEffect(() => {
    if (!currentSession) setPresentIds(students.map((s) => s.id));
  }, [students, currentSession]);

  function startSession() {
    if (!presentIds.length) return;
    const id = uid("session");
    patch((current) => ({
      ...current,
      sessions: [...current.sessions, { id, classroomId, title: title.trim() || `Aula · ${todayTitle()}`, startedAt: new Date().toISOString(), presentStudentIds: presentIds, drawCounts: {} }],
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
      scoreEvents: [...current.scoreEvents, { id: uid("score"), classroomId, studentId: selectedId, sessionId: currentSession.id, points, category, description, createdAt: new Date().toISOString() }],
    }));
    notify(`${points >= 0 ? "+" : ""}${points} XP registrado.`);
  }

  function createGroups() {
    if (!currentSession) return;
    const prior = data.groupHistory.filter((record) => record.classroomId === classroomId).map((record) => record.groups);
    const next = createBalancedGroups(currentSession.presentStudentIds, groupSize, prior);
    setGroups(next);
    patch((current) => ({ ...current, groupHistory: [...current.groupHistory, { id: uid("groups"), classroomId, sessionId: currentSession.id, createdAt: new Date().toISOString(), groups: next }] }));
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

  if (!currentSession) {
    return (
      <div className="two-col uneven">
        <Panel title="Abrir nova sessão" subtitle="A presença define quem participa dos sorteios">
          <div className="form-grid">
            <label className="field-label">Título da sessão</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
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

        <Panel title="Duplas e grupos" subtitle="Evita repetir combinações sempre que possível">
          <div className="group-controls">
            <label>Tamanho do grupo<select className="select" value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select></label>
            <button className="button" onClick={createGroups}>Gerar grupos</button>
          </div>
          {groups.length > 0 ? <div className="groups-grid">{groups.map((group, i) => <div className="group-card" key={i}><b>GRUPO {String(i + 1).padStart(2, "0")}</b>{group.map((id) => <span key={id}>{students.find((s) => s.id === id)?.nickname || students.find((s) => s.id === id)?.name}</span>)}</div>)}</div> : <MiniEmpty text="Gere os grupos quando precisar mudar a dinâmica." />}
        </Panel>
      </div>

      <Panel title="Ranking ao vivo" subtitle="Atualizado a cada lançamento de XP">
        <div className="live-ranking">{leaderboard.slice(0, 8).map((row, index) => <div key={row.student.id}><span>{index + 1}</span><Avatar student={row.student} /><strong>{row.student.nickname || row.student.name}</strong><b>{row.xp} XP</b></div>)}</div>
      </Panel>
    </div>
  );
}

function ActivitiesView({ data, classroomId, students, patch, notify }: {
  data: ArenaData;
  classroomId: string;
  students: Student[];
  patch: (updater: (current: ArenaData) => ArenaData) => void;
  notify: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState(10);
  const [bonus, setBonus] = useState(5);
  const [delivered, setDelivered] = useState<string[]>([]);
  const [onTime, setOnTime] = useState<string[]>([]);

  function register() {
    if (!title.trim() || !delivered.length) return;
    const activityId = uid("activity");
    const now = new Date().toISOString();
    const events = delivered.flatMap((studentId) => {
      const rows = [{ id: uid("score"), classroomId, studentId, points, category: "SUBMISSION" as const, description: `Entrega: ${title.trim()}`, createdAt: now }];
      if (onTime.includes(studentId) && bonus) rows.push({ id: uid("score"), classroomId, studentId, points: bonus, category: "SUBMISSION" as const, description: `Bônus no prazo: ${title.trim()}`, createdAt: now });
      return rows;
    });
    patch((current) => ({
      ...current,
      activities: [...current.activities, { id: activityId, classroomId, title: title.trim(), points, onTimeBonus: bonus, createdAt: now }],
      scoreEvents: [...current.scoreEvents, ...events],
    }));
    notify(`XP registrado para ${delivered.length} aluno(s).`);
    setTitle(""); setDelivered([]); setOnTime([]);
  }

  return (
    <div className="two-col uneven">
      <Panel title="Registrar entrega" subtitle="Ideal para atividades entregues no Teams">
        <div className="form-grid">
          <label className="field-label">Atividade</label>
          <input className="input" placeholder="Ex.: Atividade 07 — Funções" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="form-two"><label>XP da entrega<input className="input" type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} /></label><label>Bônus no prazo<input className="input" type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} /></label></div>
        </div>
        <div className="attendance-head"><strong>Alunos</strong><span>{delivered.length} selecionados</span></div>
        <div className="delivery-list">
          {students.map((student) => (
            <div className="delivery-row" key={student.id}>
              <label><input type="checkbox" checked={delivered.includes(student.id)} onChange={(e) => { setDelivered((cur) => e.target.checked ? [...cur, student.id] : cur.filter((id) => id !== student.id)); if (!e.target.checked) setOnTime((cur) => cur.filter((id) => id !== student.id)); }} /><Avatar student={student} /><span>{student.name}</span></label>
              <label className="on-time"><input type="checkbox" disabled={!delivered.includes(student.id)} checked={onTime.includes(student.id)} onChange={(e) => setOnTime((cur) => e.target.checked ? [...cur, student.id] : cur.filter((id) => id !== student.id))} />No prazo</label>
            </div>
          ))}
        </div>
        <button className="button primary full large" disabled={!title.trim() || !delivered.length} onClick={register}>Registrar entregas</button>
      </Panel>

      <Panel title="Últimas atividades" subtitle="Cada lançamento gera eventos de XP auditáveis">
        <div className="activity-list">
          {data.activities.filter((a) => a.classroomId === classroomId).slice().reverse().map((activity) => (
            <div className="activity-card" key={activity.id}><div><strong>{activity.title}</strong><small>{dateTime(activity.createdAt)}</small></div><span>+{activity.points} XP · prazo +{activity.onTimeBonus}</span></div>
          ))}
          {!data.activities.some((a) => a.classroomId === classroomId) && <MiniEmpty text="Nenhuma atividade registrada." />}
        </div>
      </Panel>
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

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <div className="panel"><div className="panel-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></div>{children}</div>;
}
function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function Avatar({ student, large = false }: { student: Student; large?: boolean }) { const initials = student.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(); return <div className={large ? "avatar large" : "avatar"}>{initials}</div>; }
function MiniEmpty({ text }: { text: string }) { return <div className="mini-empty">{text}</div>; }
function EmptyState({ title, text, actionLabel, onAction }: { title: string; text: string; actionLabel: string; onAction: () => void }) { return <div className="empty-state"><div className="target-mark">A</div><h2>{title}</h2><p>{text}</p><button className="button primary large" onClick={onAction}>{actionLabel}</button></div>; }
function Step({ n, title, text }: { n: string; title: string; text: string }) { return <div className="step"><span>{n}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
