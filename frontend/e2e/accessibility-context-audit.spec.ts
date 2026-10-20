import { expect, test } from "./fixtures";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const axeSource = readFileSync(resolve(process.cwd(), "node_modules/axe-core/axe.min.js"),"utf8");

type AxeFinding = { id: string; impact: string; nodes: Array<{ target: string[]; failureSummary: string }> };

async function audit(page: import("@playwright/test").Page, selector: string) {
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async (target) => {
    const engine = (window as unknown as { axe: { run: (selector: string, options: object) =>
      Promise<{ violations: AxeFinding[] }> } }).axe;
    return engine.run(target, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"] } });
  },selector);
  const findings = results.violations.map((item)=>({
    id:item.id, impact:item.impact, targets:item.nodes.slice(0,3).map((n)=>n.target.join(" ")),
  }));
  console.log(`WCAG AUTOMATED ${selector}: ${JSON.stringify(findings)}`);
  return results.violations;
}

test("login não apresenta achados críticos no axe-core WCAG A/AA", async ({ page }) => {
  const baseURL = process.env.E2E_FRONTEND_URL ?? "http://localhost:3000";
  await page.goto(baseURL);
  await page.getByLabel("Usuário").fill(process.env.E2E_TEACHER_USERNAME ?? "professor");
  await page.getByLabel("Senha").fill(process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  const loginFindings=await audit(page, "body");
  expect(loginFindings.filter((issue)=>issue.impact==="critical")).toEqual([]);
});
