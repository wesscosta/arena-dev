import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

/**
 * Guard against bypassing the shared renderer as new Notion/AI/Library
 * integrations arrive. Browser E2E separately verifies actual DOM safety.
 */
test("11.4 all content preview surfaces use the same safe Markdown renderer", () => {
  for (const path of [
    "components/LibraryContentViews.tsx",
    "components/study/JourneyContentReader.tsx",
    "components/DraftReviewWorkspace.tsx",
    "components/ProjectedMaterialReader.tsx",
  ]) {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");
    assert.match(source, /<SafeMarkdown\b/, path);
    assert.doesNotMatch(source, /from ["']react-markdown["']/, path);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML|rehypeRaw|srcDoc=/, path);
  }
  const policy = readFileSync(resolve(process.cwd(), "components/SafeMarkdown.tsx"), "utf8");
  assert.match(policy, /skipHtml/);
  assert.match(policy, /img:\s*\(\)\s*=>\s*null/);
  assert.match(policy, /input:\s*\(\)\s*=>\s*null/);
  assert.match(policy, /a:\s*\(\{/);
  assert.doesNotMatch(policy, /rehypeRaw|dangerouslySetInnerHTML/);
});

test("11.4 theme bootstrap is static code, not a Markdown HTML sink", () => {
  const layout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8");
  assert.match(layout, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(layout, /content\.body|markdown|resource\.body/i);
});
