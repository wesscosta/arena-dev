import { expect, request, test, type Page } from "./fixtures";
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
  const registration = `WCAG-${Date.now()}`;
  const student = await (await api.post("/api/students", { data: { registration, name: "Aluno WCAG", nickname: "WCAG" }, headers })).json() as { id: string };
  await api.post(`/api/classrooms/${classroom.id}/students/${student.id}`, { headers });
  const session = await api.post("/api/sessions", { data: { classroomId: classroom.id, title: "Sessão WCAG", presentStudentIds: [student.id] }, headers });
  expect(session.ok()).toBe(true);
  const { id: sessionId } = await session.json() as { id: string };
  const joinCode = await (await api.get(`/api/sessions/${sessionId}/join-code`)).json() as { code: string };
  await api.dispose();
  return { name, registration, code: joinCode.code };
}

// rc.7: a Journey whose content has text, inline code and a code block, so the
// student reader is swept in both themes (it was never covered before).
async function createJourneyWithCode() {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const { token } = await (await api.get("/api/auth/csrf")).json() as { token: string };
  const headers = { "X-XSRF-TOKEN": token };
  expect((await api.post("/api/auth/login", { data: { username: teacherUsername, password: teacherPassword }, headers })).ok()).toBe(true);
  const classroom = await (await api.post("/api/classrooms", { data: { name: `Turma Leitor ${Date.now()}`, code: null }, headers })).json() as { id: string };
  const body = "# Verificar ambiente\n\nExecute no terminal e confira as versões com `--version`:\n\n```bash\npython --version\ngit --version\n```\n\n> Se necessário, use `python3`.";
  const material = await api.post("/api/library/resources", { data: {
    title: "Verificar ambiente", body, format: "MARKDOWN", sourceType: "MANUAL", language: "pt-BR" }, headers });
  expect(material.ok()).toBe(true);
  const { id: resourceId } = await material.json() as { id: string };
  const second = await api.post("/api/library/resources", { data: {
    title: "Configurar o editor", body: "Instale a extensão de Python no editor.", format: "MARKDOWN", sourceType: "MANUAL", language: "pt-BR" }, headers });
  expect(second.ok()).toBe(true);
  const { id: secondResourceId } = await second.json() as { id: string };
  const journey = await api.post("/api/journeys", { data: { classroomId: classroom.id, title: "Jornada WCAG", stages: [{
    title: "Etapa 01. Verificar ambiente", unlockRule: "IMMEDIATE", completionRule: "MANUAL", sectionTitle: "Pré-requisitos",
    itemType: "CONTENT", learningResourceId: resourceId }, {
    title: "Etapa 02. Configurar o editor", unlockRule: "IMMEDIATE", completionRule: "MANUAL", sectionTitle: "Pré-requisitos",
    itemType: "CONTENT", learningResourceId: secondResourceId }] }, headers });
  expect(journey.ok()).toBe(true);
  const created = await journey.json() as { id: string; stages: Array<{ id: string }> };
  await api.dispose();
  return { journeyId: created.id, contentId: created.stages[0].id, nextContentId: created.stages[1].id };
}

