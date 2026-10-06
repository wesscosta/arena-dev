import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspace = readFileSync(resolve(process.cwd(), "components/LibraryWorkspace.tsx"), "utf8");
const importPanel = readFileSync(resolve(process.cwd(), "components/LibraryImportPanel.tsx"), "utf8");
const projections = readFileSync(resolve(process.cwd(), "components/LibraryContentViews.tsx"), "utf8");
const journey = readFileSync(resolve(process.cwd(), "components/JourneyManager.tsx"), "utf8");
const api = readFileSync(resolve(process.cwd(), "lib/learning-resource-api.ts"), "utf8");
const ingestionApi = readFileSync(resolve(process.cwd(), "lib/library-ingestion-api.ts"), "utf8");

test("library workspace exposes editorial CRUD, search and archive lifecycle", () => {
  assert.match(workspace, /Seus materiais/);
  assert.match(workspace, /Buscar materiais/);
  assert.match(workspace, /Novo material/);
  assert.match(workspace, /Arquivados/);
  assert.match(workspace, /Restaurar/);
  assert.match(api, /\/archive/);
  assert.match(api, /\/restore/);
});

test("library reuses one snapshot path in both directions", () => {
  assert.match(workspace, /Adicionar a uma Jornada/);
  assert.match(workspace, /updateJourney/);
  assert.match(journey, /fetchContentLibrary/);
  assert.match(journey, /learningResourceId: resource\.id/);
  assert.match(journey, /snapshot será criado ao salvar a Jornada/);
});


test("semantic library exposes metadata, deterministic ingestion and derived content projections", () => {
  assert.match(workspace, /Assunto/);
  assert.match(workspace, /Idioma/);
  assert.match(workspace, /Visualizações do material/);
  assert.match(workspace, /Leitura/);
  assert.match(workspace, /Estrutura/);
  assert.match(workspace, /Mapa/);
  assert.match(importPanel, /Analisar material/);
  assert.match(importPanel, /Conteúdo canônico/);
  assert.match(importPanel, /processado deterministicamente/);
  assert.match(projections, /Mapa do conteúdo/);
  assert.match(projections, /Não representa Mastery/);
  assert.match(ingestionApi, /\/api\/library\/ingestion\/preview/);
  assert.match(ingestionApi, /\/api\/library\/ingestion\/materialize/);
});

test("library discovery combines subject, tag and language without introducing KnowledgeNode", () => {
  assert.match(api, /subject\?: string/);
  assert.match(api, /tag\?: string/);
  assert.match(api, /language\?: string/);
  assert.match(api, /fetchLibraryFacets/);
  assert.match(workspace, /Limpar filtros/);
  assert.doesNotMatch(workspace, /KnowledgeNode/);
});

test("revision awareness keeps journey refresh explicit", () => {
  assert.match(workspace, /Snapshots só mudam quando o professor solicita explicitamente/);
  assert.match(workspace, /Atualizar snapshot/);
  assert.match(journey, /learningResourceId: resource\.id/);
  assert.match(api, /fetchLibraryResourceUsage/);
});
