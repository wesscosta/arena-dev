import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Alternativas das questões (StudentActivitiesPanel): calcula o contraste dos
// pares de tokens usados em cada estado, nos dois temas. Meta WCAG 2.2 AAA:
// texto e letra >= 7:1; borda, marcador, selo de check e foco >= 3:1.

type Rgba = [number, number, number, number];

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const themeCss = read("styles/theme.css");
const panelCss = read("components/StudentActivitiesPanel.module.css");

function themeTokens(selector: string): Map<string, string> {
  const start = themeCss.indexOf(selector);
  assert.ok(start >= 0, `bloco ${selector} existe em theme.css`);
  const body = themeCss.slice(themeCss.indexOf("{", start) + 1, themeCss.indexOf("}", start));
  const tokens = new Map<string, string>();
  for (const match of body.matchAll(/(--theme-[\w-]+):\s*([^;]+);/g)) tokens.set(match[1], match[2].trim());
  return tokens;
}

function parse(value: string): Rgba {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((at) => Number.parseInt(hex[1].slice(at, at + 2), 16)).concat(1) as Rgba;
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1].split(",").map((part) => Number(part.trim()));
    return [r, g, b, a];
  }
  throw new Error(`cor não suportada: ${value}`);
}

function over(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground[3];
  return [0, 1, 2].map((i) => foreground[i] * alpha + background[i] * (1 - alpha)).concat(1) as Rgba;
}

function luminance([r, g, b]: Rgba): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgba, b: Rgba): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const themes = {
  escuro: themeTokens('html[data-theme="dark"] {'),
  claro: themeTokens('html[data-theme="light"] {'),
};

for (const [name, tokens] of Object.entries(themes)) {
  const token = (key: string): Rgba => {
    const value = tokens.get(`--theme-${key}`);
    assert.ok(value, `--theme-${key} definido no tema ${name}`);
    return parse(value);
  };
  // O runner pinta a página com surface-inset; as alternativas usam surface-subtle.
  const page = token("surface-inset");
  const option = over(token("surface-subtle"), page);
  const hover = over(token("surface-hover"), option);
  const selected = over(token("selected-surface"), page);
  const text = token("text-primary");
  const letter = token("accent-text");
  const marker = token("accent-text");
  const markerText = token("accent-text-contrast");
  const border = token("border-control");

  const textPairs: Array<[string, Rgba, Rgba]> = [
    ["texto normal", text, option],
    ["texto em hover e active", text, hover],
    ["texto selecionado", text, selected],
    ["letra normal", letter, option],
    ["letra em hover e active", letter, hover],
    ["letra selecionada sobre o marcador", markerText, marker],
    ["check sobre o selo", markerText, marker],
  ];
  const nonTextPairs: Array<[string, Rgba, Rgba]> = [
    ["borda normal e desabilitada", border, page],
    ["borda do marcador", border, page],
    ["borda em hover, active e selecionado", letter, page],
    ["marcador selecionado", marker, page],
    ["selo de check", marker, page],
    ["contorno de foco", letter, page],
  ];

  test(`alternativas (${name}): texto e letra com contraste >= 7:1`, () => {
    for (const [label, fg, bg] of textPairs) {
      const ratio = contrast(fg, bg);
      assert.ok(ratio >= 7, `${label}: ${ratio.toFixed(2)}:1, mínimo 7:1`);
    }
  });

  test(`alternativas (${name}): elementos não textuais com contraste >= 3:1`, () => {
    for (const [label, fg, bg] of nonTextPairs) {
      const ratio = contrast(fg, bg);
      assert.ok(ratio >= 3, `${label}: ${ratio.toFixed(2)}:1, mínimo 3:1`);
    }
  });
}

test("alternativas: regras usam os tokens medidos e nenhuma cor fixa", () => {
  const rules = [...panelCss.matchAll(/([^{}]*(?:runnerOption|selectedOption)[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length > 0);
  for (const [, selector, body] of rules) {
    assert.doesNotMatch(body, /#[0-9a-f]{3,8}\b|rgba?\(/i, `cor fixa em ${selector.trim()}`);
  }
  assert.match(panelCss, /\.runnerOption\{[^}]*border-color:var\(--ds-border-control\);background:var\(--ds-surface-subtle\);color:var\(--ds-text-primary\)/);
  assert.match(panelCss, /\.runnerOption b\{border:1px solid var\(--ds-border-control\)/);
  assert.match(panelCss, /\.selectedOption,[^{]*\{[^}]*background:var\(--ds-selected-surface\)/);
  assert.match(panelCss, /\.selectedOption::after\{content:"✓"\/""/);
  assert.match(panelCss, /\.runnerOption:has\(input:focus-visible\)\{outline:var\(--focus-width\) solid var\(--ds-accent-text\)/);
});
