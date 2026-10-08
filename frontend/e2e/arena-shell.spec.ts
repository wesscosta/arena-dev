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

      const shell = page.locator(".arena-live-shell");
      const sidebar = page.locator("aside.arena-cockpit-nav");
      const workspace = page.locator(".arena-session-workspace");
      const header = page.locator(".arena-live-topbar");
      const main = page.locator(".arena-cockpit-main");
      const rail = page.locator(".arena-context-rail");
      const selectionExperience = page.getByTestId("participant-selection-experience");
      const drawRail = page.getByTestId("draw-session-rail");
      const quickScore = page.locator(".quick-score-dock");
      const sessionCode = page.locator(".arena-session-code-card");
      const professor = page.locator(".arena-nav-professor");

      await expect(shell).toBeVisible();
      await expect(sidebar).toBeVisible();
      await expect(workspace).toBeVisible();
      await expect(page.locator(".arena-nav-professor .topbar-profile-copy")).toBeVisible();
      await expect(header).toBeVisible();
      await expect(main).toBeVisible();
      await expect(rail).toBeVisible();
      await expect(selectionExperience).toBeVisible();
      await expect(drawRail).toBeVisible();
      await expect(quickScore).toBeVisible();
      await expect(sessionCode).toBeVisible();
      await expect(professor).toBeVisible();

      const sidebarChrome = await page.evaluate(() => {
        const scroll = document.querySelector(".arena-nav-scroll") as HTMLElement | null;
        const avatar = document.querySelector(".arena-nav-professor .topbar-profile-avatar") as HTMLElement | null;
        const copy = document.querySelector(".arena-nav-professor .topbar-profile-copy") as HTMLElement | null;
        const chevron = document.querySelector(".arena-nav-professor .topbar-profile-chevron") as HTMLElement | null;
        if (!scroll || !avatar || !copy || !chevron) return null;
        const avatarBox = avatar.getBoundingClientRect();
        const copyBox = copy.getBoundingClientRect();
        const chevronBox = chevron.getBoundingClientRect();
        return {
          scrollbarWidth: getComputedStyle(scroll).scrollbarWidth,
          avatarRight: avatarBox.right,
          copyLeft: copyBox.left,
          copyRight: copyBox.right,
          chevronLeft: chevronBox.left,
        };
      });
      expect(sidebarChrome).not.toBeNull();
      if (sidebarChrome) {
        expect(sidebarChrome.scrollbarWidth).toBe("none");
        expect(sidebarChrome.avatarRight).toBeLessThanOrEqual(sidebarChrome.copyLeft + 1);
        expect(sidebarChrome.copyRight).toBeLessThanOrEqual(sidebarChrome.chevronLeft + 1);
      }

      const [
        shellBox,
        sidebarBox,
        workspaceBox,
        headerBox,
        mainBox,
        railBox,
        selectionBox,
        drawRailBox,
        quickScoreBox,
        sessionCodeBox,
        professorBox,
      ] = await Promise.all([
        shell.boundingBox(),
        sidebar.boundingBox(),
        workspace.boundingBox(),
        header.boundingBox(),
        main.boundingBox(),
        rail.boundingBox(),
        selectionExperience.boundingBox(),
        drawRail.boundingBox(),
        quickScore.boundingBox(),
        sessionCode.boundingBox(),
        professor.boundingBox(),
      ]);

      expect(shellBox).not.toBeNull();
      expect(sidebarBox).not.toBeNull();
      expect(workspaceBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect(railBox).not.toBeNull();
      expect(selectionBox).not.toBeNull();
      expect(drawRailBox).not.toBeNull();
      expect(quickScoreBox).not.toBeNull();
      expect(sessionCodeBox).not.toBeNull();
      expect(professorBox).not.toBeNull();

      if (
        !shellBox
        || !sidebarBox
        || !workspaceBox
        || !headerBox
        || !mainBox
        || !railBox
        || !selectionBox
        || !drawRailBox
        || !quickScoreBox
        || !sessionCodeBox
        || !professorBox
      ) {
        return;
      }

      expect(shellBox.x).toBeLessThanOrEqual(1);
      expect(shellBox.x + shellBox.width).toBeGreaterThanOrEqual(viewport.width - 1);
      expect(sidebarBox.x).toBeLessThanOrEqual(1);
      expect(sidebarBox.width).toBeGreaterThanOrEqual(220);
      expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(workspaceBox.x + 1);
      expect(workspaceBox.x + workspaceBox.width).toBeGreaterThanOrEqual(viewport.width - 1);
      expect(headerBox.x).toBeGreaterThanOrEqual(workspaceBox.x - 1);
      expect(mainBox.width).toBeGreaterThan(railBox.width);
      expect(selectionBox.y + selectionBox.height).toBeLessThanOrEqual(mainBox.y + mainBox.height + 1);
      expect(drawRailBox.y + drawRailBox.height).toBeLessThanOrEqual(railBox.y + railBox.height + 1);
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

test("Roster com um único participante permanece ancorado no topo do rail", async ({ browser }) => {
  const viewport = { width: 1440, height: 900 };
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 1);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    await page.getByRole("button", { name: "Quiz", exact: true }).click();

    const list = page.locator(".arena-participant-list");
    const row = page.locator(".arena-participant-row");
    await expect(list).toBeVisible();
    await expect(row).toHaveCount(1);

    const [listBox, rowBox] = await Promise.all([list.boundingBox(), row.boundingBox()]);
    expect(listBox).not.toBeNull();
    expect(rowBox).not.toBeNull();
    if (!listBox || !rowBox) return;

    expect(rowBox.y).toBeLessThanOrEqual(listBox.y + 8);
    expect(rowBox.height).toBeLessThan(80);
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("Arena com 22 participantes mantém controles e código visíveis em 1821x831", async ({ browser }) => {
  const viewport = { width: 1821, height: 831 };
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 22);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    const participantCards = page.getByTestId("participant-card");
    const drawRail = page.getByTestId("draw-session-rail");
    const quickScore = page.locator(".quick-score-dock");
    const sessionCode = page.locator(".arena-session-code-card");

    await expect(participantCards).toHaveCount(22);
    await expect(drawRail).toBeVisible();
    await expect(page.getByText("22", { exact: true }).first()).toBeVisible();
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
      const gridViewport = document.querySelector('[data-testid="participant-grid-viewport"]') as HTMLElement | null;
      const contextRail = document.querySelector(".arena-context-rail") as HTMLElement | null;
      const main = document.querySelector(".arena-cockpit-main") as HTMLElement | null;
      return {
        gridOverflow: gridViewport ? gridViewport.scrollHeight - gridViewport.clientHeight : 0,
        railOverflow: contextRail ? contextRail.scrollHeight - contextRail.clientHeight : 0,
        mainOverflow: main ? main.scrollHeight - main.clientHeight : 0,
      };
    });

    expect(geometry.gridOverflow).toBeGreaterThanOrEqual(0);
    expect(geometry.railOverflow).toBeLessThanOrEqual(1);
    expect(geometry.mainOverflow).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("Grid + Spotlight revela a seleção e devolve o participante ao grid como já sorteado", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 1);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    const drawButton = page.getByRole("button", { name: "Sortear participante" });
    const participantCard = page.getByTestId("participant-card").first();

    await expect(drawButton).toBeVisible();
    await expect(participantCard).toHaveAttribute("data-status", "available");

    await drawButton.click();

    const spotlight = page.getByTestId("spotlight-reveal");
    await expect(spotlight).toBeVisible();
    await expect(spotlight.getByText("Shell 1", { exact: true })).toBeVisible();
    await expect(participantCard).toHaveAttribute("data-status", "selected");

    await spotlight.getByRole("button", { name: "Confirmar participação", exact: true }).click();

    await expect(spotlight).toBeHidden();
    await expect(participantCard).toHaveAttribute("data-status", "drawn");
    await expect(page.getByTestId("draw-session-rail").getByText("Shell 1", { exact: true })).toBeVisible();
  } finally {
    await context.close();
    await api.dispose();
  }
});


