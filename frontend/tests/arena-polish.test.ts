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
  const chrome = read("components/arena/live/ArenaLiveChrome.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="arena-cockpit"/);
  assert.match(chrome, /className="arena-cockpit-nav"/);
  assert.doesNotMatch(app, /className="arena-tabs-six"/);
  assert.match(css, /\.arena-cockpit\s*\{/);
});

test("Professor Arena cockpit exposes dynamics and transversal tools together", () => {
  const chrome = read("components/arena/live/ArenaLiveChrome.tsx");

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
    assert.ok(chrome.includes(label), `missing Arena action: ${label}`);
  }
});


test("Participant selection defaults to Grid + Spotlight and preserves the wheel as a legacy fallback", () => {
  const app = read("components/ArenaApp.tsx");
  const selection = read("components/arena/selection/ParticipantSelectionExperience.tsx");
  const selectorMode = read("components/arena/selection/selector-mode.ts");
  const legacy = read("components/arena/selection/legacy/LegacyWheelSelector.tsx");

  assert.match(app, /ARENA_SELECTOR_MODE/);
  assert.match(selectorMode, /NEXT_PUBLIC_ARENA_SELECTOR_MODE/);
  assert.match(selectorMode, /"grid-spotlight"/);
  assert.match(app, /<ParticipantSelectionExperience/);
  assert.match(app, /<LegacyWheelSelector/);
  assert.match(selection, /Selecionando participante/);
  assert.match(selection, /PARTICIPANTE SELECIONADO/);
  assert.match(legacy, /<DrawWheel/);
});

