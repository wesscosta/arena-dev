import { expect, request, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// v0.11 / 11.7: automated WCAG 2.2 A/AA sweep of the main teacher screens in
// both themes, plus AAA text contrast (color-contrast-enhanced, 7:1). The
// teacher-chosen classroom colours (.classroom-accent-scope) are a documented
// AA-only exception. Automation does not replace the manual VoiceOver gate.
const axeSource = readFileSync(resolve(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8");
const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

type AxeFinding = { id: string; impact: string; nodes: Array<{ target: string[]; any: Array<{ message: string }> }> };

async function audit(page: Page, screen: string) {
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: { run: (context: object, options: object) =>
      Promise<{ violations: AxeFinding[]; incomplete: AxeFinding[] }> } }).axe;
    const aa = await engine.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    const aaa = await engine.run({ include: [["body"]], exclude: [[".classroom-accent-scope"]] },
      { runOnly: { type: "rule", values: ["color-contrast-enhanced"] } });
    // Translucent/gradient backgrounds come back as "incomplete" instead of a
    // violation; log them so they get a manual look (the Arena end-session
    // button failed this way).
    const review = [...aa.incomplete, ...aaa.incomplete]
      .filter((item) => item.id.startsWith("color-contrast"))
      .reduce((total, item) => total + item.nodes.length, 0);
    return { violations: [...aa.violations, ...aaa.violations], review };
  });
  console.log(`WCAG ${screen}: contraste para revisão manual: ${results.review}`);
  const blocking = results.violations.filter((item) =>
    item.id === "color-contrast-enhanced" || item.impact === "serious" || item.impact === "critical");
  const summary = blocking.map((item) => ({ id: item.id, impact: item.impact,
    targets: item.nodes.slice(0, 3).map((node) => `${node.target.join(" ")} — ${node.any[0]?.message ?? ""}`) }));
  console.log(`WCAG ${screen}: ${JSON.stringify(summary)}`);
  return summary;
}

async function createClassroom() {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const { token } = await (await api.get("/api/auth/csrf")).json() as { token: string };
  const headers = { "X-XSRF-TOKEN": token };
  expect((await api.post("/api/auth/login", { data: { username: teacherUsername, password: teacherPassword }, headers })).ok()).toBe(true);
  const name = `Turma WCAG ${Date.now()}`;
  // Amber is the hardest palette entry for contrast in the light theme.
  const classroomResponse = await api.post("/api/classrooms", { data: { name, code: null, themeColor: "amber", themeIcon: "code" }, headers });
  expect(classroomResponse.ok()).toBe(true);
  const classroom = await classroomResponse.json() as { id: string };
  const student = await (await api.post("/api/students", { data: { registration: `WCAG-${Date.now()}`, name: "Aluno WCAG", nickname: "WCAG" }, headers })).json() as { id: string };
  await api.post(`/api/classrooms/${classroom.id}/students/${student.id}`, { headers });
  const session = await api.post("/api/sessions", { data: { classroomId: classroom.id, title: "Sessão WCAG", presentStudentIds: [student.id] }, headers });
  expect(session.ok()).toBe(true);
  await api.dispose();
  return name;
}

for (const theme of ["dark", "light"] as const) {
  test(`telas principais sem violações WCAG A/AA e contraste de texto AAA — tema ${theme}`, async ({ browser }) => {
    test.setTimeout(180_000);
    const classroomName = await createClassroom();
    const context = await browser.newContext();
    await context.addInitScript((value) => localStorage.setItem("arena-dev-theme", value), theme);
    const page = await context.newPage();
    const findings: Record<string, unknown[]> = {};
    const check = async (screen: string) => {
      await page.waitForTimeout(400);
      const result = await audit(page, `${theme}/${screen}`);
      if (result.length) findings[screen] = result;
    };

    await page.goto("/");
    await page.getByLabel("Usuário").fill(teacherUsername);
    await page.getByLabel("Senha").fill(teacherPassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    const card = page.locator("article.overview-class-card").filter({ hasText: classroomName });
    await expect(card).toBeVisible();
    await check("turmas");

    await card.click();
    await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
    await check("turma-inicio");
    for (const tab of ["Alunos", "Atividades", "Jornadas"]) {
      await page.locator(".classroom-section-tab").filter({ hasText: tab }).click();
      await check(`turma-${tab.toLowerCase()}`);
    }
    await page.locator(".classroom-section-tab").filter({ hasText: "Início" }).click();
    await page.getByRole("button", { name: "Gerenciar turma" }).first().click();
    await expect(page.getByRole("button", { name: /Voltar para a turma/ })).toBeVisible();
    await check("gerenciar-turma");

    await page.getByRole("button", { name: /^Biblioteca$/ }).first().click();
    await expect(page.getByRole("heading", { name: "Seus materiais" })).toBeVisible();
    await check("biblioteca");

    await page.getByRole("button", { name: /^Turmas$/ }).first().click();
    await page.locator("article.overview-class-card").filter({ hasText: classroomName }).click();
    await page.getByRole("button", { name: "Continuar Arena" }).click();
    await expect(page.getByRole("navigation", { name: "Turma atual" })).toBeVisible();
    await check("arena-sorteio");
    for (const option of ["Votação", "Presença e acesso"]) {
      await page.locator(".arena-nav-scroll").getByRole("button", { name: option, exact: true }).click();
      await check(`arena-${option.toLowerCase().replace(/\s+/g, "-")}`);
      await page.keyboard.press("Escape");
    }

    await context.close();
    expect(findings).toEqual({});
  });
}
