import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
const manager = readFileSync(resolve(process.cwd(), "components/JourneyManager.tsx"), "utf8");
const api = readFileSync(resolve(process.cwd(), "lib/journey-api.ts"), "utf8");

test("classroom workspace exposes Journey Core as its own tab", () => {
  assert.match(app, /"journeys"/);
  assert.match(app, /label: "Jornadas"/);
  assert.match(app, /<JourneyManager/);
});

test("Journey Builder encapsulates sequential progression defaults", () => {
  assert.match(manager, /PREVIOUS_STAGE_COMPLETED/);
  assert.match(manager, /completionRule: "MANUAL"/);
  assert.match(manager, /itemType: "CONTENT"/);
  assert.match(manager, /moveStageTo/);
  assert.doesNotMatch(manager, /ACTIVITY_SUBMITTED/);
  assert.doesNotMatch(manager, /ACTIVITY_GRADED/);
});

test("published journey structure is protected in the teacher editor", () => {
  assert.match(manager, /const structuralLocked = draft\?\.status !== "DRAFT"/);
  assert.match(manager, /Estrutura protegida após publicação/);
  assert.match(manager, /publishJourney/);
  assert.match(manager, /archiveJourney/);
});

test("journey API exposes draft authoring and lifecycle endpoints", () => {
  assert.match(api, /\/api\/journeys\?classroomId=/);
  assert.match(api, /\/publish/);
  assert.match(api, /\/archive/);
  assert.match(api, /JourneyCompletionRule/);
});