test("Grid + Spotlight keeps scoring and draw evidence visible without duplicating the selection algorithm", () => {
  const app = read("components/ArenaApp.tsx");
  const selection = read("components/arena/selection/ParticipantSelectionExperience.tsx");
  const orchestration = read("components/arena/selection/useParticipantSelection.ts");

  assert.match(selection, /drawCounts/);
  assert.match(selection, /Continuar para pontuação/);
  assert.match(selection, /Já sorteado/);
  assert.match(app, /Pontuação rápida/);
  assert.match(orchestration, /drawStudent\(sessionId\)/);
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

test("Smart Draw workspace uses a participant Grid, transient Spotlight and contextual history", () => {
  const app = read("components/ArenaApp.tsx");
  const selection = read("components/arena/selection/ParticipantSelectionExperience.tsx");
  const rail = read("components/arena/selection/DrawSessionRail.tsx");

  assert.match(app, /className="smart-draw-workspace"/);
  assert.match(app, /setDrawSettingsOpen\(true\)/);
  assert.match(app, /title="Configurações do Sorteio"/);
  assert.match(app, /POLÍTICAS DO BACKEND/);
  assert.match(selection, /className=\{styles\.grid\}/);
  assert.match(selection, /className=\{styles\.spotlightLayer\}/);
  assert.match(rail, /Últimos sorteados/);
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
  const chrome = read("components/arena/live/ArenaLiveChrome.tsx");

  assert.match(chrome, /export type ArenaDynamic = "runbook" \| "draw"/);
  assert.match(chrome, /export type ArenaTool = "timer" \| "groups" \| "attendance" \| "score" \| null/);
  assert.match(app, /const \[activeDynamic, setActiveDynamic\]/);
  assert.match(app, /const \[activeTool, setActiveTool\]/);
  assert.doesNotMatch(app, /const \[arenaTab, setArenaTab\]/);
});

test("Arena contextual tools open without replacing the primary dynamic", () => {
  const app = read("components/ArenaApp.tsx");
  const chrome = read("components/arena/live/ArenaLiveChrome.tsx");

  assert.match(chrome, /onSelectTool\("timer"\)/);
  assert.match(chrome, /onSelectTool\("groups"\)/);
  assert.match(chrome, /onSelectTool\("attendance"\)/);
  assert.match(chrome, /onSelectTool\("score"\)/);
  assert.match(app, /open=\{activeTool === "timer"\}/);
  assert.match(app, /open=\{activeTool === "attendance"\}/);
});

test("Arena tool drawer is modal, keyboard dismissible, focus-contained and mobile aware", () => {
  const drawer = read("components/ArenaToolDrawer.tsx");
  const css = read("components/ArenaToolDrawer.module.css");

  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /event\.key === "Escape"/);
  assert.match(drawer, /event\.key !== "Tab"/);
  assert.match(drawer, /drawerRef\.current\?\.querySelectorAll<HTMLElement>/);
  assert.match(drawer, /openerRef\.current\?\.focus\(\)/);
  assert.match(drawer, /ref=\{drawerRef\}/);
  assert.match(css, /@media \(max-width: 48rem\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("Buzzer uses the gamified Arena workspace instead of the legacy panel", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="arena-dynamic-workspace buzzer-workspace"/);
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
  assert.match(cloud, /Projetar ↗/);
  assert.match(cloud, /Encerrar rodada/);
  assert.match(cloud, /window\.confirm/);
  assert.match(cloud, /Coleta protegida/);
});


test("Boss Battle 2.0 uses a gamified collective challenge workspace", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="arena-dynamic-workspace boss-workspace"/);
  assert.match(app, /DINÂMICA AO VIVO[\s\S]*?<h2>Boss Battle<\/h2>/);
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

test("Legacy wheel keeps backend authority and only animates presentation", () => {
  const orchestration = read("components/arena/selection/useParticipantSelection.ts");
  const legacy = read("components/arena/selection/legacy/LegacyWheelSelector.tsx");
  const wheel = read("components/arena/draw/DrawWheel.tsx");

  assert.match(orchestration, /const result = await drawStudent\(sessionId\)/);
  assert.match(orchestration, /setSelectedStudentId\(result\.studentId\)/);
  assert.match(legacy, /<DrawWheel/);
  assert.match(wheel, /drawing \? styles\.drawing/);
  assert.doesNotMatch(orchestration, /Math\.random\(\).*student|student.*Math\.random\(\)/);
});

test("Draw settings expose backend policies as information instead of fake controls", () => {
  const app = read("components/ArenaApp.tsx");

  assert.match(app, /MODO ATIVO/);
  assert.match(app, /Balanceado/);
  assert.match(app, /Apenas presentes/);
  assert.match(app, /Evita repetição imediata/);
  assert.doesNotMatch(app, /draw-settings-rule[\s\S]{0,120}<input/);
});


test("Semicircle roulette centers each participant inside an SVG segment", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");

  assert.match(wheel, /const mid = 180 \+ \(slotIndex \+ 0\.5\) \* segmentAngle/);
  assert.match(wheel, /const labelPoint = circularPoint\(LABEL_RADIUS, mid\)/);
  assert.match(wheel, /textAnchor="middle"/);
  assert.match(wheel, /className=\{styles\.name\}/);
});

test("Draw CTA is integrated as a semicircle instead of a detached circular hub", () => {
  const css = read("components/arena/draw/DrawWheel.module.css");

  assert.match(css, /\.commandHub\s*\{/);
  assert.match(css, /border-bottom:\s*0/);
  assert.match(css, /border-radius:\s*18\.5rem 18\.5rem 0 0/);
});

test("Presence drawer uses the dedicated compact SessionAccessCard variant", () => {
  const app = read("components/ArenaApp.tsx");
  const access = read("components/SessionAccessCard.tsx");
  const css = read("components/SessionAccessCard.module.css");

  assert.match(app, /<SessionAccessCard[\s\S]*?compact[\s\S]*?drawer/);
  assert.match(access, /drawer \? styles\.drawer/);
  assert.match(css, /\.drawer \.content/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) 9\.75rem/);
  assert.match(css, /\.drawer \.qr img/);
  assert.match(css, /\.drawer \.refreshButton\s*\{/);
  assert.match(css, /font-size:\s*\.78rem/);
  assert.match(app, /subtitle=""/);
  assert.doesNotMatch(access, /Escaneie para abrir a participação da aula no \/join\./);
});


test("Arena right rail exposes truthful participant status and copyable session code", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /Presente · offline/);
  assert.match(app, /copySessionCode/);
  assert.match(app, /aria-label="Copiar código da sessão"/);
  assert.match(css, /\.arena-session-code-row\s*\{/);
  assert.match(css, /\.arena-status-dot\.present/);
});

test("Arena QR preview expands into a projector-friendly modal", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /setSessionQrOpen\(true\)/);
  assert.match(app, /aria-label="Ampliar QR Code da sessão"/);
  assert.match(app, /className="arena-session-qr-modal"/);
  assert.match(app, /joinQrImageUrl\(currentSession\.id, publicBaseUrl, joinCode\.code, 720\)/);
  assert.match(css, /\.arena-session-qr-modal\s*\{/);
  assert.match(css, /\.arena-session-qr-large\s*\{/);
});

test("Arena large desktop keeps full navigation labels and a wider context rail", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /@media \(min-width: 90\.01rem\)/);
  assert.match(css, /grid-template-columns:\s*13\.25rem minmax\(0, 1fr\) 17rem/);
  assert.match(css, /text-overflow:\s*clip/);
});


