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


test("Sorteio Inteligente 2.0 renders a semicircle roulette backed by session participants", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="draw-wheel-viewport"/);
  assert.match(app, /"draw-wheel-semicircle is-spinning"/);
  assert.match(app, /currentSession\.presentStudentIds\.includes\(student\.id\)/);
  assert.match(app, /aria-label=\{drawPhase === "drawing" \? "Sorteio em andamento" : "Sortear aluno"\}/);
  assert.match(css, /\.draw-wheel-viewport\s*\{/);
  assert.match(css, /\.draw-wheel-semicircle\s*\{/);
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

test("Smart Draw workspace prioritizes the roulette and moves policies to settings", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /className="smart-draw-workspace"/);
  assert.match(app, /setDrawSettingsOpen\(true\)/);
  assert.match(app, /title="Configurações do Sorteio"/);
  assert.match(app, /POLÍTICAS DO BACKEND/);
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


test("Arena separates primary dynamics from contextual tools", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /type ArenaDynamic = "runbook" \| "draw"/);
  assert.match(app, /type ArenaTool = "timer" \| "groups" \| "attendance" \| "score" \| null/);
  assert.match(app, /const \[activeDynamic, setActiveDynamic\]/);
  assert.match(app, /const \[activeTool, setActiveTool\]/);
  assert.doesNotMatch(app, /const \[arenaTab, setArenaTab\]/);
});

test("Arena contextual tools open without replacing the primary dynamic", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /setActiveTool\("timer"\)/);
  assert.match(app, /setActiveTool\("groups"\)/);
  assert.match(app, /setActiveTool\("attendance"\)/);
  assert.match(app, /setActiveTool\("score"\)/);
  assert.match(app, /open=\{activeTool === "timer"\}/);
  assert.match(app, /open=\{activeTool === "attendance"\}/);
});