test("Configurações do sorteio alternam Grid e Roleta sem afetar o critério de seleção", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 3);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    await page.getByRole("button", { name: /Ajustes/ }).click();
    const dialog = page.getByRole("dialog", { name: "Configurações do Sorteio" });
    const gridOption = dialog.getByRole("radio", { name: /Grid \+ Spotlight/ });
    const wheelOption = dialog.getByRole("radio", { name: /Roleta/ });

    await expect(gridOption).toBeChecked();
    await expect(dialog.getByText("Balanceado", { exact: true })).toBeVisible();
    const fullRound = dialog.getByRole("radio", { name: /Rodada completa/ });
    await expect(fullRound).toBeChecked();
    await expect(dialog.getByText("REGRAS DA SELEÇÃO", { exact: true })).toBeVisible();

    await dialog.locator("label").filter({ hasText: "Roleta" }).click();
    await expect(wheelOption).toBeChecked();

    const runtimeResponse = await api.get(
      `/api/sessions/${fixture.session.id}/mechanics`,
    );
    await expectOk(runtimeResponse, "Leitura da apresentação persistida");
    const runtime = (await runtimeResponse.json()) as { selectorPresentation: string };
    expect(runtime.selectorPresentation).toBe("WHEEL");

    await dialog.getByRole("button", { name: "Fechar ferramenta" }).click();
    await expect(page.getByText("Sorteio Inteligente", { exact: true })).toBeVisible();
    await expect(page.locator(".arena-participants-card")).toBeVisible();
    await expect(page.getByTestId("participant-selection-experience")).toHaveCount(0);

    await page.getByRole("button", { name: /Ajustes/ }).click();
    const reopenedDialog = page.getByRole("dialog", { name: "Configurações do Sorteio" });
    await reopenedDialog
      .locator("label")
      .filter({ hasText: "Grid + Spotlight" })
      .click();

    await expect(page.getByTestId("participant-selection-experience")).toBeVisible();
    await expect(page.getByTestId("draw-session-rail")).toBeVisible();
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("Grid mantém cards compactos quando há poucos participantes", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 3);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    const cards = page.getByTestId("participant-card");
    await expect(cards).toHaveCount(3);

    const widths = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().width),
    );
    const gridWidth = await page.getByTestId("participant-grid").evaluate(
      (element) => element.getBoundingClientRect().width,
    );

    expect(Math.max(...widths)).toBeLessThanOrEqual(218);
    expect(gridWidth).toBeGreaterThan(Math.max(...widths) * 2);
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("v0.10 sorteio registra confirmação, passagem e anulação sem repetir na rodada", async ({
  browser,
}) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 3);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    const path = `/api/sessions/${fixture.session.id}/draw-attempts/state`;
    const drawButton = page.getByRole("button", { name: "Sortear participante" });
    const spotlight = page.getByTestId("spotlight-reveal");
    const readState = async () => {
      const response = await api.get(path);
      await expectOk(response, "Estado do sorteio");
      return response.json() as Promise<{
        roundNumber: number;
        calledUniqueCount: number;
        confirmedCount: number;
        passedCount: number;
        voidedCount: number;
        canStartNextRound: boolean;
        currentAttempt: { studentId: string } | null;
      }>;
    };

    await drawButton.click();
    await expect(spotlight).toBeVisible();
    const first = (await readState()).currentAttempt?.studentId;
    expect(first).toBeTruthy();
    await expect(drawButton).toBeDisabled();
    await spotlight.getByRole("button", { name: "Confirmar e pontuar" }).click();
    await expect(spotlight).toBeHidden();
    await expect.poll(async () => (await readState()).confirmedCount).toBe(1);

    await drawButton.click();
    await expect(spotlight).toBeVisible();
    const second = (await readState()).currentAttempt?.studentId;
    expect(second).not.toBe(first);
    await spotlight.getByRole("button", { name: "Passar a vez" }).click();
    await expect.poll(async () => (await readState()).passedCount).toBe(1);

    await drawButton.click();
    await expect(spotlight).toBeVisible();
    const third = (await readState()).currentAttempt?.studentId;
    expect(new Set([first, second, third]).size).toBe(3);
    await spotlight.getByRole("button", { name: "Anular sorteio" }).click();
    await expect.poll(async () => (await readState()).voidedCount).toBe(1);
    expect((await readState()).calledUniqueCount).toBe(2);

    await drawButton.click();
    await expect(spotlight).toBeVisible();
    expect((await readState()).currentAttempt?.studentId).toBe(third);
    await spotlight.getByRole("button", { name: "Confirmar participação", exact: true }).click();
    await expect.poll(async () => (await readState()).canStartNextRound).toBe(true);
    await page.getByRole("button", { name: "Iniciar próxima rodada" }).click();
    await expect.poll(async () => (await readState()).roundNumber).toBe(2);
    expect((await readState()).calledUniqueCount).toBe(0);
  } finally {
    await context.close();
    await api.dispose();
  }
});