test("Semicircle roulette preserves true circular geometry while enlarging both radii", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");

  assert.match(wheel, /const VIEWBOX_WIDTH = 1100/);
  assert.match(wheel, /const VIEWBOX_HEIGHT = 430/);
  assert.match(wheel, /const OUTER_RADIUS = 512/);
  assert.match(wheel, /const INNER_RADIUS = 327/);
  assert.match(wheel, /const LABEL_RADIUS = 420/);
  assert.match(wheel, /function circularPoint\(radius: number, angleDeg: number\)/);
  assert.match(wheel, /A \$\{OUTER_RADIUS\} \$\{OUTER_RADIUS\}/);
  assert.match(wheel, /A \$\{INNER_RADIUS\} \$\{INNER_RADIUS\}/);
  assert.doesNotMatch(wheel, /OUTER_RADIUS_X|OUTER_RADIUS_Y|INNER_RADIUS_X|INNER_RADIUS_Y/);
});

test("Arena responsive polish keeps labels at 1366 and collapses them only near tablet widths", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /@media \(max-width: 90rem\)[\s\S]*?grid-template-columns:\s*10\.5rem minmax\(0, 1fr\) 14\.5rem/);
  assert.match(css, /@media \(max-width: 74rem\)[\s\S]*?grid-template-columns:\s*4\.65rem minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 54rem\)[\s\S]*?\.quick-score-actions/);
});


test("Annular roulette creates real SVG segments with an inner cutout", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");

  assert.match(wheel, /const segmentAngle = 180 \/ segmentCount/);
  assert.match(wheel, /segmentPath\(start, end\)/);
  assert.match(wheel, /const innerEnd = circularPoint\(INNER_RADIUS, endAngle\)/);
  assert.match(wheel, /const innerStart = circularPoint\(INNER_RADIUS, startAngle\)/);
});

test("Draw hero uses an integrated target icon and semicircular command hub", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("components/arena/draw/DrawWheel.module.css");

  assert.match(app, /className="smart-draw-title-icon"/);
  assert.match(css, /\.commandHub\s*\{/);
  assert.match(css, /width:\s*clamp\(14\.5rem, 24%, 18\.5rem\)/);
  assert.match(css, /height:\s*clamp\(7\.25rem, 23%, 9\.25rem\)/);
  assert.match(css, /border-radius:\s*18\.5rem 18\.5rem 0 0/);
});


