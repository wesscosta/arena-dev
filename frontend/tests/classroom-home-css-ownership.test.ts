import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const globals = read("app/globals.css");
const polish = read("styles/arena-polish.css");
const moduleCss = read("components/ClassroomHome.module.css");
const integrationModuleCss = read("components/ClassroomIntegrationWorkspace.module.css");
const legacySelectors = [
  "classroom-home-hero-v2",
  "classroom-home-watermark",
  "classroom-home-hero-main",
  "classroom-home-hero-cta",
  "classroom-home-legacy-actions",
  "classroom-home-legacy-arena-button",
  "arena-launch-shell",
  "arena-launch-button-centered",
  "arena-launch-button-start",
  "arena-launch-button-resume",
  "arena-launch-button-disabled",
];

test("classroom Home has a single CSS owner", () => {
  for (const selector of legacySelectors) {
    assert.doesNotMatch(globals, new RegExp(selector));
    assert.doesNotMatch(polish, new RegExp(selector));
  }
});
test("classroom Home module owns operational session states and responsive layout", () => {
  assert.match(moduleCss, /\.hero\s*\{/);
  assert.match(moduleCss, /\.sessionPanel\s*\{/);
  assert.match(moduleCss, /\.sessionActionStart\s*\{/);
  assert.match(moduleCss, /\.sessionActionResume\s*\{/);
  assert.match(moduleCss, /\.sessionActionDisabled\s*\{/);
  assert.match(moduleCss, /@media \(max-width: 820px\)/);
  assert.match(moduleCss, /@media \(max-width: 640px\)/);
  assert.doesNotMatch(moduleCss, /!important/);
  assert.doesNotMatch(moduleCss, /:global\(/);
});

test("classroom integration workspace also owns its styles locally", () => {
  assert.doesNotMatch(globals, /classroom-integration-workspace/);
  assert.doesNotMatch(globals, /classroom-integration-(main|title|copy|kpis|actions)/);
  assert.match(integrationModuleCss, /\.workspace\s*\{/);
  assert.match(integrationModuleCss, /\.kpis\s*\{/);
  assert.match(integrationModuleCss, /@media \(max-width: 820px\)/);
  assert.match(integrationModuleCss, /@media \(max-width: 520px\)/);
  assert.doesNotMatch(integrationModuleCss, /!important/);
  assert.doesNotMatch(integrationModuleCss, /:global\(/);
});
