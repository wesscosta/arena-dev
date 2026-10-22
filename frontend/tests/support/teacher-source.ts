import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * The teacher app's source as one text: ArenaApp.tsx plus everything moved out
 * of it into components/teacher/. Text-based tests read this instead of
 * ArenaApp.tsx alone, so moving a component to its own file does not break them.
 */
export function readTeacherAppSource(): string {
  const root = process.cwd();
  const teacherDir = resolve(root, "components/teacher");
  if (!existsSync(teacherDir)) return readFileSync(resolve(root, "components/ArenaApp.tsx"), "utf8");
  const extracted = readdirSync(teacherDir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"))
    .sort()
    .map((file) => readFileSync(join(teacherDir, file), "utf8"));
  return [readFileSync(resolve(root, "components/ArenaApp.tsx"), "utf8"), ...extracted].join("\n");
}