test("Draw stage expands edge to edge while the SVG owns wheel proportions", () => {
  const arenaCss = read("styles/arena-polish.css");
  const wheelCss = read("components/arena/draw/DrawWheel.module.css");

  assert.match(arenaCss, /\.arena-content-full \.draw-wheel-hero-stage\s*\{/);
  assert.match(arenaCss, /width:\s*calc\(100% \+ 1\.8rem\)/);
  assert.match(arenaCss, /margin-inline:\s*-\.9rem/);
  assert.match(wheelCss, /\.viewport\s*\{/);
  assert.match(wheelCss, /aspect-ratio:\s*1100 \/ 430/);
});

test("DrawWheel derives up to nine visible slots from arc capacity, width and participant count", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");

  assert.match(wheel, /const MIN_VISIBLE_SLOTS = 5/);
  assert.match(wheel, /const MAX_VISIBLE_SLOTS = 9/);
  assert.match(wheel, /const MIN_SLOT_ARC_PX = 150/);
  assert.match(wheel, /const visibleArcPx = Math\.PI \* AVERAGE_RADIUS \* scale/);
  assert.match(wheel, /Math\.floor\(visibleArcPx \/ MIN_SLOT_ARC_PX\)/);
  assert.match(wheel, /const boundedCapacity = Math\.min\(participantCount, MAX_VISIBLE_SLOTS, capacityByArc\)/);
  assert.match(wheel, /boundedCapacity % 2 === 0/);
  assert.match(wheel, /new ResizeObserver/);
  assert.match(wheel, /const visibleSlots = visibleSlotCount\(wheelWidth, participants\.length\)/);
  assert.match(wheel, /const carouselMode = participants\.length > visibleSlots/);
});

test("DrawWheel animates both windowed and fully visible classes through fixed slots", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");

  assert.match(wheel, /const animatedMode = participants\.length > 1/);
  assert.match(wheel, /if \(!animatedMode \|\| !drawing \|\| participants\.length === 0\) return/);
  assert.match(wheel, /const settling = Boolean\(selectedStudentId\)/);
  assert.match(wheel, /Math\.max\(64, 112 - elapsed \* 0\.12\)/);
  assert.match(wheel, /Math\.min\(260, 78 \+ elapsed \* 0\.2\)/);
  assert.match(wheel, /setWindowStart\(\(current\) => wrapIndex\(current \+ 1, participants\.length\)\)/);
  assert.match(wheel, /winnerIndex - centerSlotIndex/);
  assert.match(wheel, /key=\{animatedMode \? `slot-\$\{slotIndex\}` : student\?\.id \?\? `placeholder-\$\{slotIndex\}`\}/);
  assert.match(wheel, /data-mode=\{carouselMode \? "carousel" : animatedMode \? "animated" : "static"\}/);
  assert.match(wheel, /const selected = slotIndex === centerSlotIndex/);
});

test("DrawWheel renders a fixed top marker and removes the carousel information badges", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");
  const css = read("components/arena/draw/DrawWheel.module.css");

  assert.match(wheel, /className=\{styles\.pointer\}/);
  assert.match(wheel, /CENTER_X - 18/);
  assert.match(wheel, /CENTER_X \+ 18/);
  assert.match(css, /\.pointer\s*\{/);
  assert.doesNotMatch(wheel, /className=\{styles\.carouselHint\}/);
  assert.doesNotMatch(wheel, /participantes na rodada/);
  assert.doesNotMatch(css, /\.carouselHint/);
});

test("DrawWheel rotates participant labels toward the radial center with a bounded angle", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");

  assert.match(wheel, /const MAX_LABEL_ROTATION = 20/);
  assert.match(wheel, /const normalized = midAngle - 270/);
  assert.match(wheel, /normalized \* 0\.32/);
  assert.match(wheel, /rotate\(\$\{rotation\.toFixed\(2\)\}\)/);
});

test("Legacy DrawWheel settles the winner in the fixed focus slot after server selection", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");
  const orchestration = read("components/arena/selection/useParticipantSelection.ts");

  assert.match(wheel, /const baseSlotCount = carouselMode \? visibleSlots : Math\.max\(participants\.length, 1\)/);
  assert.match(wheel, /baseSlotCount > 1 && baseSlotCount % 2 === 0/);
  assert.match(wheel, /\? baseSlotCount \+ 1/);
  assert.match(wheel, /const centerSlotIndex = Math\.floor\(renderedSlotCount \/ 2\)/);
  assert.match(wheel, /winnerIndex - centerSlotIndex/);
  assert.match(wheel, /const segmentCount = renderedSlotCount/);
  assert.match(orchestration, /setTimeout\(resolve, 850\)/);
  assert.match(orchestration, /setSelectedStudentId\(result\.studentId\)/);
  assert.match(orchestration, /setTimeout\(resolve, 950\)/);
});

