import { expect, request, test, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";

type ClassroomView = { id: string; name: string };
type StudentView = { id: string };
type SessionView = { id: string; title: string };

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

async function expectOk(response: APIResponse, operation: string) {
  if (!response.ok()) {
    throw new Error(`${operation} falhou (${response.status()}): ${await response.text()}`);
  }
}

async function authenticatedApi() {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const csrfResponse = await api.get("/api/auth/csrf");
  await expectOk(csrfResponse, "Token CSRF E2E");
  const { token: csrfToken } = (await csrfResponse.json()) as { token: string };
  const csrfHeaders = { "X-XSRF-TOKEN": csrfToken };
  const login = await api.post("/api/auth/login", {
    data: { username: teacherUsername, password: teacherPassword },
    headers: csrfHeaders,
  });
  await expectOk(login, "Login E2E");
  return { api, csrfHeaders };
}

async function createArenaFixture(
  api: APIRequestContext,
  csrfHeaders: Record<string, string>,
) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const classroomName = `Turma Shell ${suffix}`;
  const sessionTitle = `Sessão Shell ${suffix}`;

  const classroomResponse = await api.post("/api/classrooms", {
    data: { name: classroomName, code: null },
    headers: csrfHeaders,
  });
  await expectOk(classroomResponse, "Criação da turma");
  const classroom = (await classroomResponse.json()) as ClassroomView;

  const studentResponse = await api.post("/api/students", {
    data: {
      registration: `SHELL-${suffix}`,
      name: `Aluno Shell ${suffix}`,
      nickname: `Shell-${suffix.slice(-6)}`,
    },
    headers: csrfHeaders,
  });
  await expectOk(studentResponse, "Criação do aluno");
  const student = (await studentResponse.json()) as StudentView;

  const enrollment = await api.post(
    `/api/classrooms/${classroom.id}/students/${student.id}`,
    { headers: csrfHeaders },
  );
  await expectOk(enrollment, "Matrícula");

  const sessionResponse = await api.post("/api/sessions", {
    data: {
      classroomId: classroom.id,
      title: sessionTitle,
      presentStudentIds: [student.id],
    },
    headers: csrfHeaders,
  });
  await expectOk(sessionResponse, "Criação da sessão");
  const session = (await sessionResponse.json()) as SessionView;

  return { classroomName, sessionTitle, session };
}

async function openArena(page: Page, classroomName: string, sessionTitle: string) {
  await page.goto("/");
  await page.getByLabel("Usuário").fill(teacherUsername);
  await page.getByLabel("Senha").fill(teacherPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  const classroomCard = page
    .locator("article.overview-class-card")
    .filter({ hasText: classroomName });
  await expect(classroomCard).toBeVisible();
  await classroomCard.click();
  await page.getByRole("button", { name: "Continuar Arena" }).click();

  await expect(
    page.getByRole("navigation", { name: "Contexto da sessão" })
      .getByText(sessionTitle, { exact: true }),
  ).toBeVisible();
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
]) {
  test(`Arena shell mantém sidebar, palco e rail sem sobreposição em ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    const { api, csrfHeaders } = await authenticatedApi();
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    try {
      const fixture = await createArenaFixture(api, csrfHeaders);
      await openArena(page, fixture.classroomName, fixture.sessionTitle);

      const sidebar = page.locator("aside.arena-cockpit-nav");
      const workspace = page.locator(".arena-session-workspace");
      const header = page.locator(".arena-live-topbar");
      const main = page.locator(".arena-cockpit-main");
      const rail = page.locator(".arena-context-rail");
      const professor = page.locator(".arena-nav-professor");

      await expect(sidebar).toBeVisible();
      await expect(workspace).toBeVisible();
      await expect(header).toBeVisible();
      await expect(main).toBeVisible();
      await expect(rail).toBeVisible();
      await expect(professor).toBeVisible();

      const [sidebarBox, workspaceBox, headerBox, mainBox, railBox, professorBox] =
        await Promise.all([
          sidebar.boundingBox(),
          workspace.boundingBox(),
          header.boundingBox(),
          main.boundingBox(),
          rail.boundingBox(),
          professor.boundingBox(),
        ]);

      expect(sidebarBox).not.toBeNull();
      expect(workspaceBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(railBox).not.toBeNull();
      expect(professorBox).not.toBeNull();

      if (!sidebarBox || !workspaceBox || !headerBox || !mainBox || !railBox || !professorBox) {
        return;
      }

      expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(workspaceBox.x + 1);
      expect(headerBox.x).toBeGreaterThanOrEqual(workspaceBox.x - 1);
      expect(mainBox.width).toBeGreaterThan(railBox.width);
      expect(professorBox.y + professorBox.height).toBeLessThanOrEqual(viewport.height + 1);

      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(horizontalOverflow).toBeLessThanOrEqual(1);
    } finally {
      await context.close();
      await api.dispose();
    }
  });
}
