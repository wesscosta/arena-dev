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

test("session navigation keeps presence as a contextual Arena tool instead of a top-level tab", () => {
  assert.doesNotMatch(arena, /id:\s*"presence",[\s\S]*?label:\s*"Participantes"/);
  assert.doesNotMatch(arena, /title="Participantes da sessão"/);
  assert.match(arena, /activeTool === "attendance"/);
  assert.match(arena, /title="Presença e acesso"/);
  assert.match(arena, /arena-tool-roster/);
});

test("Boss Battle belongs to the primary Arena dynamics", () => {
  assert.match(arena, /\["boss", "◆", "Boss Battle"\]/);
  assert.match(arena, /activeDynamic === "buzzer"/);
  assert.doesNotMatch(arena, /arenaTab === "boss"/);
  assert.match(arena, /Dano manual nesta versão/);
});

test("status wording uses session terminology", () => {
  assert.doesNotMatch(arena, /AULA EM ANDAMENTO/);
  assert.match(arena, /SESSÃO EM ANDAMENTO/);
  assert.match(cta, /Retomar a sessão atual/);
});
