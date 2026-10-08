import { expect, request, test, type APIRequestContext, type APIResponse, type Browser, type Page } from "@playwright/test";

type ClassroomView = { id: string; name: string };
type StudentView = { id: string; name: string; nickname: string | null };
type SessionView = { id: string; title: string };
type JoinCodeView = { code: string };
type ScoreEventView = { id: string; points: number };
type RankingStateView = {
  presentation: { visible: boolean; anonymized: boolean; limit: "TOP_5" | "ALL" };
  entries: Array<{ displayName: string; score: number; position: number }>;
};

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApiBaseUrl = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";
const viewports = [
  { width: 2560, height: 1440 }, { width: 1920, height: 1080 },
  { width: 1440, height: 900 }, { width: 1024, height: 768 },
  { width: 768, height: 1024 }, { width: 390, height: 844 },
];

async function expectOk(response: APIResponse, operation: string) {
  if (!response.ok()) throw new Error(`${operation} falhou (${response.status()}): ${await response.text()}`);
}

async function authenticatedApi() {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const csrfResponse = await api.get("/api/auth/csrf");
  await expectOk(csrfResponse, "Token CSRF");
  const { token } = (await csrfResponse.json()) as { token: string };
  const csrfHeaders = { "X-XSRF-TOKEN": token };
  const login = await api.post("/api/auth/login", {
    headers: csrfHeaders,
    data: { username: teacherUsername, password: teacherPassword },
  });
  await expectOk(login, "Login E2E");
  return { api, csrfHeaders };
}

async function createFixture(api: APIRequestContext, csrfHeaders: Record<string, string>) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  const classroomName = `Ranking E2E ${suffix}`;
  const classroomResponse = await api.post("/api/classrooms", {
    headers: csrfHeaders,
    data: { name: classroomName, code: null },
  });
  await expectOk(classroomResponse, "Criar turma");
  const classroom = (await classroomResponse.json()) as ClassroomView;

  const definitions = [
    ["Ana Ribeiro", "Ana"], ["Bruno Lima", "Bruno"],
    ["Clara Sousa", "Clara"], ["Diego Alves", "Diego"],
  ] as const;
  const students: StudentView[] = [];

  for (const [name, nickname] of definitions) {
    const studentResponse = await api.post("/api/students", {
      headers: csrfHeaders,
      data: { registration: `${nickname.toLowerCase()}-${suffix}`, name, nickname },
    });
    await expectOk(studentResponse, `Criar aluno ${nickname}`);
    const student = (await studentResponse.json()) as StudentView;
    students.push(student);
    const enrollment = await api.post(`/api/classrooms/${classroom.id}/students/${student.id}`, { headers: csrfHeaders });
    await expectOk(enrollment, `Matricular ${nickname}`);
  }

  const sessionResponse = await api.post("/api/sessions", {
    headers: csrfHeaders,
    data: {
      classroomId: classroom.id,
      title: `Aula Ranking ${suffix}`,
      presentStudentIds: students.map((student) => student.id),
    },
  });
  await expectOk(sessionResponse, "Criar sessão");
  const session = (await sessionResponse.json()) as SessionView;
  const joinResponse = await api.get(`/api/sessions/${session.id}/join-code`);
  await expectOk(joinResponse, "Obter código");
  const joinCode = (await joinResponse.json()) as JoinCodeView;

  async function score(student: StudentView, points: number, description: string) {
    const response = await api.post("/api/score-events", {
      headers: csrfHeaders,
      data: {
        classroomId: classroom.id,
        studentId: student.id,
        sessionId: session.id,
        points,
        category: "ADJUSTMENT",
        description,
        source: "MANUAL",
      },
    });
    await expectOk(response, `Pontuar ${student.nickname}`);
    return (await response.json()) as ScoreEventView;
  }

  const anaScore = await score(students[0]!, 100, "Ranking E2E Ana");
  await score(students[1]!, 100, "Ranking E2E Bruno");
  await score(students[2]!, 80, "Ranking E2E Clara");
  return { classroom, classroomName, session, joinCode, students, anaScore, score };
}

