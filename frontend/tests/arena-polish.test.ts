import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("Arena polish consumes the global Design System tokens", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /var\(--font-size-sm\)/);
  assert.match(css, /var\(--space-5\)/);
  assert.match(css, /var\(--control-md\)/);
  assert.match(css, /var\(--radius-lg\)/);
});

test("Arena source is treated as a toolbar instead of a nested card", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /\.arena-activity-strip/);
  assert.match(css, /background:\s*transparent/);
  assert.match(css, /border-bottom:/);
});

test("primary Arena grid collapses before mobile widths", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /@media \(max-width: 72rem\)/);
  assert.match(
    css,
    /\.arena-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
});

test("mobile scoring and session actions reflow to one column", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /@media \(max-width: 42rem\)/);
  assert.match(css, /\.score-presets\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.custom-score\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("globals imports Arena polish after accessibility foundation", () => {
  const globals = read("app/globals.css");

  const accessibility = globals.indexOf(
    '@import "../styles/accessibility.css";'
  );
  const polish = globals.indexOf('@import "../styles/arena-polish.css";');

  assert.ok(accessibility >= 0);
  assert.ok(polish > accessibility);
});


test("Professor Arena cockpit replaces the old session tabs", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="arena-cockpit"/);
  assert.match(app, /className="arena-cockpit-nav"/);
  assert.doesNotMatch(app, /className="arena-tabs-six"/);
  assert.match(css, /\.arena-cockpit\s*\{/);
});

test("Professor Arena cockpit exposes dynamics and transversal tools together", () => {
  const app = read("components/ArenaApp.tsx");

  for (const label of [
    "Sorteio",
    "Quiz",
    "Votação",
    "Nuvem de Palavras",
    "Buzzer",
    "Boss Battle",
    "Timer",
    "Organizar turma",
    "Presença",
    "Pontuação rápida",
  ]) {
    assert.ok(app.includes(label), `missing Arena action: ${label}`);
  }
});


test("Sorteio Inteligente 2.0 renders a central roulette backed by session participants", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className=\{drawPhase === "drawing" \? "draw-wheel is-spinning" : "draw-wheel"\}/);
  assert.match(app, /currentSession\.presentStudentIds\.includes\(student\.id\)/);
  assert.match(app, /aria-label=\{drawPhase === "drawing" \? "Sorteio em andamento" : "Sortear aluno"\}/);
  assert.match(css, /\.draw-wheel-center\s*\{/);
  assert.match(css, /\.draw-result-banner\.has-result\s*\{/);
});

test("Sorteio Inteligente 2.0 keeps scoring evidence visible after the draw", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /Sorteado agora/i);
  assert.match(app, /currentSession\.drawCounts\[selected\.id\]/);
  assert.match(app, /selectedXp/);
  assert.match(app, /Pontuação rápida/);
});


test("Professor Arena fidelity pass exposes persistent context rail and QR entry", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="arena-context-rail"/);
  assert.match(app, /placeholder="Buscar aluno\.\.\."/);
  assert.match(app, /joinQrImageUrl\(currentSession\.id/);
  assert.match(css, /\.arena-context-rail\s*\{/);
  assert.match(css, /\.arena-session-code-card\s*\{/);
});

test("Smart Draw workspace keeps roulette, policies, history, coverage and scoring in one surface", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /className="smart-draw-workspace"/);
  assert.match(app, /MODO DE SORTEIO/);
  assert.match(app, /Últimos sorteados/);
  assert.match(app, /drawCoverage/);
  assert.match(app, /Confirmar e pontuar/);
  assert.match(app, /className="quick-score-dock"/);
});

test("Draw history comes from persisted session events instead of a frontend-only array", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /fetchSessionEventsBySession/);
  assert.match(app, /event\.eventType === "DRAW_COMPLETED"/);
  assert.match(app, /event\.payload\.studentId/);
});
