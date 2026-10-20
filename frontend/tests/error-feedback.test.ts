import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

function insideCatch(node: ts.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isCatchClause(parent)) return true;
    if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent))
      && ts.isCallExpression(parent.parent)
      && ts.isPropertyAccessExpression(parent.parent.expression)
      && parent.parent.expression.name.text === "catch") return true;
    if (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent)) return false;
  }
  return false;
}

test("every notify() from a failure path uses the persistent error tone", () => {
  const untagged: string[] = [];
  for (const file of sourceFiles(join(process.cwd(), "components"))) {
    const text = readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
        && node.expression.text === "notify" && insideCatch(node)) {
        const tone = node.arguments[1];
        if (!tone || !ts.isStringLiteral(tone) || tone.text !== "error") {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart());
          untagged.push(`${file.replace(process.cwd() + "/", "")}:${line + 1}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(untagged, [], "failures must not vanish after 2.5s; pass \"error\"");
});

test("error toasts persist with a dismiss control and an assertive announcement", () => {
  const toast = readFileSync(join(process.cwd(), "components/ui/Toast.tsx"), "utf8");
  assert.match(toast, /if \(!toast \|\| toast\.tone === "error"\) return;/);
  assert.match(toast, /politeness="assertive"/);
  assert.match(toast, /label="Fechar aviso"/);
});