for (const theme of ["dark", "light"] as const) {
  test(`telas principais sem violações WCAG A/AA e contraste de texto AAA — tema ${theme}`, async ({ browser }) => {
    test.setTimeout(180_000);
    const { name: classroomName } = await createClassroom();
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
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    await check("login");
    await page.getByLabel("Usuário").fill(teacherUsername);
    await page.getByLabel("Senha").fill(teacherPassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    const card = page.locator("article.overview-class-card").filter({ hasText: classroomName });
    await expect(card).toBeVisible();
    await check("turmas");
    await page.getByRole("button", { name: "Abrir menu do professor" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await check("menu-professor");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "+ Nova turma" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await check("modal-nova-turma");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

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
    await page.getByRole("button", { name: "Abrir menu do professor" }).click();
    await page.getByRole("menuitem", { name: /Configurações/ }).click();
    await expect(page.getByRole("heading", { name: "Professor e sistema" })).toBeVisible();
    await check("configuracoes");

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

  // v0.11.0-rc.3: student entry, student live session and projector.
  test(`telas do aluno e do projetor sem violações WCAG A/AA e contraste de texto AAA — tema ${theme}`, async ({ browser }) => {
    test.setTimeout(120_000);
    const { name: classroomName, registration, code } = await createClassroom();
    const findings: Record<string, unknown[]> = {};
    const open = async () => {
      const context = await browser.newContext();
      await context.addInitScript((value) => localStorage.setItem("arena-dev-theme", value), theme);
      return { context, page: await context.newPage() };
    };
    const check = async (page: Page, screen: string) => {
      await page.waitForTimeout(400);
      const result = await audit(page, `${theme}/${screen}`);
      if (result.length) findings[screen] = result;
    };

    const student = await open();
    await student.page.goto(`/join?code=${encodeURIComponent(code)}`);
    await expect(student.page.getByText(classroomName, { exact: true })).toBeVisible();
    await check(student.page, "aluno-entrada");
    await student.page.getByPlaceholder("Matrícula ou nome").fill("ninguem-com-este-nome");
    await student.page.getByRole("button", { name: "Entrar na sessão" }).click();
    await expect(student.page.getByRole("alert").filter({ hasText: "Não encontramos você nesta turma" })).toBeVisible();
    await check(student.page, "aluno-entrada-erro");
    await student.page.getByPlaceholder("Matrícula ou nome").fill(registration);
    await student.page.getByRole("button", { name: "Entrar na sessão" }).click();
    await expect(student.page.getByText("Conectado", { exact: true })).toBeVisible();
    await check(student.page, "aluno-sessao");
    await student.context.close();

    const projector = await open();
    await projector.page.goto(`/projector?code=${encodeURIComponent(code)}`);
    await expect(projector.page.getByText("Sincronizado", { exact: true })).toBeVisible({ timeout: 10_000 });
    // rc.5: students scan the footer QR instead of typing the address.
    const qr = projector.page.getByAltText(`QR Code para entrar na sessão ${code}`);
    await expect(qr).toBeVisible();
    await expect.poll(() => qr.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBeGreaterThan(0);
    await check(projector.page, "projetor");
    await projector.context.close();

    expect(findings).toEqual({});
  });

  test(`área de estudos e leitor de conteúdo sem violações WCAG A/AA e contraste AAA — tema ${theme}`, async ({ browser }) => {
    test.setTimeout(120_000);
    const { journeyId, contentId } = await createJourneyWithCode();
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
    await expect(page.getByRole("button", { name: "Abrir menu do professor" })).toBeVisible();

    await page.goto(`/learn/journeys/${journeyId}?preview=teacher`);
    await expect(page.getByText("Prévia do professor")).toBeVisible();
    await check("jornada-previa");
    await page.goto(`/learn/journeys/${journeyId}/content/${contentId}?preview=teacher`);
    const codeBlock = page.locator("pre").first();
    await expect(codeBlock).toContainText("python --version");
    await check("leitor-conteudo");
    await context.close();

    expect(findings).toEqual({});
  });
}

// rc.7: the preview bar spans the reading column and "Editar jornada" opens
// that Journey in its classroom instead of the start screen.
test("prévia do professor ocupa a coluna, setas navegam e Editar jornada abre a Jornada certa", async ({ browser }) => {
  const { journeyId, contentId, nextContentId } = await createJourneyWithCode();
  const context = await browser.newContext({ viewport: { width: 1920, height: 900 } });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByLabel("Usuário").fill(teacherUsername);
  await page.getByLabel("Senha").fill(teacherPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abrir menu do professor" })).toBeVisible();

  await page.goto(`/learn/journeys/${journeyId}/content/${contentId}?preview=teacher`);
  const bar = page.getByText("Prévia do professor").locator("xpath=ancestor::div[1]");
  await expect(bar).toBeVisible();
  const footer = page.locator("footer").last();
  const [barBox, footerBox] = await Promise.all([bar.boundingBox(), footer.boundingBox()]);
  expect(barBox && footerBox && Math.abs(barBox.width - footerBox.width) <= 2).toBe(true);
  // A short content keeps the navigation at the foot of the study area, not right under the text.
  const viewportHeight = page.viewportSize()!.height;
  expect(footerBox && footerBox.y + footerBox.height > viewportHeight - 140).toBe(true);
  await expect(page.getByText("Conteúdo de estudo", { exact: true })).toHaveCount(0);

  // Arrow keys walk the Journey like the footer links.
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Conteúdo 1 de 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(new RegExp(`/content/${nextContentId}\\?preview=teacher`));
  await expect(page.getByRole("heading", { level: 1, name: "Configurar o editor" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(new RegExp(`/content/${contentId}\\?preview=teacher`));
  await expect(page.getByText("Conteúdo 1 de 2")).toBeVisible();

  await page.getByRole("link", { name: "Editar jornada" }).click();
  await expect(page.getByRole("textbox", { name: "Título", exact: true })).toHaveValue("Jornada WCAG");
  await expect(page).not.toHaveURL(/journey=/);
  await context.close();
});
