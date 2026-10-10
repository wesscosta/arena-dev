"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ARENA_DYNAMICS, ARENA_TOOLS, type ArenaNavEntry } from "./arena-navigation";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { Button, Menu, MenuItem } from "@/components/ui";
import styles from "./ArenaLiveChrome.module.css";

export type ArenaDynamic = "runbook" | "draw" | "wordcloud" | "poll" | "quiz" | "learning-check" | "buzzer" | "boss";
export type ArenaTool = "timer" | "groups" | "attendance" | "ranking" | "score" | null;

export type ArenaGlyphName =
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
  | "score"
  | "material"
  | "evidence";

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
      {name === "material" && <><path {...common} d="M4 5a3 3 0 0 1 3-2h13v17H7a3 3 0 0 0-3 2V5Z" /><path {...common} d="M4 19a3 3 0 0 1 3-2h13M8 7h8M8 11h6" /></>}
      {name === "evidence" && <><path {...common} d="M4 19V5M4 19h16M8 15l4-4 3 2 5-6" /><circle {...common} cx="20" cy="7" r="1" /></>}
      {name === "arena" && <><path {...common} d="M7 9h10a4 4 0 0 1 3.7 5.5l-1 2.5a2 2 0 0 1-3.2.8L14.8 16H9.2l-1.7 1.8a2 2 0 0 1-3.2-.8l-1-2.5A4 4 0 0 1 7 9Z" /><path {...common} d="M8 12v3M6.5 13.5h3M16 12h.01M18 14h.01" /></>}
    </svg>
  );
}

type ArenaSidebarProps = {
  activeDynamic: ArenaDynamic;
  activeTool: ArenaTool;
  teacherUsername: string;
  sessionElapsed: string;
  sessionBusy: boolean;
  materialAction: ReactNode;
  evidenceAction: ReactNode;
  onGoDashboard: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onEndSession: () => void;
  onSelectDynamic: (dynamic: ArenaDynamic) => void;
  onSelectTool: (tool: ArenaTool) => void;
};

