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
  studentCount = 1,
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

  const presentStudentIds: string[] = [];
  for (let index = 0; index < studentCount; index += 1) {
    const studentResponse = await api.post("/api/students", {
      data: {
        registration: `SHELL-${suffix}-${index + 1}`,
        name: `Aluno Shell ${String(index + 1).padStart(2, "0")}`,
        nickname: `Shell ${index + 1}`,
      },
      headers: csrfHeaders,
    });
    await expectOk(studentResponse, `Criação do aluno ${index + 1}`);
    const student = (await studentResponse.json()) as StudentView;
    presentStudentIds.push(student.id);

    const enrollment = await api.post(
      `/api/classrooms/${classroom.id}/students/${student.id}`,
      { headers: csrfHeaders },
    );
    await expectOk(enrollment, `Matrícula ${index + 1}`);
  }

  const sessionResponse = await api.post("/api/sessions", {
    data: {
      classroomId: classroom.id,
      title: sessionTitle,
      presentStudentIds,
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
      const hero = page.locator(".smart-draw-hero");
      const result = page.locator(".selected-student-bar");
      const quickScore = page.locator(".quick-score-dock");
      const sessionCode = page.locator(".arena-session-code-card");
      const professor = page.locator(".arena-nav-professor");

      await expect(sidebar).toBeVisible();
      await expect(workspace).toBeVisible();
      await expect(header).toBeVisible();
      await expect(main).toBeVisible();
      await expect(rail).toBeVisible();
      await expect(hero).toBeVisible();
      await expect(result).toBeVisible();
      await expect(quickScore).toBeVisible();
      await expect(sessionCode).toBeVisible();
      await expect(professor).toBeVisible();

      const [
        sidebarBox,
        workspaceBox,
        headerBox,
        mainBox,
        railBox,
        heroBox,
        resultBox,
        quickScoreBox,
        sessionCodeBox,
        professorBox,
      ] = await Promise.all([
        sidebar.boundingBox(),
        workspace.boundingBox(),
        header.boundingBox(),
        main.boundingBox(),
        rail.boundingBox(),
        hero.boundingBox(),
        result.boundingBox(),
        quickScore.boundingBox(),
        sessionCode.boundingBox(),
        professor.boundingBox(),
      ]);

      expect(sidebarBox).not.toBeNull();
      expect(workspaceBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(railBox).not.toBeNull();
      expect(heroBox).not.toBeNull();
      expect(resultBox).not.toBeNull();
      expect(quickScoreBox).not.toBeNull();
      expect(sessionCodeBox).not.toBeNull();
      expect(professorBox).not.toBeNull();

      if (
        !sidebarBox
        || !workspaceBox
        || !headerBox
        || !mainBox
        || !railBox
        || !heroBox
        || !resultBox
        || !quickScoreBox
        || !sessionCodeBox
        || !professorBox
      ) {
        return;
      }

      expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(workspaceBox.x + 1);
      expect(headerBox.x).toBeGreaterThanOrEqual(workspaceBox.x - 1);
      expect(mainBox.width).toBeGreaterThan(railBox.width);
      expect(heroBox.y + heroBox.height).toBeLessThanOrEqual(mainBox.y + mainBox.height + 1);
      expect(resultBox.y + resultBox.height).toBeLessThanOrEqual(heroBox.y + heroBox.height + 1);
      expect(quickScoreBox.y + quickScoreBox.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(sessionCodeBox.y + sessionCodeBox.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(professorBox.y + professorBox.height).toBeLessThanOrEqual(viewport.height + 1);

      const overflow = await page.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth - window.innerWidth,
        mainVertical: document.querySelector(".arena-cockpit-main")
          ? (document.querySelector(".arena-cockpit-main") as HTMLElement).scrollHeight
            - (document.querySelector(".arena-cockpit-main") as HTMLElement).clientHeight
          : 0,
        railVertical: document.querySelector(".arena-context-rail")
          ? (document.querySelector(".arena-context-rail") as HTMLElement).scrollHeight
            - (document.querySelector(".arena-context-rail") as HTMLElement).clientHeight
          : 0,
      }));
      expect(overflow.horizontal).toBeLessThanOrEqual(1);
      expect(overflow.mainVertical).toBeLessThanOrEqual(1);
      expect(overflow.railVertical).toBeLessThanOrEqual(1);
    } finally {
      await context.close();
      await api.dispose();
    }
  });
}

test("Arena com 22 participantes mantém controles e código visíveis em 1821x831", async ({ browser }) => {
  const viewport = { width: 1821, height: 831 };
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 22);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    const participantRows = page.locator(".arena-participant-row");
    const quickScore = page.locator(".quick-score-dock");
    const sessionCode = page.locator(".arena-session-code-card");

    await expect(participantRows).toHaveCount(12);
    await expect(page.getByRole("button", { name: "Ver todos (22) →" })).toBeVisible();
    await expect(quickScore).toBeVisible();
    await expect(sessionCode).toBeVisible();

    const [quickScoreBox, sessionCodeBox] = await Promise.all([
      quickScore.boundingBox(),
      sessionCode.boundingBox(),
    ]);

    expect(quickScoreBox).not.toBeNull();
    expect(sessionCodeBox).not.toBeNull();

    if (!quickScoreBox || !sessionCodeBox) {
      return;
    }

    expect(quickScoreBox.y + quickScoreBox.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(sessionCodeBox.y + sessionCodeBox.height).toBeLessThanOrEqual(viewport.height + 1);

    const geometry = await page.evaluate(() => {
      const list = document.querySelector(".arena-participant-list") as HTMLElement | null;
      const contextRail = document.querySelector(".arena-context-rail") as HTMLElement | null;
      const main = document.querySelector(".arena-cockpit-main") as HTMLElement | null;
      return {
        listScrolls: Boolean(list && list.scrollHeight > list.clientHeight),
        railOverflow: contextRail ? contextRail.scrollHeight - contextRail.clientHeight : 0,
        mainOverflow: main ? main.scrollHeight - main.clientHeight : 0,
      };
    });

    expect(geometry.listScrolls).toBe(true);
    expect(geometry.railOverflow).toBeLessThanOrEqual(1);
    expect(geometry.mainOverflow).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
    await api.dispose();
  }
});