test("DrawWheel uses neutral placeholders after settling instead of duplicating students in even classes", () => {
  const wheel = read("components/arena/draw/DrawWheel.tsx");
  const css = read("components/arena/draw/DrawWheel.module.css");

  assert.match(wheel, /if \(drawing \|\| renderedSlotCount <= participants\.length\) return slots/);
  assert.match(wheel, /const preferredSlotByStudent = new Map<string, number>\(\)/);
  assert.match(wheel, /placeholder: true/);
  assert.match(wheel, /styles\.placeholderSegment/);
  assert.match(wheel, /styles\.placeholderMark/);
  assert.match(css, /\.placeholderSegment \.segmentShape/);
  assert.match(css, /\.placeholderMark/);
});

test("Arena participant rail defaults to present students and exposes an explicit all-students filter", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /useState<"present" \| "all">\("present"\)/);
  assert.match(app, /participantFilter === "present"/);
  assert.match(app, /Presentes <span>\{currentSession\.presentStudentIds\.length\}<\/span>/);
  assert.match(app, /Todos <span>\{sessionParticipants\.length\}<\/span>/);
  assert.match(css, /\.arena-participant-filter\s*\{/);
});

test("Arena tool drawer only closes from a real backdrop click so native selects stay usable", () => {
  const drawer = read("components/ArenaToolDrawer.tsx");

  assert.doesNotMatch(drawer, /onMouseDown=\{onClose\}/);
  assert.match(drawer, /event\.target === event\.currentTarget/);
  assert.match(drawer, /onClick=\{\(event\) =>/);
});

test("Attendance drawer QR reuses the enlarged Arena QR experience", () => {
  const app = read("components/ArenaApp.tsx");
  const access = read("components/SessionAccessCard.tsx");
  const css = read("components/SessionAccessCard.module.css");

  assert.match(access, /onExpandQr\?: \(\) => void/);
  assert.match(access, /className=\{styles\.qrTrigger\}/);
  assert.match(app, /onExpandQr=\{\(\) => setSessionQrOpen\(true\)\}/);
  assert.match(css, /\.qrTrigger\s*\{/);
});

test("Arena native selects keep dark contrast in the cockpit and contextual drawers", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /html\[data-theme="dark"\] \.arena-session-workspace select/);
  assert.match(css, /html\[data-theme="dark"\] \[role="dialog"\] select/);
  assert.match(css, /select option[\s\S]*?background:\s*#0d1915/);
  assert.match(css, /color-scheme:\s*dark/);
});

test("Attendance tool groups online and present counts beside the participant heading", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="arena-tool-roster-badges"/);
  assert.match(app, /className="online">\{sessionParticipants\.filter\(\(participant\) => participant\.connected\)\.length\} online/);
  assert.match(app, /\{currentSession\.presentStudentIds\.length\}\/\{sessionParticipants\.length\} presentes/);
  assert.doesNotMatch(app, /<SessionAccessCard[\s\S]*?realtimeStatus=\{realtimeStatus\}[\s\S]*?title="Entrada dos alunos"/);
  assert.match(css, /\.arena-tool-roster-badges\s*\{/);
});

test("Word cloud, poll, buzzer and boss share the full-height Arena dynamic workspace", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /activeDynamic === "wordcloud"[\s\S]*?className="arena-dynamic-workspace"/);
  assert.match(app, /activeDynamic === "poll"[\s\S]*?className="arena-dynamic-workspace"/);
  assert.match(app, /className="arena-dynamic-workspace buzzer-workspace"/);
  assert.match(app, /className="arena-dynamic-workspace boss-workspace"/);
  assert.match(css, /\.arena-dynamic-workspace\s*\{[\s\S]*?height:\s*100%/);
  assert.match(css, /@media \(max-width: 74rem\)[\s\S]*?\.arena-dynamic-workspace/);
});

