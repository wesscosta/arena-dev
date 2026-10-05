import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

test("Timer drawer uses one configuration surface without redundant headings", () => {
  const app = read("components/ArenaApp.tsx");
  const panel = read("components/TimerPanel.tsx");
  const css = read("styles/timer-panel.css");
  const layout = read("app/layout.tsx");

  assert.match(app, /open=\{activeTool === "timer"\}[\s\S]*size="wide"/);
  assert.match(panel, /timer-config-card/);
  assert.match(panel, /Tempo da atividade/);
  assert.doesNotMatch(panel, /NOVO TEMPORIZADOR/);
  assert.doesNotMatch(panel, /Configuração do timer/);
  assert.match(panel, /Conteúdo/);
  assert.match(panel, /Exibição/);
  assert.match(panel, /Alertas locais/);
  assert.match(panel, /timer-actions-block/);
  assert.doesNotMatch(panel, />Ações</);
  assert.doesNotMatch(panel, /Identifique o objetivo do timer/);
  assert.doesNotMatch(panel, /<details className="timer-settings-panel">/);
  assert.doesNotMatch(panel, />Configurar</);
  assert.match(css, /\.timer-config-card[\s\S]*border:\s*1px solid var\(--ds-border\)/);
  assert.match(css, /\.timer-config-section[\s\S]*border-top:\s*1px solid var\(--ds-border-subtle\)/);
  assert.match(css, /\.timer-duration-editor[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.timer-preset-chips[\s\S]*repeat\(8, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(css, /\.timer-preset-chips[\s\S]{0,260}overflow-x:\s*auto/);
  assert.match(css, /\.timer-config-preferences[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(layout, /import "\.\.\/styles\/timer-panel\.css"/);
});

test("Timer layout no longer depends on the legacy inline simplification overrides", () => {
  const globals = read("app/globals.css");
  const css = read("styles/timer-panel.css");

  assert.doesNotMatch(globals, /14\.11C — Timer simplification/);
  assert.doesNotMatch(css, /!important/);
});
