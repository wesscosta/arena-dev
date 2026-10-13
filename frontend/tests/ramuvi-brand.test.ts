import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const theme = read("styles/theme.css");
const tokens = read("styles/tokens.css");
const brand = read("styles/ramuvi-brand.css");
const app = read("components/ArenaApp.tsx");
const manifest = read("app/manifest.ts");

function luminance(hex: string) {
  const channels = hex.replace("#", "").match(/.{2}/g);
  assert.ok(channels, "Expected #RRGGBB");
  const values = channels.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}
test("Ramuvi semantic themes meet AAA for core text and actions", () => {
  const combinations = [
    ["#f7f9ff", "#0c1831"],
    ["#c3d0e5", "#0c1831"],
    ["#b5c4de", "#0c1831"],
    ["#0c1831", "#8cb7ff"],
    ["#152544", "#ffffff"],
    ["#40516c", "#ffffff"],
    ["#455473", "#f4f6fa"],
    ["#ffffff", "#075f60"],
  ];
  for (const [foreground, background] of combinations) {
    assert.ok(contrast(foreground, background) >= 7,
      `AAA contrast insufficient: ${foreground} over ${background}`);
  }
  assert.match(theme, /--brand-navy:\s*#142b60/);
  assert.match(theme, /--brand-petrol:\s*#075f60/);
  assert.match(theme, /--brand-gold:\s*#d4a74b/);
});

test("new Ramuvi font and accessible brand layer are wired", () => {
  assert.match(tokens, /--font-family-sans:\s*"Manrope"/);
  assert.match(brand, /prefers-reduced-motion:\s*reduce/);
  assert.match(read("app/layout.tsx"), /ramuvi-brand\.css/);
  assert.ok(existsSync(resolve(process.cwd(), "public/fonts/Manrope-Variable.woff2")));
  assert.ok(existsSync(resolve(process.cwd(), "public/fonts/OFL-Manrope.txt")));
});

test("existing docente dashboard offers a grounded resume action", () => {
  assert.match(app, /const resumeClassroom =/);
  assert.match(app, /onSelectClassroom\(resumeClassroom\.id\)/);
  assert.match(app, /overview-resume-heading/);
  assert.match(app, /<strong>ramuvi<\/strong>/);
});

test("PWA declares the Ramuvi brand and available icon assets", () => {
  assert.match(manifest, /name:\s*"Ramuvi"/);
  for (const size of [192, 512]) {
    assert.ok(existsSync(resolve(process.cwd(), `public/icons/ramuvi-${size}.png`)));
  }
});