test("Arena polish no longer carries the legacy CSS wheel implementation", () => {
  const css = read("styles/arena-polish.css");

  for (const legacy of [
    "draw-wheel-semicircle",
    "draw-wheel-student",
    "draw-wheel-student-face",
    "draw-wheel-ring",
    "draw-wheel-zone",
    "draw-wheel-center",
    "draw-wheel-viewport",
    "selected-coverage",
    "selected-student-tools",
  ]) {
    assert.doesNotMatch(css, new RegExp("\\." + legacy + "(?![A-Za-z0-9_-])"));
  }

  assert.doesNotMatch(css, /(^|[^A-Za-z0-9_-])\.draw-wheel(?![A-Za-z0-9_-])/m);
});

test("Arena exposes explicit empty states for the roster and draw when nobody is present", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /Nenhum aluno presente/);
  assert.match(app, /Marque a presença dos alunos para habilitar o sorteio\./);
  assert.match(app, /className="arena-participant-empty" role="status"/);
  assert.match(app, /Use Presença para incluir alunos na dinâmica\./);
  assert.match(css, /\.arena-participant-empty\s*\{/);
});

test("Prepare-state dynamics share the same header badge and title scale", () => {
  const quiz = read("components/QuizPanel.tsx");
  const poll = read("components/PollPanel.tsx");
  const wordCloud = read("components/WordCloudPanel.tsx");
  const quizCss = read("components/QuizPanel.module.css");
  const pollCss = read("components/PollPanel.module.css");
  const wordCloudCss = read("components/WordCloudPanel.module.css");

  assert.match(quiz, /className=\{styles\.modeBadge\}>PREPARAR/);
  assert.match(poll, /className=\{styles\.modeBadge\}>PREPARAR/);
  assert.match(wordCloud, /className=\{styles\.modeBadge\}>PREPARAR/);
  assert.match(quizCss, /line-height:1\.02/);
  assert.match(pollCss, /line-height:1\.02/);
  assert.match(wordCloudCss, /line-height:1\.02/);
});

test("Arena dynamics use a shared lifecycle vocabulary without erasing domain-specific state", () => {
  const app = read("components/ArenaApp.tsx");
  const quiz = read("components/QuizPanel.tsx");
  const poll = read("components/PollPanel.tsx");
  const wordCloud = read("components/WordCloudPanel.tsx");

  for (const source of [quiz, poll, wordCloud]) {
    assert.match(source, /AO VIVO/);
    assert.match(source, /RESULTADO/);
    assert.match(source, /ENCERRADO/);
  }

  assert.match(app, /buzzerState\.status === "OPEN" \? "● AO VIVO"/);
  assert.match(app, /buzzerState\.status === "CLOSED" \? "ENCERRADO" : "PREPARAR"/);
  assert.match(app, /const bossLifecycle = !currentSession\?\.boss[\s\S]*?"PREPARAR"[\s\S]*?"RESULTADO"[\s\S]*?"AO VIVO"/);
  assert.match(app, /<small>\{bossPhase\}<\/small>/);
  assert.match(app, /DINÂMICA AO VIVO[\s\S]*?<h2>Boss Battle<\/h2>/);
});

