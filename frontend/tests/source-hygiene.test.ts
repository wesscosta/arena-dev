import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// rc.4 audit: an escaped "\${" inside a template literal renders the
// expression as text (the Achievements progress bar and aria-label broke).
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

test("rc.4 no escaped template expressions in app, components or lib", () => {
  const offenders = ["app", "components", "lib"]
    .flatMap((dir) => sources(join(process.cwd(), dir)))
    .filter((file) => readFileSync(file, "utf8").includes("\\${"));
  assert.deepEqual(offenders, []);
});
