import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("D12.2 teacher cards use classroom data and functional destinations", () => {
  const source = read("components/ArenaApp.tsx");
  assert.match(source, /className="overview-feature-grid"/);
  assert.match(source, /data\.activities\.filter\(\(item\) => item\.classroomId === resumeClassroom\.id\)/);
  assert.match(source, /onSelectClassroom\(resumeClassroom\.id, "activities"\)/);
  assert.match(source, /onSelectClassroom\(resumeClassroom\.id, "journeys"\)/);
  assert.match(source, /session \? "has-live-session" : ""/);
});

test("D12.2 student pilot displays completion, not inferred mastery or XP", () => {
  const source = read("app/learn/page.tsx");
  assert.match(source, /current\.progress\.completedContents/);
  assert.match(source, /current\.progress\.totalContents/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuenow=\{current\.progress\.percent\}/);
  assert.match(source, /liveSessions\.length > 0/);
  assert.doesNotMatch(source, /\bXP\b|\bmasteryPercent\b/);
});

test("D12.2 arena scope does not recolor projector or change session mechanics", () => {
  const css = read("styles/v012-pilots.css");
  const chrome = read("components/arena/live/ArenaLiveChrome.tsx");
  assert.match(css, /\.arena-live-shell\s*\{/);
  assert.doesNotMatch(css, /\.projector-view|\.projector-root/);
  assert.match(chrome, /Sessão ao vivo/);
  assert.match(chrome, /onToggleProjector/);
  assert.match(chrome, /onEndSession/);
});

test("D12.2 uses a single scoped product stylesheet and responsive/reduced-motion support", () => {
  const layout = read("app/layout.tsx");
  const style = read("styles/v012-pilots.css");
  const study = read("components/study/study.module.css");
  assert.match(layout, /v012-pilots\.css/);
  assert.match(style, /overview-feature-grid/);
  assert.match(style, /@media\(max-width:40rem\)/);
  assert.match(style, /prefers-reduced-motion:reduce/);
  assert.match(study, /learningFeatureGrid/);
});
