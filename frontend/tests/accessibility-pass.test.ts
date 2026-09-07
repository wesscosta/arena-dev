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
  assert.ok(contrast("#8ea39a", "#0d1714") >= 4.5);
  assert.ok(contrast("#58f3a7", "#0d1714") >= 4.5);
  assert.ok(contrast("#ff6b73", "#0d1714") >= 4.5);
});

test("application exposes skip navigation and main landmark", () => {
  const source = read("components/ArenaApp.tsx");

  assert.match(source, /href="#main-content"/);
  assert.match(source, /id="main-content"/);
  assert.match(source, /<LiveRegion>\{toast\}<\/LiveRegion>/);
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
  assert.match(source, /event\.key === "Tab"/);
  assert.match(source, /previousActive\?\.focus/);
});

test("timer source does not announce per-second updates through aria-live", () => {
  const source = read("components/TimerPanel.tsx");
  assert.equal(source.includes("aria-live"), false);
});
