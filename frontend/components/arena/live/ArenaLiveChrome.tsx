"use client";

import type { ReactNode } from "react";
import { Button, Menu, MenuItem } from "@/components/ui";
import styles from "./ArenaLiveChrome.module.css";

export type ArenaDynamic = "runbook" | "draw" | "wordcloud" | "poll" | "quiz" | "learning-check" | "buzzer" | "boss";
export type ArenaTool = "timer" | "groups" | "attendance" | "ranking" | "score" | null;

type ArenaGlyphName =
  | "arena"
  | "draw"
  | "quiz"
  | "learning-check"
  | "poll"
  | "wordcloud"
  | "buzzer"
  | "boss"
  | "runbook"
  | "timer"
  | "groups"
  | "attendance"
  | "ranking"
  | "score";

export function ArenaGlyph({ name }: { name: ArenaGlyphName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      {name === "draw" && <><circle {...common} cx="12" cy="12" r="7" /><circle {...common} cx="12" cy="12" r="2.5" /><path {...common} d="M12 2v3M19 5l-2 2M22 12h-3" /></>}
      {name === "quiz" && <><path {...common} d="M9.5 9a2.7 2.7 0 1 1 4.7 1.8c-1.2 1-2.2 1.4-2.2 3" /><path {...common} d="M12 18h.01" /><circle {...common} cx="12" cy="12" r="9" /></>}
      {name === "learning-check" && <><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="m8.5 12 2.2 2.2 4.8-5" /></>}
      {name === "poll" && <><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="M12 4v8h8M12 12l-5.6 5.6" /></>}
      {name === "wordcloud" && <path {...common} d="M7.5 18h9.2a4.3 4.3 0 0 0 .8-8.5A5.8 5.8 0 0 0 6.6 8.2 4.8 4.8 0 0 0 7.5 18Z" />}
      {name === "buzzer" && <path {...common} d="m13.5 2-7 11h5l-1 9 7-12h-5l1-8Z" />}
      {name === "boss" && <><path {...common} d="m12 3 7 4-7 4-7-4 7-4Z" /><path {...common} d="m5 7 7 4 7-4v10l-7 4-7-4V7Z" /><path {...common} d="M12 11v10" /></>}
      {name === "runbook" && <><rect {...common} x="4" y="4" width="16" height="16" rx="2" /><path {...common} d="m10 8 5 4-5 4V8Z" /></>}
      {name === "timer" && <><circle {...common} cx="12" cy="13" r="7" /><path {...common} d="M12 13V9M9 2h6M12 6V4" /></>}
      {name === "groups" && <><circle {...common} cx="9" cy="9" r="3" /><circle {...common} cx="17" cy="10" r="2.3" /><path {...common} d="M3.5 19a5.5 5.5 0 0 1 11 0M14 18a4 4 0 0 1 6.5-3.1" /></>}
      {name === "attendance" && <><rect {...common} x="5" y="3" width="14" height="18" rx="2" /><path {...common} d="m8.5 12 2.2 2.2 4.8-5" /></>}
      {name === "ranking" && <><path {...common} d="M5 19V11M12 19V5M19 19v-6" /><path {...common} d="M3 19h18" /></>}
      {name === "score" && <><circle {...common} cx="12" cy="12" r="8" /><path {...common} d="M12 8v8M8 12h8" /></>}
      {name === "arena" && <><path {...common} d="M7 9h10a4 4 0 0 1 3.7 5.5l-1 2.5a2 2 0 0 1-3.2.8L14.8 16H9.2l-1.7 1.8a2 2 0 0 1-3.2-.8l-1-2.5A4 4 0 0 1 7 9Z" /><path {...common} d="M8 12v3M6.5 13.5h3M16 12h.01M18 14h.01" /></>}
    </svg>
  );
}

type ArenaSidebarProps = {
  activeDynamic: ArenaDynamic;
  activeTool: ArenaTool;
  teacherUsername: string;
  onGoDashboard: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSelectDynamic: (dynamic: ArenaDynamic) => void;
  onSelectTool: (tool: ArenaTool) => void;
};