async function loginAndOpenArena(page: Page, classroomName: string, sessionTitle: string) {
  const csrfResponse = await page.request.get(`${browserApiBaseUrl}/api/auth/csrf`);
  await expectOk(csrfResponse, "Token CSRF do navegador");
  const { token } = (await csrfResponse.json()) as { token: string };
  const loginResponse = await page.request.post(`${browserApiBaseUrl}/api/auth/login`, {
    headers: { "X-XSRF-TOKEN": token },
    data: { username: teacherUsername, password: teacherPassword },
  });
  await expectOk(loginResponse, "Login do navegador");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible({ timeout: 10_000 });
  const card = page.locator("article.overview-class-card").filter({ hasText: classroomName });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.getByRole("button", { name: new RegExp(`Abrir turma ${classroomName}`) }).click();
  await page.getByRole("button", { name: "Continuar Arena" }).click();
  await expect(page.locator("aside.arena-cockpit-nav")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Contexto da sessão" }).getByText(sessionTitle, { exact: true })).toBeVisible();
}

async function openProjector(browser: Browser, code: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/projector?code=${encodeURIComponent(code)}`);
  await expect(page.getByText("Modo Projetor", { exact: true })).toBeVisible();
  await expect(page.getByText("Sincronizado", { exact: true })).toBeVisible({ timeout: 10_000 });
  return { context, page };
}

test.describe("Arena session ranking", () => {
  let api: APIRequestContext;
  let csrfHeaders: Record<string, string>;
  let fixture: Awaited<ReturnType<typeof createFixture>>;

  test.beforeAll(async () => {
    const authenticated = await authenticatedApi();
    api = authenticated.api;
    csrfHeaders = authenticated.csrfHeaders;
    fixture = await createFixture(api, csrfHeaders);
  });

  test.afterAll(async () => {
    if (fixture?.session?.id) {
      const finish = await api.post(`/api/sessions/${fixture.session.id}/finish`, { headers: csrfHeaders });
      if (!finish.ok() && finish.status() !== 400 && finish.status() !== 404) {
        throw new Error(`Limpeza da sessão falhou: ${await finish.text()}`);
      }
    }
    if (fixture?.classroom?.id) {
      const remove = await api.delete(`/api/classrooms/${fixture.classroom.id}`, {
        headers: csrfHeaders,
        data: { confirmationName: fixture.classroomName },
      });
      if (!remove.ok() && remove.status() !== 404) {
        throw new Error(`Limpeza da turma falhou: ${await remove.text()}`);
      }
    }
    await api?.dispose();
  });

  test("uses session scores, ties, privacy, realtime and restores the underlying projector stage", async ({ browser, page }) => {
    const initialResponse = await api.get(`/api/sessions/${fixture.session.id}/ranking`);
    await expectOk(initialResponse, "Ranking inicial");
    const initial = (await initialResponse.json()) as RankingStateView;
    expect(initial.entries.slice(0, 4).map((entry) => [entry.displayName, entry.score, entry.position])).toEqual([
      ["Ana", 100, 1], ["Bruno", 100, 1], ["Clara", 80, 3], ["Diego", 0, 4],
    ]);

    await loginAndOpenArena(page, fixture.classroomName, fixture.session.title);
    await page.getByRole("button", { name: "Ranking", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ranking da sessão" })).toBeVisible();
    const rankingPanel = page.getByTestId("arena-session-ranking");
    await expect(rankingPanel.getByText("Top 5 da sessão")).toBeVisible();
    await expect(rankingPanel.getByText("Ana Ribeiro")).toBeVisible();
    await expect(rankingPanel.getByText("#1", { exact: true }).first()).toBeVisible();
    await expect(rankingPanel.getByText("#3", { exact: true })).toBeVisible();

    const stageResponse = await api.put(`/api/sessions/${fixture.session.id}/stage`, {
      headers: csrfHeaders,
      data: { type: "DRAW", sourceId: fixture.students[0]!.id, audience: "PROJECTOR", timerOverlay: true },
    });
    await expectOk(stageResponse, "Preparar palco anterior");

    const projector = await openProjector(browser, fixture.joinCode.code);
    try {
      await expect(projector.page.getByTestId("projector-draw-stage")).toBeVisible();
      await expect(projector.page.getByText("Participante selecionado", { exact: true })).toBeVisible();
      await expect(projector.page.getByText("Ana", { exact: true })).toBeVisible();
      await expect(projector.page.getByTestId("projector-session-ranking")).toHaveCount(0);

      await page.getByRole("checkbox", { name: "Ocultar nomes no projetor" }).check();
      await page.getByRole("button", { name: "Exibir no projetor" }).click();

      await expect(projector.page.getByTestId("projector-session-ranking")).toBeVisible();
      await expect(projector.page.getByText("A.", { exact: true })).toBeVisible();
      await expect(projector.page.getByText("B.", { exact: true })).toBeVisible();
      await expect(projector.page.getByText("C.", { exact: true })).toBeVisible();
      await expect(projector.page.getByText("Ana Ribeiro", { exact: true })).toHaveCount(0);

      await projector.page.reload();
      await expect(projector.page.getByTestId("projector-session-ranking")).toBeVisible();
      await expect(projector.page.getByText("A.", { exact: true })).toBeVisible();
      await expect(projector.page.getByText("Sincronizado", { exact: true })).toBeVisible({ timeout: 10_000 });

      await fixture.score(fixture.students[2]!, 40, "Ranking E2E realtime");
      await expect(projector.page.getByText("120 pts", { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(rankingPanel.getByText("120 pts", { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: "Todos", exact: true }).click();
      await expect(rankingPanel.getByText("Diego Alves")).toBeVisible();
      await page.getByRole("button", { name: "Atualizar projetor" }).click();

      await page.getByRole("button", { name: "Ocultar do projetor" }).click();
      await expect(projector.page.getByTestId("projector-session-ranking")).toHaveCount(0);
      await expect(projector.page.getByText("Participante selecionado", { exact: true })).toBeVisible();
      await expect(projector.page.getByText("Ana", { exact: true })).toBeVisible();
      await projector.page.reload();
      await expect(projector.page.getByTestId("projector-draw-stage")).toBeVisible();
      await expect(projector.page.getByText("Participante selecionado", { exact: true })).toBeVisible();
      await expect(projector.page.getByText("Ana", { exact: true })).toBeVisible();

      const reverse = await api.post(`/api/score-events/${fixture.anaScore.id}/reverse`, { headers: csrfHeaders });
      await expectOk(reverse, "Reverter score");
      const anaRow = rankingPanel.locator("li").filter({ hasText: "Ana Ribeiro" });
      await expect(anaRow.getByText("0 pts", { exact: true })).toBeVisible({ timeout: 10_000 });
    } finally {
      await projector.context.close();
    }
  });

  test("ranking drawer remains usable across target breakpoints and both themes", async ({ page }) => {
    await loginAndOpenArena(page, fixture.classroomName, fixture.session.title);
    await page.getByRole("button", { name: "Ranking", exact: true }).click();
    const drawer = page.getByTestId("arena-session-ranking");

    for (const theme of ["dark", "light"] as const) {
      await page.evaluate((nextTheme) => {
        window.localStorage.setItem("arena-dev-theme", nextTheme);
        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.style.colorScheme = nextTheme;
      }, theme);

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await expect(drawer).toBeVisible();
        await expect(page.getByRole("button", { name: "Top 5", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Todos", exact: true })).toBeVisible();

        const overflowState = await page.evaluate(() => ({
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
          offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
            .map((element) => ({
              tag: element.tagName,
              className: element.className,
              left: element.getBoundingClientRect().left,
              right: element.getBoundingClientRect().right,
              width: element.getBoundingClientRect().width,
              scrollWidth: element.scrollWidth,
            }))
            .filter((item) => item.right > window.innerWidth + 1 || item.left < -1 || item.scrollWidth > item.width + 1)
            .slice(0, 20),
        }));
        expect(
          overflowState.overflow,
          `overflow horizontal em ${viewport.width}x${viewport.height} / ${theme}: ${JSON.stringify(overflowState.offenders)}`,
        ).toBeLessThanOrEqual(1);

        const box = await drawer.boundingBox();
        expect(box).not.toBeNull();
        if (box) expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });
});
