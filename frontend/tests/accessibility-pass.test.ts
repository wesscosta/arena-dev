import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16) / 255
  );

  const linear = channels.map((channel) =>
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

test("core Arena palette preserves strong text contrast on surfaces", () => {
  assert.ok(contrast("#f3f7f5", "#0d1714") >= 4.5);
  assert.ok(contrast("#a3b7ae", "#0d1714") >= 7);
  assert.ok(contrast("#58f3a7", "#0d1714") >= 4.5);
  assert.ok(contrast("#ff6b73", "#0d1714") >= 4.5);
});

test("v0.11 text tokens reach AAA (7:1) on the worst measured surfaces", () => {
  // Raised/tinted surfaces reported by axe in both themes.
  for (const [text, surfaces] of [
    ["#a3b7ae", ["#0d1714", "#111e1a", "#171b18", "#1b1f11"]],
    ["#99ada4", ["#0d1714", "#111e1a", "#171b18", "#1b1f11"]],
    ["#3a4a43", ["#ffffff", "#ebf9f3", "#eff0e2", "#e3f4ec"]],
    ["#3f5048", ["#ffffff", "#ebf9f3", "#eff0e2", "#e3f4ec"]],
    ["#085236", ["#ffffff", "#ebf9f3", "#eff0e2", "#e3f4ec"]],
    ["#8c2a33", ["#ffffff", "#fff9f9"]],
    ["#6b4705", ["#ffffff", "#fefcf7"]],
  ] as const) {
    for (const surface of surfaces) assert.ok(contrast(text, surface) >= 7, `${text} on ${surface}`);
  }
});

test("application exposes skip navigation and main landmark", () => {
  const source = read("components/ArenaApp.tsx");

  assert.match(source, /href="#main-content"/);
  assert.match(source, /id="main-content"/);
  assert.match(source, /<Toast toast=\{toast\} onDismiss=\{dismissToast\} \/>/);
});

test("menu supports directional keyboard navigation and focus return", () => {
  const source = read("components/ui/Menu.tsx");

  assert.match(source, /ArrowDown/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /Home/);
  assert.match(source, /End/);
  assert.match(source, /Escape/);
  assert.match(source, /triggerRef\.current\?\.focus/);
});

test("external result dialog traps focus and restores the opener", () => {
  const source = read("components/ExternalResultImportModal.tsx");

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /dialogRef/);
  assert.match(source, /event\.key (?:===|!==) "Tab"/);
  assert.match(source, /previousActive\?\.focus/);
});

test("timer source does not announce per-second updates through aria-live", () => {
  const source = read("components/TimerPanel.tsx");
  assert.equal(source.includes("aria-live"), false);
});


test("participant Spotlight manages focus and exposes its result to assistive technology", () => {
  const source = read("components/arena/selection/ParticipantSelectionExperience.tsx");

  assert.match(source, /spotlightRef\.current\?\.focus/);
  // rc.7: focus returns once the draw command is enabled, not in a single frame.
  assert.match(source, /focusReturnPendingRef/);
  assert.match(source, /button\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /aria-labelledby="spotlight-participant-name"/);
  assert.match(source, /aria-describedby="spotlight-participant-guidance"/);
  assert.match(source, /aria-live="assertive"/);
  assert.match(source, /aria-busy=\{phase === "selecting"\}/);
});

test("projector announces a neutral draw result without exposing teacher-only controls", () => {
  const source = read("components/ProjectorView.tsx");

  assert.match(source, /data-testid="projector-draw-stage"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Participante selecionado/);
  assert.doesNotMatch(source, /Confirmar participação/);
  assert.doesNotMatch(source, /Confirmar e pontuar/);
});
