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

/** The source of one top-level component, up to the next top-level function in the joined source. */
export function componentBlock(source: string, name: string): string {
  const start = source.search(new RegExp(`^(export )?function ${name}\\b`, "m"));
  if (start < 0) return "";
  const rest = source.slice(start + 1);
  const next = rest.search(/^(export )?(default )?function /m);
  return next < 0 ? source.slice(start) : source.slice(start, start + 1 + next);
}
