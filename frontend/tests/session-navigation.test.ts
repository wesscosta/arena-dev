import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arena = readFileSync(resolve(process.cwd(), "components/ArenaApp.tsx"), "utf8");
const cta = readFileSync(resolve(process.cwd(), "lib/classroom-arena-cta.ts"), "utf8");

test("home does not expose a quick end-session overflow action", () => {
  assert.doesNotMatch(arena, /arena-launch-overflow/);
  assert.doesNotMatch(arena, /quickFinishSession/);
});

test("ending a session requires explicit confirmation inside Arena", () => {
  assert.match(arena, /window\.confirm/);
  assert.match(arena, /Encerrar a sessão/);
  assert.match(arena, /Histórico, XP e atividades permanecem salvos/);
});

test("session navigation uses Participantes instead of Presença as top-level tool", () => {
  assert.match(arena, /id:\s*"presence",[\s\S]*?label:\s*"Participantes"/);
  assert.match(arena, /title="Participantes da sessão"/);
});

test("Boss Battle belongs to Dinâmicas instead of a top-level session tab", () => {
  assert.match(arena, /setInteractionTool\("boss"\)/);
  assert.doesNotMatch(arena, /arenaTab === "boss"/);
  assert.match(arena, /Dano manual nesta versão/);
});

test("status wording uses session terminology", () => {
  assert.doesNotMatch(arena, /AULA EM ANDAMENTO/);
  assert.match(arena, /SESSÃO EM ANDAMENTO/);
  assert.match(cta, /Retomar a sessão atual/);
});