test("published journey switches from authoring to a compact read-only structure", () => {
  assert.match(manager, /structuralLocked \? \(/);
  assert.match(manager, /publishedSummary/);
  assert.match(manager, /builderItemReadOnly/);
  assert.match(manager, /Ver jornada/);
});

test("Journey Builder exposes only module and content authoring", () => {
  assert.match(manager, /addModule/);
  assert.match(manager, /renameModule/);
  assert.match(manager, /sectionTitle/);
  assert.match(manager, /Adicionar conteúdo/);
  assert.match(manager, /itemType: "CONTENT"/);
  assert.match(manager, /completionRule: "MANUAL"/);
  assert.doesNotMatch(manager, /Visualizar como aluno/);
  assert.doesNotMatch(manager, /JourneyMapPreview/);
  assert.doesNotMatch(manager, /Atividade vinculada/);
  assert.doesNotMatch(manager, /Critério de conclusão/);
  assert.doesNotMatch(manager, /Regras e vínculo/);
  assert.doesNotMatch(manager, /Checkpoint/);
});


test("new journey onboarding is source-agnostic and review-first", () => {
  const wizard = readFileSync(resolve(process.cwd(), "components/JourneyCreationWizard.tsx"), "utf8");
  const ingestion = readFileSync(resolve(process.cwd(), "lib/content-ingestion-api.ts"), "utf8");

  assert.match(wizard, /Criar com IA/);
  assert.match(wizard, /Usar um modelo/);
  assert.match(wizard, /Importar material/);
  assert.match(wizard, /Começar em branco/);
  assert.match(wizard, /PDF, Word e PowerPoint podem ser analisados/);
  assert.match(wizard, /Arquivos Markdown preservam a hierarquia declarada sem depender de IA/);
  assert.match(wizard, /H1 define o título · H2 vira módulo · H3 vira conteúdo · H4–H6 permanecem dentro do conteúdo/);
  assert.match(wizard, /Links do Notion são reconhecidos automaticamente/);
  assert.match(wizard, /["notion", "Notion"]/);
  assert.match(wizard, /Conecte seu Notion para importar páginas/);
  assert.match(wizard, /Importar página/);
  assert.match(wizard, /DraftReviewWorkspace/);
  assert.match(wizard, /handleDrop/);
  assert.match(wizard, /event\.key === "Escape"/);
  assert.match(wizard, /event\.key !== "Tab"/);
  assert.match(wizard, /openerRef\.current\?\.focus\(\)/);
  assert.match(wizard, /DraftReviewWorkspace/);
  assert.doesNotMatch(wizard, /<option value="QUIZ">/);
  assert.doesNotMatch(wizard, /<option value="ACTIVITY">/);
  assert.match(ingestion, /\/api\/content-ingestion\/preview/);
  assert.match(ingestion, /\/api\/content-ingestion\/file-preview/);
  assert.match(manager, /<JourneyCreationWizard/);
});

test("16.3.8.4 reviews large drafts through master-detail navigation", () => {
  const review = readFileSync(resolve(process.cwd(), "components/DraftReviewWorkspace.tsx"), "utf8");
  assert.match(review, /validateContentDraft/);
  assert.match(review, /Buscar módulo ou conteúdo/);
  assert.match(review, /Com atenção/);
  assert.match(review, /EMPTY_CONTENT_TITLE/);
  assert.match(review, /DUPLICATE_TITLE/);
  assert.match(review, /LONG_CONTENT/);
  assert.match(review, /ReactMarkdown/);
  assert.match(review, /Visualizar/);
  assert.match(review, /Adicionar módulo/);
  assert.match(review, /Adicionar conteúdo/);
  assert.match(review, /Usar esta estrutura/);
  assert.match(review, /confirm\(/);
});

test("16.3.7B converges the study shell and learning hierarchy with the product reference", () => {
  const shell = readFileSync(resolve(process.cwd(), "components/study/StudyShell.tsx"), "utf8");
  const studyCss = readFileSync(resolve(process.cwd(), "components/study/study.module.css"), "utf8");
  const reader = readFileSync(resolve(process.cwd(), "app/learn/journeys/[journeyId]/content/[contentId]/page.tsx"), "utf8");

  assert.match(shell, /studySidebar/);
  assert.match(shell, /ARENA DEV/);
  assert.match(shell, /ESTUDOS/);
  assert.match(studyCss, /16\.3\.7B — Study experience visual convergence/);
  assert.match(studyCss, /studyModule:not\(:last-child\)>\.studyModuleIndex:after/);
  assert.match(studyCss, /border-left:2px solid var\(--study-accent\)/);
  assert.match(reader, /JourneyContentReader/);
  assert.doesNotMatch(shell, /JourneyMapPreview/);
});

test("study journey view uses vertical modules instead of nested cards", () => {
  const studyView = readFileSync(resolve(process.cwd(), "app/learn/journeys/[journeyId]/page.tsx"), "utf8");
  const studyCss = readFileSync(resolve(process.cwd(), "components/study/study.module.css"), "utf8");
  assert.match(studyView, /studyModule/);
  assert.match(studyView, /studyContentRow/);
  assert.match(studyView, /Conclua o conteúdo anterior para avançar/);
  assert.match(studyView, /Continuar/);
  assert.match(studyCss, /Journey Study View — structural hierarchy, not nested cards/);
  assert.doesNotMatch(studyView, /className=\{styles\.hero\}/);
  assert.doesNotMatch(studyView, /className=\{styles\.card\}/);
});

test("content reader supports study formats and explicit completion", () => {
  const page = readFileSync(resolve(process.cwd(), "app/learn/journeys/[journeyId]/content/[contentId]/page.tsx"), "utf8");
  const reader = readFileSync(resolve(process.cwd(), "components/study/JourneyContentReader.tsx"), "utf8");
  assert.match(page, /startStudyContent/);
  assert.match(page, /completeStudyContent/);
  assert.match(page, /Concluir e continuar/);
  assert.match(reader, /ReactMarkdown/);
  assert.match(reader, /remarkGfm/);
  assert.match(reader, /noopener noreferrer/);
  assert.match(reader, /PLAIN_TEXT/);
});

test("study home resumes the persisted current content directly", () => {
  const home = readFileSync(resolve(process.cwd(), "app/learn/page.tsx"), "utf8");
  const api = readFileSync(resolve(process.cwd(), "lib/study-api.ts"), "utf8");
  assert.match(home, /journey\.started && journey\.progress\.percent < 100/);
  assert.match(home, /current\.currentContentId/);
  assert.match(home, /Começar/);
  assert.match(home, /Continuar/);
  assert.match(api, /lastStudiedAt/);
});

test("teacher preview reuses study routes without student progress actions", () => {
  const journey = readFileSync(resolve(process.cwd(), "app/learn/journeys/[journeyId]/page.tsx"), "utf8");
  const reader = readFileSync(resolve(process.cwd(), "app/learn/journeys/[journeyId]/content/[contentId]/page.tsx"), "utf8");
  const manager = readFileSync(resolve(process.cwd(), "components/JourneyManager.tsx"), "utf8");
  assert.match(journey, /preview.*teacher/);
  assert.match(journey, /fetchTeacherStudyPreview/);
  assert.match(journey, /Editar jornada/);
  assert.match(reader, /fetchTeacherContentPreview/);
  assert.match(reader, /teacherPreview \?/);
  assert.match(manager, /Ver jornada/);
  assert.match(manager, /preview=teacher/);
});
