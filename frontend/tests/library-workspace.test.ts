import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workspace = readFileSync(resolve(process.cwd(), "components/LibraryWorkspace.tsx"), "utf8");
const journey = readFileSync(resolve(process.cwd(), "components/JourneyManager.tsx"), "utf8");
const api = readFileSync(resolve(process.cwd(), "lib/learning-resource-api.ts"), "utf8");

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