export function ArenaSidebar({
  activeDynamic, activeTool, teacherUsername, sessionElapsed, sessionBusy,
  materialAction, evidenceAction,
  onGoDashboard, onOpenSettings, onLogout, onEndSession,
  onSelectDynamic, onSelectTool,
}: ArenaSidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  useBodyScrollLock(menuOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const query = window.matchMedia("(max-width: 48rem)");
    if (!query.matches) return;
    const returnFocus = triggerRef.current;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
      if (event.key !== "Tab") return;
      const focusables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]',
      ) ?? []).filter((node) => node.getClientRects().length > 0);
      if (!focusables.length) { event.preventDefault(); return; }
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onResize = () => { if (!query.matches) closeMenu(); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      // A portal dialog may have acquired focus from one of the navigation actions.
      if (!document.querySelector('[role="dialog"][aria-modal="true"]')) returnFocus?.focus();
    };
  }, [menuOpen]);

  const pickDynamic = (id: ArenaDynamic) => { closeMenu(); onSelectDynamic(id); };
  const pickTool = (id: ArenaTool) => { closeMenu(); onSelectTool(id); };
  const renderEntry = (item: ArenaNavEntry) => {
    const active = item.kind === "dynamic" ? activeDynamic === item.id : activeTool === item.id;
    return <button key={item.id} type="button" className={active ? "active" : ""}
      aria-current={active ? "page" : undefined} aria-label={item.label} title={item.label}
      onClick={() => item.kind === "dynamic"
        ? pickDynamic(item.target)
        : pickTool(item.target)}>
      <span aria-hidden="true"><ArenaGlyph name={item.icon} /></span>
      <strong>{item.label}</strong>
    </button>;
  };

  return (
    <aside className="arena-cockpit-nav" aria-label="Ferramentas da Arena">
      <button type="button" className="arena-nav-brand" onClick={onGoDashboard}
        aria-label="Voltar para Turmas" title="Voltar para Turmas">
        <span className="topbar-brand-mark">A</span>
        <span className="arena-nav-brand-copy"><strong>ARENA DEV</strong><small>Classroom Edition</small></span>
      </button>
      <span className="arena-nav-mobile-title" aria-hidden="true"><strong>Arena</strong></span>
      <button ref={triggerRef} type="button" className="arena-nav-menu-trigger"
        aria-label="Abrir menu da Arena" aria-expanded={menuOpen} aria-controls="arena-navigation-panel"
        onClick={() => setMenuOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {menuOpen && <button type="button" className="arena-nav-menu-backdrop"
        aria-label="Fechar menu da Arena" onClick={closeMenu} />}
      <div id="arena-navigation-panel" ref={panelRef} className="arena-nav-panel"
        data-open={menuOpen ? "true" : "false"}
        role={menuOpen ? "dialog" : undefined} aria-modal={menuOpen || undefined}
        aria-label={menuOpen ? "Menu da Arena" : undefined}>
        <div className="arena-nav-panel-head">
          <strong>Menu da Arena</strong>
          <button type="button" aria-label="Fechar menu da Arena" onClick={closeMenu}>×</button>
        </div>
        <div className="arena-nav-scroll" role="navigation" aria-label="Dinâmicas da Arena">
          <div className="arena-cockpit-nav-group arena-nav-group-aula">
            <span className="arena-cockpit-nav-label">AULA</span>
            <div className="arena-nav-slot" onClick={closeMenu}>{materialAction}</div>
            <button type="button" className={activeDynamic === "runbook" ? "active" : ""}
              aria-label="Roteiro da aula" title="Roteiro da aula" onClick={() => pickDynamic("runbook")}>
              <span aria-hidden="true"><ArenaGlyph name="runbook" /></span><strong>Roteiro da aula</strong>
            </button>
          </div>
          <div className="arena-cockpit-nav-group">
            <span className="arena-cockpit-nav-label">DINÂMICAS</span>
            {ARENA_DYNAMICS.map(renderEntry)}
          </div>
          <div className="arena-cockpit-nav-group">
            <span className="arena-cockpit-nav-label">FERRAMENTAS</span>
            {ARENA_TOOLS.map(renderEntry)}
          </div>
          <div className="arena-cockpit-nav-group arena-nav-group-followup">
            <span className="arena-cockpit-nav-label">ACOMPANHAMENTO</span>
            <div className="arena-nav-slot" onClick={closeMenu}>{evidenceAction}</div>
          </div>
          <div className="arena-cockpit-nav-group arena-nav-mobile-session">
            <span className="arena-cockpit-nav-label">SESSÃO E CONTA</span>
            <div className="arena-nav-elapsed">Tempo de sessão: <strong>{sessionElapsed}</strong></div>
            <button type="button" onClick={() => { closeMenu(); onOpenSettings(); }}>
              <span aria-hidden="true">⚙</span><strong>Configurações</strong>
            </button>
            <button type="button" className="arena-nav-danger" disabled={sessionBusy}
              onClick={() => { closeMenu(); onEndSession(); }}>
              <span aria-hidden="true">×</span><strong>Encerrar sessão da Arena</strong>
            </button>
            <button type="button" onClick={() => { closeMenu(); onLogout(); }}>
              <span aria-hidden="true">↪</span><strong>Sair da conta</strong>
            </button>
          </div>
        </div>
        <div className="arena-nav-professor">
          <Menu trigger={(triggerProps) => (
            <button {...triggerProps} type="button" className="topbar-profile arena-live-profile"
              aria-label="Abrir menu do professor">
              <span className="topbar-profile-avatar">{teacherUsername.trim().charAt(0).toUpperCase() || "P"}</span>
              <span className="topbar-profile-copy"><strong>{teacherUsername}</strong><small>Professor</small></span>
              <span className="topbar-profile-chevron">⌄</span>
            </button>
          )}>
            <MenuItem icon="⚙" description="Perfil, sistema e backup" onSelect={onOpenSettings}>Configurações</MenuItem>
            <MenuItem icon="↪" danger description="Sair da conta do professor" onSelect={onLogout}>Sair</MenuItem>
          </Menu>
        </div>
      </div>
    </aside>
  );
}

type ArenaSessionHeaderProps = {
  classroomName: string;
  elapsed: string;
  sessionBusy: boolean;
  canProject: boolean;
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