test("Quiz workspace fills the Arena cockpit height on desktop and returns to natural flow responsively", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");
  const quizCss = read("components/QuizPanel.module.css");

  assert.match(app, /className="arena-quiz-workspace"/);
  assert.match(css, /\.arena-quiz-workspace\s*\{[\s\S]*?height:\s*100%/);
  assert.match(css, /@media \(max-width: 74rem\)[\s\S]*?\.arena-quiz-workspace/);
  assert.match(quizCss, /\.prepareShell,[\s\S]*?\.liveShell\s*\{[\s\S]*?min-height:\s*100%/);
});

test("Smart Draw folds history and coverage into the single result HUD without layout-shifting history rows", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.doesNotMatch(app, /className="draw-context-strip"/);
  assert.match(app, /className="draw-history-popover draw-history-inline"/);
  assert.match(app, /className="draw-history-menu"/);
  assert.match(app, /className="selected-student-primary"/);
  assert.match(app, /className="draw-coverage-summary"/);
  assert.match(app, /className="draw-coverage-count"/);
  assert.match(app, /className="draw-coverage-badge"/);
  assert.match(app, /className="draw-coverage-ring"/);
  assert.match(app, /const presentStudentIdSet = new Set\(currentSession\?\.presentStudentIds \?\? \[\]\)/);
  assert.match(app, /count > 0 && presentStudentIdSet\.has\(studentId\)/);
  assert.match(app, /<span>\{drawCoverage\}%<\/span>/);
  assert.match(app, /<span className="draw-coverage-badge">já sorteados<\/span>/);
  assert.match(app, /<strong>\{drawnStudentIds\.size\}\/\{currentSession\.presentStudentIds\.length\}<\/strong>/);
  assert.match(css, /\.draw-history-menu\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.draw-coverage-summary\s*\{/);
  assert.match(css, /\.draw-coverage-summary > \.draw-coverage-ring\s*\{[\s\S]*?height:\s*100%/);
});

test("Quick score keeps the selected-student context and presets compact while custom scoring opens on demand", () => {
  const app = read("components/ArenaApp.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /className="quick-score-student"/);
  assert.match(app, /className="sr-only">Aluno para pontuação<\/span>/);
  assert.match(app, /aria-label="Aluno para pontuação"/);
  assert.match(app, /Pontue o aluno selecionado\./);
  assert.match(app, /className="quick-score-presets"/);
  assert.match(app, /quick-score-custom-popover/);
  assert.match(app, /aria-expanded=\{customScoreOpen\}/);
  assert.match(css, /\.quick-score-custom-popover\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /@media \(min-width: 90\.01rem\)[\s\S]*?\.quick-score-dock/);
});

test("Live Arena stretches the cockpit to the full dynamic viewport height", () => {
  const css = read("styles/arena-polish.css");

  assert.match(css, /\.app-shell-no-sidebar \.content\.arena-content-full\s*\{[\s\S]*?height:\s*100dvh/);
  assert.match(css, /\.arena-content-full \.arena-session-workspace\s*\{[\s\S]*?height:\s*100%/);
  assert.match(css, /\.arena-content-full \.arena-cockpit\s*\{[\s\S]*?flex:\s*1 1 auto/);
  assert.match(css, /\.arena-content-full \.arena-participant-list\s*\{[\s\S]*?max-height:\s*none/);
});


test("Live Arena replaces the duplicated root header with one operational topbar", () => {
  const app = read("components/ArenaApp.tsx");
  const chrome = read("components/arena/live/ArenaLiveChrome.tsx");
  const css = read("styles/arena-polish.css");

  assert.match(app, /arena-root-topbar-hidden/);
  assert.match(chrome, /className="topbar app-topbar arena-live-topbar"/);
  assert.match(chrome, /Modo Projetor ↗/);
  assert.match(chrome, /Encerrar sessão/);
  assert.doesNotMatch(app, /arena-desktop-session-header/);
  assert.match(css, /\.topbar\.arena-root-topbar-hidden\s*\{\s*display:\s*none/);
});

test("Arena sidebar owns product identity while the session context stays in the workspace header", () => {
  const app = read("components/ArenaApp.tsx");
  const chrome = read("components/arena/live/ArenaLiveChrome.tsx");

  assert.match(app, /<ArenaLiveShell/);
  assert.match(chrome, /arena-live-shell/);
  assert.match(chrome, /<aside className="arena-cockpit-nav" aria-label="Ferramentas da Arena">/);
  assert.match(chrome, /className="arena-nav-brand"/);
  assert.match(chrome, /className="arena-live-context"/);
  assert.doesNotMatch(chrome, /className="arena-nav-context"/);
  assert.doesNotMatch(chrome, /Condução ao vivo/);
  assert.match(chrome, /function ArenaGlyph/);
  assert.match(chrome, /\["draw", "draw", "Sorteio"\]/);
});