test("Arena tool drawer is modal, keyboard dismissible and mobile aware", () => {
  const drawer = read("components/ArenaToolDrawer.tsx");
  const css = read("components/ArenaToolDrawer.module.css");

  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /event\.key === "Escape"/);
  assert.match(css, /@media \(max-width: 48rem\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("Buzzer uses the gamified Arena workspace instead of the legacy panel", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="buzzer-workspace"/);
  assert.match(app, /buzzer-orb/);
  assert.match(app, /ORDEM OFICIAL/);
  assert.match(app, /Primeiro clique confirmado pelo servidor/);
  assert.match(css, /\.buzzer-workspace\s*\{/);
  assert.match(css, /\.buzzer-podium-row\.winner\s*\{/);
});

test("Buzzer preserves server authority and winner scoring", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /ordem oficial definida pelo servidor/);
  assert.match(app, /toggleBuzzer\(true\)/);
  assert.match(app, /toggleBuzzer\(false\)/);
  assert.match(app, /addBuzzerScore\(press\.studentId, 5\)/);
  assert.match(app, /addBuzzerScore\(press\.studentId, 10\)/);
});


test("Quiz 2.0 uses a gamified prepare and live workspace", () => {
  const quiz = read("components/QuizPanel.tsx");
  const css = read("components/QuizPanel.module.css");

  assert.match(quiz, /DINÂMICA AO VIVO/);
  assert.match(quiz, /className=\{styles\.prepareGrid\}/);
  assert.match(quiz, /className=\{styles\.liveStage\}/);
  assert.match(quiz, /QUESTÃO ATUAL/);
  assert.match(quiz, /responseProgress/);
  assert.match(css, /\.prepareGrid\s*\{/);
  assert.match(css, /\.liveStage\s*\{/);
});

test("Quiz 2.0 preserves explicit teacher control and pedagogical feedback", () => {
  const quiz = read("components/QuizPanel.tsx");

  assert.match(quiz, /Abrir respostas/);
  assert.match(quiz, /Bloquear respostas/);
  assert.match(quiz, /Revelar resultado/);
  assert.match(quiz, /LEITURA PEDAGÓGICA/);
  assert.match(quiz, /Nenhuma decisão avança o roteiro automaticamente/);
});


test("Votação 2.0 uses a gamified prepare and live workspace", () => {
  const poll = read("components/PollPanel.tsx");
  const css = read("components/PollPanel.module.css");

  assert.match(poll, /DINÂMICA AO VIVO/);
  assert.match(poll, /className=\{styles\.prepareGrid\}/);
  assert.match(poll, /className=\{styles\.liveGrid\}/);
  assert.match(poll, /PARTICIPAÇÃO DA TURMA/);
  assert.match(poll, /DISTRIBUIÇÃO/);
  assert.match(css, /\.prepareGrid\s*\{/);
  assert.match(css, /\.liveGrid\s*\{/);
});

test("Votação 2.0 preserves reveal and explicit close control", () => {
  const poll = read("components/PollPanel.tsx");

  assert.match(poll, /Revelar resultados/);
  assert.match(poll, /Encerrar votação/);
  assert.match(poll, /window\.confirm/);
  assert.match(poll, /Resultados ao vivo/);
  assert.match(poll, /Resultados protegidos/);
});


test("Nuvem de Palavras 2.0 uses a gamified prepare and live stage", () => {
  const cloud = read("components/WordCloudPanel.tsx");
  const css = read("components/WordCloudPanel.module.css");

  assert.match(cloud, /DINÂMICA AO VIVO/);
  assert.match(cloud, /className=\{styles\.prepareGrid\}/);
  assert.match(cloud, /className=\{styles\.liveGrid\}/);
  assert.match(cloud, /PALCO DA TURMA/);
  assert.match(cloud, /NUVEM DA TURMA/);
  assert.match(cloud, /participationProgress/);
  assert.match(css, /\.previewCloudOrb\s*\{/);
  assert.match(css, /\.cloudStage\s*\{/);
});

test("Nuvem de Palavras 2.0 preserves reveal, projector and close controls", () => {
  const cloud = read("components/WordCloudPanel.tsx");

  assert.match(cloud, /Revelar respostas/);
  assert.match(cloud, /Projetar Nuvem/);
  assert.match(cloud, /Encerrar rodada/);
  assert.match(cloud, /window\.confirm/);
  assert.match(cloud, /Coleta protegida/);
});


test("Boss Battle 2.0 uses a gamified collective challenge workspace", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="boss-workspace"/);
  assert.match(app, /DESAFIO COLETIVO/);
  assert.match(app, /CONTROLE DE COMBATE/);
  assert.match(app, /HP DO BOSS/);
  assert.match(app, /BOSS DERROTADO/);
  assert.match(css, /\.boss-live-grid/);
  assert.match(css, /\.boss-core\.critical\s*\{/);
});

test("Boss Battle 2.0 preserves backend-authoritative manual damage", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /damageBoss\(10\)/);
  assert.match(app, /damageBoss\(20\)/);
  assert.match(app, /damageBoss\(30\)/);
  assert.match(app, /Dano manual nesta versão/);
  assert.match(app, /Quiz e XP não reduzem HP automaticamente/);
  assert.match(app, /createBoss\(\)/);
});


test("Arena desktop fidelity pass removes the global content max width only inside Arena", () => {
  const app = read("components/ArenaApp.tsx");
  const globals = read("app/globals.css");

  assert.match(app, /view === "arena" \? "content arena-content-full" : "content"/);
  assert.match(globals, /\.app-shell-no-sidebar \.content\.arena-content-full/);
  assert.match(globals, /max-width:\s*none/);
});

test("Semicircle roulette animates to the student selected by the backend", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /const result = await drawStudentApi\(currentSession\.id\)/);
  assert.match(app, /targetIndex = participants\.findIndex/);
  assert.match(app, /targetResidue/);
  assert.match(app, /setDrawRotation/);
  assert.match(app, /1080 \+ alignmentDelta/);
  assert.doesNotMatch(app, /Math\.random\(\).*student|student.*Math\.random\(\)/);
});

test("Draw settings expose backend policies as information instead of fake controls", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /MODO ATIVO/);
  assert.match(app, /Balanceado/);
  assert.match(app, /Apenas presentes/);
  assert.match(app, /Evita repetição imediata/);
  assert.doesNotMatch(app, /draw-settings-rule[\s\S]{0,120}<input/);
});
