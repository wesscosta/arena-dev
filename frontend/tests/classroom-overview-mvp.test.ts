import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function overviewSource(): string {
  const app = read("components/ArenaApp.tsx");
  const start = app.indexOf("function OverviewView(");
  const end = app.indexOf("function ClassroomWorkspaceTabs", start);
  return app.slice(start, end);
}

test("teacher topbar treats Biblioteca as a global destination instead of a CTA", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /topbar-global-nav/);
  assert.match(app, /aria-label="Visão geral"/);
  assert.match(app, /aria-label="Biblioteca"/);
  assert.doesNotMatch(app, /className="button ghost"[^>]*>Biblioteca/);
});

test("classroom overview stays focused on discovery and entry", () => {
  const overview = overviewSource();

  assert.match(overview, /Buscar turma por nome ou código/);
  assert.match(overview, /Acesso recente/);
  assert.match(overview, /overview-class-card-open/);
  assert.match(overview, /classroom\.active \? "Ativa" : "Inativa"/);
  assert.doesNotMatch(overview, /onOpenIntegrations/);
  assert.doesNotMatch(overview, /eventos XP/);
  assert.doesNotMatch(overview, /Arquivada do fluxo ativo/);
});

test("overview cards fill the content width with a stable selected-card cue", () => {
  const css = read("styles/classroom-overview.css");
  const layout = read("app/layout.tsx");
  const tokens = read("styles/tokens.css");
  const globals = read("app/globals.css");

  assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.overview-class-card\.selected::before/);
  assert.match(css, /width:\s*0\.25rem/);
  assert.match(css, /\.overview-class-card\.selected::before[\s\S]*transform:\s*none/);
  assert.match(css, /\.overview-class-card-open[\s\S]*flex-direction:\s*column/);
  assert.match(css, /\.overview-class-meta[\s\S]*margin-top:\s*auto/);
  assert.match(css, /background:\s*var\(--ds-surface\)/);
  assert.match(css, /border:\s*1px solid var\(--ds-border\)/);
  assert.match(tokens, /--ds-shadow-panel:\s*var\(--theme-shadow-panel\)/);
  assert.match(layout, /import "\.\.\/styles\/classroom-overview\.css"/);
  assert.match(tokens, /--ds-shadow-elevated:\s*var\(--theme-shadow-elevated\)/);
  assert.doesNotMatch(globals, /\.overview-class-card:before\{content:"<\/>"/);
});
