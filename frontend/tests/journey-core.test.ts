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

test("Journey Core editor keeps ordering and completion rules explicit", () => {
  assert.match(manager, /PREVIOUS_STAGE_COMPLETED/);
  assert.match(manager, /ACTIVITY_SUBMITTED/);
  assert.match(manager, /ACTIVITY_GRADED/);
  assert.match(manager, /moveStage/);
  assert.match(manager, /A primeira etapa fica disponível imediatamente/);
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


test("published journey switches from form controls to a compact read-only representation", () => {
  assert.match(manager, /structuralLocked \? \(/);
  assert.match(manager, /publishedSummary/);
  assert.match(manager, /builderItemReadOnly/);
  assert.match(manager, /completionLabel/);
  assert.match(manager, /unlockLabel/);
});

test("Journey Builder exposes module-based authoring and a student preview", () => {
  const preview = readFileSync(resolve(process.cwd(), "components/JourneyMapPreview.tsx"), "utf8");

  assert.match(manager, /Visualizar como aluno/);
  assert.match(manager, /<JourneyMapPreview/);
  assert.match(manager, /addModule/);
  assert.match(manager, /renameModule/);
  assert.match(manager, /sectionTitle/);
  assert.match(manager, /Conteúdo/);
  assert.match(manager, /Checkpoint/);
  assert.match(preview, /PRÉVIA DA EXPERIÊNCIA DO ALUNO/);
  assert.match(preview, /CAPÍTULO/);
  assert.match(preview, /Comece aqui/);
  assert.match(preview, /Prévia estrutural/);
});


test("new journey onboarding is source-agnostic and review-first", () => {
  const wizard = readFileSync(resolve(process.cwd(), "components/JourneyCreationWizard.tsx"), "utf8");
  const ingestion = readFileSync(resolve(process.cwd(), "lib/content-ingestion-api.ts"), "utf8");

  assert.match(wizard, /Criar com IA/);
  assert.match(wizard, /Usar um modelo/);
  assert.match(wizard, /Importar material/);
  assert.match(wizard, /Começar em branco/);
  assert.match(wizard, /PDF, Word, PowerPoint e texto entram no mesmo fluxo/);
  assert.match(wizard, /Markdown também são aceitos, mas não são exigidos/);
  assert.match(wizard, /Links do Notion são reconhecidos automaticamente/);
  assert.doesNotMatch(wizard, /\["notion", "Notion"\]/);
  assert.match(wizard, /Nada é publicado automaticamente/);
  assert.match(wizard, /handleDrop/);
  assert.match(wizard, /event\.key === "Escape"/);
  assert.match(wizard, /event\.key !== "Tab"/);
  assert.match(wizard, /openerRef\.current\?\.focus\(\)/);
  assert.match(wizard, /patchSection/);
  assert.match(wizard, /patchItem/);
  assert.match(wizard, /addSection/);
  assert.match(wizard, /moveSection/);
  assert.match(wizard, /addItem/);
  assert.match(wizard, /moveItem/);
  assert.match(wizard, /Remover módulo/);
  assert.match(wizard, /Adicionar módulo/);
  assert.match(wizard, /Adicionar item/);
  assert.match(wizard, /<span>Conteúdo<\/span>/);
  assert.doesNotMatch(wizard, /<option value="QUIZ">/);
  assert.doesNotMatch(wizard, /<option value="ACTIVITY">/);
  assert.match(wizard, /Conteúdo e origem/);
  assert.match(wizard, /URL do recurso/);
  assert.match(wizard, /patchItem\(sectionIndex, itemIndex, \{ body:/);
  assert.match(wizard, /patchItem\(sectionIndex, itemIndex, \{ sourceUrl:/);
  assert.match(ingestion, /\/api\/content-ingestion\/preview/);
  assert.match(ingestion, /\/api\/content-ingestion\/file-preview/);
  assert.match(manager, /<JourneyCreationWizard/);
});

test("study journey view uses vertical modules instead of nested cards", () => {
  const studyView = readFileSync(resolve(process.cwd(), "app/learn/journeys/[journeyId]/page.tsx"), "utf8");
  const studyCss = readFileSync(resolve(process.cwd(), "app/learn/study.module.css"), "utf8");
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