const DYNAMICS = [
  ["draw", "draw", "Sorteio"],
  ["quiz", "quiz", "Quiz"],
  ["learning-check", "learning-check", "Verificar aprendizagem"],
  ["poll", "poll", "Votação"],
  ["wordcloud", "wordcloud", "Nuvem de Palavras"],
  ["buzzer", "buzzer", "Buzzer"],
  ["boss", "boss", "Boss Battle"],
] as const satisfies ReadonlyArray<readonly [ArenaDynamic, ArenaGlyphName, string]>;

export function ArenaSidebar({
  activeDynamic,
  activeTool,
  teacherUsername,
  onGoDashboard,
  onOpenSettings,
  onLogout,
  onSelectDynamic,
  onSelectTool,
}: ArenaSidebarProps) {
  return (
    <aside className="arena-cockpit-nav" aria-label="Ferramentas da Arena">
      <button
        type="button"
        className="arena-nav-brand"
        onClick={onGoDashboard}
        aria-label="Voltar para Turmas"
        title="Voltar para Turmas"
      >
        <span className="topbar-brand-mark">A</span>
        <span className="arena-nav-brand-copy">
          <strong>ARENA DEV</strong>
          <small>Classroom Edition</small>
        </span>
      </button>

      <span className="arena-nav-mobile-title" aria-hidden="true">
        <strong>Arena</strong>
        <small>Ao vivo</small>
      </span>

      <div className="arena-nav-scroll" role="navigation" aria-label="Dinâmicas da Arena">
        <div className="arena-cockpit-nav-group">
          <span className="arena-cockpit-nav-label">DINÂMICAS</span>
          {DYNAMICS.map(([id, icon, label]) => (
            <button
              key={id}
              type="button"
              className={activeDynamic === id ? "active" : ""}
              aria-current={activeDynamic === id ? "page" : undefined}
              aria-label={label}
              title={label}
              onClick={() => onSelectDynamic(id)}
            >
              <span aria-hidden="true"><ArenaGlyph name={icon} /></span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>

        <div className="arena-cockpit-nav-group">
          <span className="arena-cockpit-nav-label">FERRAMENTAS</span>
          <button type="button" className={activeDynamic === "runbook" ? "active" : ""} aria-label="Roteiro da aula" title="Roteiro da aula" onClick={() => onSelectDynamic("runbook")}>
            <span aria-hidden="true"><ArenaGlyph name="runbook" /></span><strong>Roteiro da aula</strong>
          </button>
          <button type="button" className={activeTool === "timer" ? "active" : ""} aria-label="Timer" title="Timer" onClick={() => onSelectTool("timer")}>
            <span aria-hidden="true"><ArenaGlyph name="timer" /></span><strong>Timer</strong>
          </button>
          <button type="button" className={activeTool === "groups" ? "active" : ""} aria-label="Organizar turma" title="Organizar turma" onClick={() => onSelectTool("groups")}>
            <span aria-hidden="true"><ArenaGlyph name="groups" /></span><strong>Organizar turma</strong>
          </button>
          <button type="button" className={activeTool === "attendance" ? "active" : ""} aria-label="Presença" title="Presença" onClick={() => onSelectTool("attendance")}>
            <span aria-hidden="true"><ArenaGlyph name="attendance" /></span><strong>Presença</strong>
          </button>
          <button type="button" className={activeTool === "ranking" ? "active" : ""} aria-label="Ranking" title="Ranking" onClick={() => onSelectTool("ranking")}>
            <span aria-hidden="true"><ArenaGlyph name="ranking" /></span><strong>Ranking</strong>
          </button>
          <button type="button" className={activeTool === "score" ? "active" : ""} aria-label="Pontuação rápida" title="Pontuação rápida" onClick={() => onSelectTool("score")}>
            <span aria-hidden="true"><ArenaGlyph name="score" /></span><strong>Pontuação rápida</strong>
          </button>
        </div>
      </div>

      <div className="arena-nav-mobile-tools">
        <Menu
          trigger={(triggerProps) => (
            <button
              {...triggerProps}
              type="button"
              className="arena-nav-tools-trigger"
              aria-label="Ferramentas da Arena"
              data-active={activeDynamic === "runbook" || activeTool !== null ? "true" : undefined}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <strong>Ferramentas</strong>
            </button>
          )}
        >
          <MenuItem icon={<ArenaGlyph name="runbook" />} onSelect={() => onSelectDynamic("runbook")}>Roteiro da aula</MenuItem>
          <MenuItem icon={<ArenaGlyph name="timer" />} onSelect={() => onSelectTool("timer")}>Timer</MenuItem>
          <MenuItem icon={<ArenaGlyph name="groups" />} onSelect={() => onSelectTool("groups")}>Organizar turma</MenuItem>
          <MenuItem icon={<ArenaGlyph name="attendance" />} onSelect={() => onSelectTool("attendance")}>Presença</MenuItem>
          <MenuItem icon={<ArenaGlyph name="ranking" />} onSelect={() => onSelectTool("ranking")}>Ranking</MenuItem>
          <MenuItem icon={<ArenaGlyph name="score" />} onSelect={() => onSelectTool("score")}>Pontuação rápida</MenuItem>
        </Menu>
      </div>

      <div className="arena-nav-professor">
        <Menu
          trigger={(triggerProps) => (
            <button {...triggerProps} type="button" className="topbar-profile arena-live-profile" aria-label="Abrir menu do professor">
              <span className="topbar-profile-avatar">{teacherUsername.trim().charAt(0).toUpperCase() || "P"}</span>
              <span className="topbar-profile-copy">
                <strong>{teacherUsername}</strong>
                <small>Professor</small>
              </span>
              <span className="topbar-profile-chevron">⌄</span>
            </button>
          )}
        >
          <MenuItem icon="⚙" description="Perfil, sistema e backup" onSelect={onOpenSettings}>Configurações</MenuItem>
          <MenuItem icon="↪" danger description="Encerrar sessão do professor" onSelect={onLogout}>Sair</MenuItem>
        </Menu>
      </div>
    </aside>
  );
}

type ArenaSessionHeaderProps = {
  classroomName: string;
  elapsed: string;
  sessionBusy: boolean;
  canProject: boolean;
  nextActions?: ReactNode;
  onBack: () => void;
  onToggleProjector: () => void;
  projectorActive: boolean;
  projectorPending: boolean;
  onEndSession: () => void;
};

export function ArenaSessionHeader({
  classroomName,
  elapsed,
  sessionBusy,
  canProject,
  nextActions,
  onBack,
  onToggleProjector,
  projectorActive,
  projectorPending,
  onEndSession,
}: ArenaSessionHeaderProps) {
  return (
    <header className="topbar app-topbar arena-live-topbar">
      <nav className="arena-live-context" aria-label="Turma atual">
        <button
          type="button"
          className="arena-live-classroom-link"
          onClick={onBack}
          aria-label={`Voltar para a turma ${classroomName}`}
          title={`Voltar para a turma ${classroomName}`}
        >
          <span aria-hidden="true">←</span>
          <strong>{classroomName}</strong>
        </button>
      </nav>

      <div className="topbar-actions arena-session-actions">
        <div className="arena-session-shortcuts">{nextActions}</div>
        <div className="arena-session-elapsed" aria-label={`Tempo de sessão ${elapsed}`}>
          <span aria-hidden="true">◷</span>
          <div>
            <strong>{elapsed}</strong>
            <small>Tempo de sessão</small>
          </div>
        </div>
        <button
          type="button"
          className="arena-projector-toggle"
          aria-pressed={projectorActive}
          aria-label={projectorActive ? "Desativar projetor" : "Ativar projetor"}
          title={projectorActive ? "Fechar a janela de projeção deste navegador" : "Abrir uma janela de projeção"}
          data-active={projectorActive ? "true" : "false"}
          onClick={onToggleProjector}
          disabled={!canProject || projectorPending}
        >
          <span aria-hidden="true" className="arena-projector-toggle-indicator" />
          {projectorPending ? "Conectando..." : projectorActive ? "Projetando" : "Projetar"}
        </button>
        <Button
          variant="danger"
          loading={sessionBusy}
          loadingLabel="Encerrando..."
          onClick={onEndSession}
        >
          Encerrar sessão
        </Button>
      </div>
    </header>
  );
}

export function ArenaLiveShell({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`arena-live-shell ${styles.liveShell}`}>
      {sidebar}
      <div className={`arena-session-workspace ${styles.workspace}`}>
        {header}
        {children}
      </div>
    </div>
  );
}
