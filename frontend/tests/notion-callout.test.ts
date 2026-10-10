import assert from "node:assert/strict";
import test from "node:test";
import { splitNotionAsides } from "../lib/notion-callout";

test("Notion asides become semantic, separate Markdown blocks, preserving structure", () => {
  const source = "# Intro\n\n<aside>\n🎯 **Objetivo**\n\n- Item **um**\n- Item dois\n\n## Exemplo\n</aside>\n\n## Próximo";
  assert.deepEqual(splitNotionAsides(source), [
    { kind: "markdown", content: "# Intro" },
    { kind: "aside", content: "🎯 **Objetivo**\n\n- Item **um**\n- Item dois\n\n## Exemplo" },
    { kind: "markdown", content: "## Próximo" },
  ]);
});

test("Notion one-line aside retains Markdown and supports multiple callouts", () => {
  assert.deepEqual(splitNotionAsides("<aside>💡 **Dica**</aside>\n\n<aside>Alerta</aside>"), [
    { kind: "aside", content: "💡 **Dica**" },
    { kind: "aside", content: "Alerta" },
  ]);
});

test("Notion markers inside code fences remain literal", () => {
  const source = "```html\n<aside>example</aside>\n```\n\n<aside>\n```html\n</aside>\n```\nReal content\n</aside>";
  assert.deepEqual(splitNotionAsides(source), [
    { kind: "markdown", content: "```html\n<aside>example</aside>\n```" },
    { kind: "aside", content: "```html\n</aside>\n```\nReal content" },
  ]);
});

test("Unclosed aside is preserved, arbitrary HTML never passed to an HTML parser", () => {
  assert.deepEqual(splitNotionAsides("Before\n<aside>\nMissing close"), [
    { kind: "markdown", content: "Before\n<aside>\nMissing close" },
  ]);
  assert.deepEqual(splitNotionAsides("<script>alert(1)</script>"), [
    { kind: "markdown", content: "<script>alert(1)</script>" },
  ]);
});
