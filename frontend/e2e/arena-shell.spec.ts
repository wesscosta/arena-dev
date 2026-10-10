import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  return { classroomName, sessionTitle, classroomId: classroom.id, studentIds: presentStudentIds, session };
}

async function openArena(page: Page, classroomName: string, _sessionTitle: string) {
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
    page.getByRole("navigation", { name: "Turma atual" })
      .getByRole("button", { name: `Voltar para a turma ${classroomName}` }),
  ).toBeVisible();
}

async function openMobileArenaMenuIfNeeded(page: Page) {
  const trigger = page.getByRole("button", { name: "Abrir menu da Arena" });
  if (await trigger.isVisible() && await trigger.getAttribute("aria-expanded") !== "true") {
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Menu da Arena" })).toBeVisible();
  }
}

async function selectArenaNavigation(page: Page, label: string) {
  await openMobileArenaMenuIfNeeded(page);
  await page.locator(".arena-nav-scroll").getByRole("button", { name: label, exact: true }).click();
}

async function openArenaMaterial(page: Page) {
  await openMobileArenaMenuIfNeeded(page);
  await page.getByRole("button", { name: /Selecionar material|Abrir material/ }).click();
}

async function openArenaEvidence(page: Page) {
  await openMobileArenaMenuIfNeeded(page);
  await page.getByRole("button", { name: "Evidências da aprendizagem" }).click();
}

test("XP manual: POST idempotente sob resposta perdida, conflito em payload alterado", async () => {
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    const key = crypto.randomUUID();
    const command = {
      classroomId: fixture.classroomId,
      studentId: fixture.studentIds[0],
      sessionId: fixture.session.id,
      points: 10,
      category: "BONUS",
      description: "Participação em aula",
      source: "ARENA",
      requestId: key,
    };
    const first = await api.post("/api/score-events", { data: command, headers: csrfHeaders });
    await expectOk(first, "XP manual inicial");
    const firstEvent = await first.json() as { id: string };
    // Simulate the teacher not receiving/using the first response: replay exact command UUID.
    const repeated = await api.post("/api/score-events", { data: command, headers: csrfHeaders });
    await expectOk(repeated, "Retomada do XP manual");
    expect((await repeated.json() as { id: string }).id).toBe(firstEvent.id);
    const conflict = await api.post("/api/score-events", { data: { ...command, points: 20 }, headers: csrfHeaders });
    expect(conflict.status()).toBe(409);
    const events = await api.get(`/api/score-events?classroomId=${fixture.classroomId}`);
    await expectOk(events, "Histórico idempotente");
    const ledger = await events.json() as { id: string; points: number }[];
    expect(ledger.filter((event) => event.id === firstEvent.id)).toHaveLength(1);
    expect(ledger.reduce((sum, event) => sum + event.points, 0)).toBe(10);
  } finally {
    await api.dispose();
  }
});

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
      await expect(page.locator(".quick-score-dock")).toHaveCount(0);
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
    const sessionCode = page.locator(".arena-session-code-card");

    await expect(participantCards).toHaveCount(22);
    await expect(drawRail).toBeVisible();
    await expect(page.getByText("22", { exact: true }).first()).toBeVisible();
    // Manual XP remains accessible via the Arena's persistent tool navigation.
    const manualXpTool = page.locator('.arena-nav-scroll').getByRole('button', { name: 'Pontuação rápida' });
    await expect(manualXpTool).toBeVisible();
    await expect(page.locator(".quick-score-dock")).toHaveCount(0);
    await manualXpTool.click();
    const xpDrawer = page.locator('.arena-tool-score');
    await expect(xpDrawer).toBeVisible();
    const xpStudent = xpDrawer.getByRole('combobox');
    await xpStudent.selectOption({ index: 1 });
    const manualPoints = xpDrawer.getByRole('spinbutton', { name: 'Quantidade de XP (diferente de zero)' });
    const applyXp = xpDrawer.getByRole('button', { name: 'Aplicar', exact: true });
    await manualPoints.fill('0');
    await expect(applyXp).toBeDisabled();
    await manualPoints.fill('1.5');
    await expect(applyXp).toBeDisabled();
    await manualPoints.fill('10');
    await expect(applyXp).toBeEnabled();
    // The tool remains separate from the draw outcome; no score is sent in this layout test.
    await page.keyboard.press('Escape');
    await expect(xpDrawer).toBeHidden();
    await expect(sessionCode).toBeVisible();

    const sessionCodeBox = await sessionCode.boundingBox();
    expect(sessionCodeBox).not.toBeNull();
    if (!sessionCodeBox) return;
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

    await spotlight.getByRole("button", { name: "Confirmar sem XP", exact: true }).click();

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
    await spotlight.getByRole("checkbox", { name: /Conceder XP/ }).check();
    await spotlight.getByRole("button", { name: "Confirmar +5 XP" }).click();
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
    await spotlight.getByRole("button", { name: "Confirmar sem XP", exact: true }).click();
    await expect.poll(async () => (await readState()).canStartNextRound).toBe(true);
    await page.getByRole("button", { name: "Iniciar próxima rodada" }).click();
    await expect.poll(async () => (await readState()).roundNumber).toBe(2);
    expect((await readState()).calledUniqueCount).toBe(0);
  } finally {
    await context.close();
    await api.dispose();
  }
});


test("Spotlight move o foco para o resultado e devolve ao comando após resolver", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 2);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    const drawButton = page.getByRole("button", { name: "Sortear participante" });
    await drawButton.focus();
    await expect(drawButton).toBeFocused();
    await page.keyboard.press("Enter");

    const spotlightCard = page.getByTestId("spotlight-card");
    await expect(spotlightCard).toBeVisible();
    await expect(spotlightCard).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("spotlight-reveal").getByRole("checkbox", { name: /Conceder XP/ })).toBeFocused();
    await page.keyboard.press("Tab");
    const confirm = page.getByTestId("spotlight-reveal")
      .getByRole("button", { name: "Confirmar sem XP", exact: true });
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("spotlight-reveal")).toBeHidden();
    await expect(drawButton).toBeFocused();
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("Selector permanece operável em viewport estreita equivalente a zoom alto", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 8);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await page.setViewportSize({ width: 720, height: 900 });

    const drawButton = page.getByRole("button", { name: "Sortear participante" });
    const settingsButton = page.getByRole("button", { name: /Ajustes/ });

    await expect(drawButton).toBeVisible();
    await expect(settingsButton).toBeVisible();
    expect(await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )).toBeLessThanOrEqual(1);

    await settingsButton.click();
    const dialog = page.getByRole("dialog", { name: "Configurações do Sorteio" });
    await expect(dialog.getByRole("radio", { name: /Grid \+ Spotlight/ })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: /Roleta/ })).toBeVisible();

    const minTargetHeight = await dialog.getByRole("radio", { name: /Grid \+ Spotlight/ })
      .evaluate((input) => input.closest("label")?.getBoundingClientRect().height ?? 0);
    expect(minTargetHeight).toBeGreaterThanOrEqual(44);

    expect(await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    )).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("reverter XP de sorteio mantém participação e histórico sem duplicar ledger após F5", async ({ page }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    const sessionId = fixture.session.id;
    const selected = await api.post(`/api/sessions/${sessionId}/draw-attempts`, {
      data: { requestId: crypto.randomUUID() }, headers: csrfHeaders,
    });
    await expectOk(selected, "Sorteio selecionado");
    const attempt = (await selected.json()) as { attemptId: string };
    const resolved = await api.post(`/api/sessions/${sessionId}/draw-attempts/${attempt.attemptId}/resolve`, {
      data: { requestId: crypto.randomUUID(), outcome: "CONFIRMED",
        score: { points: 5, category: "COLLABORATION", reason: "Participação" } },
      headers: csrfHeaders,
    });
    await expectOk(resolved, "Confirmação com XP");
    const awarded = (await resolved.json()) as { scoreEventId: string };
    expect(awarded.scoreEventId).toBeTruthy();
    const correctionId = crypto.randomUUID();
    const correctionPath = `/api/score-events/${awarded.scoreEventId}/reverse`;
    const first = await api.post(correctionPath, { data: { requestId: correctionId }, headers: csrfHeaders });
    await expectOk(first, "Reversão auditável");
    const retry = await api.post(correctionPath, { data: { requestId: correctionId }, headers: csrfHeaders });
    await expectOk(retry, "Retry idempotente");
    expect(await retry.json()).toEqual(await first.json());
    const conflict = await api.post(correctionPath, {
      data: { requestId: crypto.randomUUID() }, headers: csrfHeaders,
    });
    expect(conflict.status()).toBe(409);
    const drawState = await api.get(`/api/sessions/${sessionId}/draw-attempts/state`);
    await expectOk(drawState, "Histórico do sorteio");
    const state = (await drawState.json()) as { history: Array<{
      attemptId: string; status: string; scoreReversed: boolean;
    }> };
    expect(state.history).toContainEqual(expect.objectContaining({
      attemptId: attempt.attemptId, status: "CONFIRMED", scoreReversed: true,
    }));
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await page.reload();
    // After F5 the app returns to the class overview; opening the same Arena must
    // rehydrate the authoritative draw/score state rather than resurrect local state.
    await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();
    await page.locator("article.overview-class-card")
      .filter({ hasText: fixture.classroomName }).click();
    await page.getByRole("button", { name: "Continuar Arena" }).click();
    await expect(page.getByRole("navigation", { name: "Turma atual" })
      .getByRole("button", { name: `Voltar para a turma ${fixture.classroomName}` })).toBeVisible();
    const persisted = await api.get(`/api/sessions/${sessionId}/draw-attempts/state`);
    await expectOk(persisted, "Histórico após F5");
    expect((await persisted.json()) as { history: Array<{ scoreReversed: boolean }> })
      .toMatchObject({ history: [{ scoreReversed: true }] });
  } finally {
    await api.dispose();
  }
});

test("Biblioteca contextual mantém a mesma referência na Arena e retorna ao palco após F5", async ({ page }) => {
  test.setTimeout(85_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    const title = `WHERE - contexto ${fixture.session.id.slice(0,8)}`;
    const created = await api.post("/api/library/resources", {
      data: { title, summary: "Cláusula de filtragem", body: "# WHERE\nCritérios em SQL.",
        format: "MARKDOWN", sourceType: "MANUAL", subject: "Banco de Dados", tags: ["SQL"], language: "pt-BR" },
      headers: csrfHeaders,
    });
    await expectOk(created, "Material da Biblioteca");
    const resource = (await created.json()) as { id: string; revision: number };
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    const open = page.getByRole("button", { name: "Selecionar material" });
    await expect(open).toBeVisible();
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Biblioteca nesta aula" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Encontrar material na Biblioteca").fill(title);
    await dialog.getByRole("button", { name: new RegExp(title) }).click();
    await expect(dialog.getByRole("heading", { name: title })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "WHERE", exact: true })).toBeVisible();
    await page.addScriptTag({ content: readFileSync(resolve(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8") });
    const accessibility = await page.evaluate(async () => {
      const runner = (window as unknown as { axe: { run: (selector: string, options: object) => Promise<{
        violations: Array<{ id: string; impact: string; nodes: Array<{ target: string[] }> }>
      }> } }).axe;
      const result = await runner.run('[role="dialog"][aria-label], [role="dialog"][aria-labelledby]', {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      });
      return result.violations.map((violation) => ({
        id: violation.id, impact: violation.impact,
        targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
      }));
    });
    console.log("A11Y_CONTEXT_MATERIAL", JSON.stringify(accessibility));
    expect(accessibility.filter((violation) => ["critical", "serious"].includes(violation.impact))).toEqual([]);
    // The contextual panel must also retain its accessible dialog semantics in light mode.
    await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
    const lightIssues = await page.evaluate(async () => {
      const runner = (window as unknown as { axe: { run: (selector: string, options: object) => Promise<{
        violations: Array<{ id: string; impact: string }>
      }> } }).axe;
      const result = await runner.run('[role="dialog"]', {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact }));
    });
    console.log("A11Y_CONTEXT_MATERIAL_LIGHT", JSON.stringify(lightIssues));
    expect(lightIssues.filter((issue) => ["critical", "serious"].includes(issue.impact))).toEqual([]);
    await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    await expect(page.getByRole("button", { name: "Abrir material" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    if (await page.getByRole("button", { name: "Abrir menu da Arena" }).isVisible()) {
      await expect(page.getByRole("button", { name: "Abrir menu da Arena" })).toBeFocused();
    } else {
      await expect(page.getByRole("button", { name: "Abrir material" })).toBeFocused();
    }
    await expect(page.getByTestId("participant-selection-experience")).toBeVisible();

    const linked = await api.get(`/api/sessions/${fixture.session.id}/contextual-material`);
    await expectOk(linked, "Vínculo persistido");
    expect(await linked.json()).toMatchObject({ resourceId: resource.id, revision: resource.revision, available: true });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();
    await page.locator("article.overview-class-card")
      .filter({ hasText: fixture.classroomName }).click();
    await page.getByRole("button", { name: "Continuar Arena" }).click();
    await expect(page.getByRole("button", { name: "Abrir material" })).toBeVisible();
    await openArenaMaterial(page);
    await expect(page.getByRole("dialog", { name: "Biblioteca nesta aula" })
      .getByRole("heading", { name: title })).toBeVisible();
    // No duplication of material body. The same canonical resource also remains usable by a Journey.
    const canonical = await api.get(`/api/library/resources/${resource.id}`);
    await expectOk(canonical, "Material canônico preservado");
    expect((await canonical.json()) as { body: string }).toMatchObject({ body: "# WHERE\nCritérios em SQL." });
    await dialog.getByRole("button", { name: "Desvincular desta aula" }).click();
    await expect(dialog.getByText("Selecione um material publicado.", { exact: false })).toBeVisible();
    const absent = await api.get(`/api/sessions/${fixture.session.id}/contextual-material`);
    await expectOk(absent, "Desvinculação");
    expect(await absent.text()).toBe("");
  } finally { await api.dispose(); }
});

test("Material é um modal centralizado no viewport real, sem corte em desktop, mobile ou zoom", async ({ page }) => {
  test.setTimeout(90_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    const materialTitle = `Leitura responsiva ${fixture.session.id.slice(0,8)}`;
    const created = await api.post("/api/library/resources", {
      data: {
        title: materialTitle,
        subject: "Banco de Dados",
        summary: "Material extenso para testar rolagem e foco",
        format: "MARKDOWN", sourceType: "MANUAL", language: "pt-BR", tags: ["SQL"],
        body: `# Material da aula\n${Array.from({ length: 70 }, (_, i) => `## Seção ${i + 1}\nExemplo de consulta SQL e revisão.`).join("\n")}`,
      },
      headers: csrfHeaders,
    });
    await expectOk(created, "Material extenso do teste de viewport");
    await page.setViewportSize({ width: 1792, height: 854 });
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await openArenaMaterial(page);
    const dialog = page.getByRole("dialog", { name: "Biblioteca nesta aula" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Encontrar material na Biblioteca").fill(materialTitle);
    await dialog.getByRole("button", { name: new RegExp(materialTitle) }).click();
    await expect(dialog.getByRole("heading", { name: materialTitle })).toBeVisible();

    for (const viewport of [
      { width: 1792, height: 854 }, // screenshot's approximate desktop size
      { width: 1366, height: 768 },
      { width: 1024, height: 600 },
      { width: 800, height: 450 },  // constrained height / browser zoom
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 320, height: 400 }, // 400% zoom / very short browser viewport
      { width: 320, height: 320 }, // compact viewport ensures footer remains reachable
    ]) {
      await page.setViewportSize(viewport);
      const geometry = await dialog.evaluate((element) => {
        const modal = element.getBoundingClientRect();
        const backdrop = element.parentElement?.getBoundingClientRect();
        const innerWidth = document.documentElement.clientWidth;
        const innerHeight = window.innerHeight;
        return {
          bodyPortal: element.parentElement?.parentElement === document.body,
          backdrop: backdrop && { x: backdrop.x, y: backdrop.y,
            width: backdrop.width, height: backdrop.height },
          modal: { left: modal.left, top: modal.top, right: modal.right,
            bottom: modal.bottom, centerX: modal.left + modal.width / 2,
            centerY: modal.top + modal.height / 2 },
          innerWidth, innerHeight,
        };
      });
      expect(geometry.bodyPortal, `Deve sair da árvore recortada do cabeçalho: ${JSON.stringify(viewport)}`).toBe(true);
      expect(geometry.backdrop?.x).toBeCloseTo(0, 0);
      expect(geometry.backdrop?.y).toBeCloseTo(0, 0);
      expect(geometry.backdrop?.width).toBeCloseTo(geometry.innerWidth, 0);
      expect(geometry.backdrop?.height).toBeCloseTo(geometry.innerHeight, 0);
      expect(geometry.modal.top, `Topo cortado em ${JSON.stringify(viewport)}`).toBeGreaterThanOrEqual(0);
      expect(geometry.modal.left, `Lateral cortada em ${JSON.stringify(viewport)}`).toBeGreaterThanOrEqual(0);
      expect(geometry.modal.right, `Lateral cortada em ${JSON.stringify(viewport)}`).toBeLessThanOrEqual(geometry.innerWidth + 1);
      expect(geometry.modal.bottom, `Rodapé cortado em ${JSON.stringify(viewport)}`).toBeLessThanOrEqual(geometry.innerHeight + 1);
      expect(Math.abs(geometry.modal.centerX - geometry.innerWidth / 2)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.modal.centerY - geometry.innerHeight / 2)).toBeLessThanOrEqual(2);
      await expect(dialog.getByRole("heading", { name: "Biblioteca nesta aula" })).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Fechar biblioteca" })).toBeInViewport();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const preview = dialog.locator('div[class*="preview"]');
    const scrolling = await preview.evaluate((element) => ({
      scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
    }));
    expect(scrolling.scrollHeight).toBeGreaterThan(scrolling.clientHeight);
    await preview.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(dialog.getByRole("button", { name: "Fechar biblioteca" })).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir menu da Arena" })).toBeFocused();
    await expect(page.getByTestId("participant-selection-experience")).toBeVisible();
  } finally {
    await api.dispose();
  }
});


test("Painel pedagógico conserva o cockpit e explica ausência de evidências em oito viewports", async ({ page }) => {
  test.setTimeout(85_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 2);
    const anonymous = await request.newContext({ baseURL: apiBaseUrl });
    try {
      const denied = await anonymous.get(`/api/sessions/${fixture.session.id}/learning-overview`);
      expect(denied.status()).toBe(401); // Never expose intervention notes via public join/projector.
    } finally { await anonymous.dispose(); }
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await openArenaEvidence(page);
    const dialog = page.getByRole("dialog", { name: "Evidências da sessão" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Sem ciclos de aprendizagem registrados nesta sessão.")).toBeVisible();
    await expect(dialog.getByText("Presentes marcados")).toBeVisible();
    await expect(dialog.getByText("0", { exact: true }).first()).toBeVisible();
    for (const viewport of [
      { width: 1792, height: 854 }, { width: 1366, height: 768 },
      { width: 1024, height: 600 }, { width: 800, height: 450 },
      { width: 390, height: 844 }, { width: 320, height: 568 },
      { width: 320, height: 400 }, { width: 320, height: 320 },
    ]) {
      await page.setViewportSize(viewport);
      const geometry = await dialog.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return { inBody:element.parentElement?.parentElement===document.body,
          top:bounds.top,left:bounds.left,bottom:bounds.bottom,right:bounds.right,
          cx:bounds.left+bounds.width/2,cy:bounds.top+bounds.height/2,
          w:document.documentElement.clientWidth,h:window.innerHeight };
      });
      expect(geometry.inBody).toBe(true);
      expect(geometry.top).toBeGreaterThanOrEqual(0);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.w+1);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.h+1);
      expect(Math.abs(geometry.cx-geometry.w/2)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.cy-geometry.h/2)).toBeLessThanOrEqual(2);
      await expect(dialog.getByRole("button", { name: "Fechar painel pedagógico" })).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Abrir verificação" })).toBeInViewport();
      await expect(dialog.getByRole("button", { name: "Voltar à Arena" })).toHaveCount(0);
    }
    await dialog.getByRole("button", { name: "Atualizar dados" }).click();
    await expect(dialog.getByText("Sem ciclos de aprendizagem registrados nesta sessão.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir menu da Arena" })).toBeFocused();
    await expect(page.getByTestId("participant-selection-experience")).toBeVisible();
    await openArenaEvidence(page);
    await dialog.getByRole("button", { name: "Abrir verificação" }).click();
    await expect(page.getByRole("heading", { name: "Verificar aprendizagem" })).toBeVisible();
  } finally { await api.dispose(); }
});

test("perda da resposta HTTP depois do commit do sorteio exige reconciliação e não duplica XP", async ({ browser }) => {
  test.setTimeout(100_000);
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 2);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    const basePath = `/api/sessions/${fixture.session.id}/draw-attempts`;
    const stateFromServer = async () => {
      const response = await api.get(`${basePath}/state`);
      await expectOk(response, "Estado do sorteio após falha de rede");
      return response.json() as Promise<{
        currentAttempt: { attemptId: string } | null;
        history: Array<{ attemptId: string; status: string }>;
        confirmedCount: number;
      }>;
    };
    let interceptedSelection = false;
    await page.route(`**${basePath}`, async (route) => {
      if (route.request().method() !== "POST" || interceptedSelection) {
        await route.continue();return;
      }
      interceptedSelection = true;
      const committed = await route.fetch();
      expect(committed.ok()).toBe(true);
      // The server has committed, but the teacher's browser never receives ACK.
      await route.abort("failed");
    });
    await page.getByRole("button", { name: "Sortear participante" }).click();
    const warning = page.getByTestId("draw-reconciliation-warning");
    await expect(warning.getByRole("heading", { name: "Verificar estado do sorteio" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sortear participante" })).toHaveCount(0);
    await expect.poll(async () => (await stateFromServer()).history.length).toBe(1);
    await warning.getByRole("button", { name: "Sincronizar sorteio" }).click();
    await expect(warning).toHaveCount(0);
    const spotlight = page.getByTestId("spotlight-reveal");
    await expect(spotlight).toBeVisible();
    const current = await stateFromServer();
    expect(current.history).toHaveLength(1);
    expect(current.currentAttempt).not.toBeNull();

    let interceptedResolution = false;
    await page.route(`**${basePath}/${current.currentAttempt!.attemptId}/resolve`, async (route) => {
      if (route.request().method() !== "POST" || interceptedResolution) {
        await route.continue();return;
      }
      interceptedResolution = true;
      const committed = await route.fetch();
      expect(committed.ok()).toBe(true);
      await route.abort("failed");
    });
    await spotlight.getByRole("checkbox", { name: /Conceder XP/ }).check();
    await spotlight.getByRole("button", { name: "Confirmar +5 XP" }).click();
    await expect(warning).toBeVisible();
    await expect.poll(async () => (await stateFromServer()).confirmedCount).toBe(1);
    await warning.getByRole("button", { name: "Sincronizar sorteio" }).click();
    await expect(warning).toHaveCount(0);
    await expect(spotlight).toBeHidden();
    const finalState = await stateFromServer();
    expect(finalState.history).toHaveLength(1);
    expect(finalState.history[0].status).toBe("CONFIRMED");
    expect(finalState.currentAttempt).toBeNull();
    const scoreResponse = await api.get(`/api/sessions/${fixture.session.id}/draw-attempts/state`);
    await expectOk(scoreResponse, "Estado final do sorteio reconciliado");
    const persisted = (await scoreResponse.json()) as {
      history: Array<{ scoreEventId: string | null }>;
    };
    expect(persisted.history.filter((attempt) => attempt.scoreEventId != null)).toHaveLength(1);
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("sorteio não envia comando offline e só é liberado após sincronizar ao reconectar", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 2);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Sortear participante" }).click();
    const warning = page.getByTestId("draw-reconciliation-warning");
    await expect(warning).toBeVisible();
    const before = await api.get(`/api/sessions/${fixture.session.id}/draw-attempts/state`);
    await expectOk(before, "Sorteio no servidor enquanto navegador está offline");
    expect((await before.json() as { history: unknown[] }).history).toHaveLength(0);
    await context.setOffline(false);
    await expect(warning).toHaveCount(0);
    await page.getByRole("button", { name: "Sortear participante" }).click();
    await expect(page.getByTestId("spotlight-reveal")).toBeVisible();
    const after = await api.get(`/api/sessions/${fixture.session.id}/draw-attempts/state`);
    await expectOk(after, "Sorteio após reconexão");
    expect((await after.json() as { history: unknown[] }).history).toHaveLength(1);
  } finally { await context.close(); await api.dispose(); }
});

test("professor não repete consultas em loop offline e retoma snapshot ao reconectar", async ({ browser }) => {
  test.setTimeout(80_000);
  const { api, csrfHeaders } = await authenticatedApi();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 2);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    const joinCodeApi = `/api/sessions/${fixture.session.id}/join-code`;
    const seenQueries: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "GET" && new URL(req.url()).pathname === joinCodeApi) seenQueries.push(req.url());
    });
    await context.setOffline(true);
    await page.waitForTimeout(3400); // Exceeds two of the old fixed 1500ms WS retry cycles.
    expect(seenQueries).toHaveLength(0);
    await context.setOffline(false);
    await expect.poll(() => seenQueries.length, { timeout: 15000 }).toBeGreaterThan(0);
    const result = await api.get(`/api/sessions/${fixture.session.id}/draw-attempts/state`);
    await expectOk(result, "Sorteio após reconexão do professor");
    const state = (await result.json()) as { history: unknown[] };
    expect(state.history).toHaveLength(0);
    await expect(page.getByTestId("participant-selection-experience")).toBeVisible();
  } finally {
    await context.close();
    await api.dispose();
  }
});

test("iOS mobile: a single drawer exposes dynamics, tools, material and evidence", async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    for (const width of [320, 375, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      const trigger = page.getByRole("button", { name: "Abrir menu da Arena" });
      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await trigger.click();
      const drawer = page.getByRole("dialog", { name: "Menu da Arena" });
      await expect(drawer).toBeVisible();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(drawer.getByRole("button", { name: "Sorteio" })).toBeVisible();
      await expect(drawer.getByRole("button", { name: "Presença e acesso" })).toBeVisible();
      await expect(drawer.getByRole("button", { name: "Selecionar material" })).toBeVisible();
      await expect(drawer.getByRole("button", { name: "Evidências da aprendizagem" })).toBeVisible();
      await expect(drawer.getByRole("button", { name: "Encerrar sessão da Arena" })).toBeVisible();
      const bounds = await drawer.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (width === 390) await testInfo.attach("arena-mobile-drawer", { body: await page.screenshot(), contentType: "image/png" });
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await selectArenaNavigation(page, "Quiz");
      await expect(page.getByRole("heading", { name: "Quiz", exact: true })).toBeVisible();
      await selectArenaNavigation(page, "Sorteio");
    }
  } finally { await api.dispose(); }
});

test("iOS mobile: Biblioteca usa apenas o fechamento do cabeçalho", async ({ page }) => {
  test.setTimeout(65_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await openArenaMaterial(page);
      const dialog = page.getByRole("dialog", { name: "Biblioteca nesta aula" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Fechar biblioteca" })).toHaveCount(1);
      await expect(dialog.getByRole("button", { name: "Voltar à aula" })).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: /Fechar e voltar à Arena/ })).toHaveCount(0);
      await dialog.getByRole("button", { name: "Fechar biblioteca" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Abrir menu da Arena" })).toBeFocused();
    }
  } finally { await api.dispose(); }
});

test("Arena removes static Next Actions from the permanent session header", async ({ page }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await expect(page.getByRole("navigation", { name: "Sugestões para continuar a aula" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ativar projetor" })).toHaveCount(1);
  } finally { await api.dispose(); }
});

test("iOS LAN: sorteio funciona sem crypto.randomUUID no navegador", async ({ page }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await page.addInitScript(() => {
      Object.defineProperty(window.crypto, "randomUUID", { configurable: true, value: undefined });
    });
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await page.setViewportSize({ width: 390, height: 844 });
    const support = await page.evaluate(() => ({
      randomUUID: typeof crypto.randomUUID,
      getRandomValues: typeof crypto.getRandomValues,
    }));
    expect(support.randomUUID).toBe("undefined");
    expect(support.getRandomValues).toBe("function");
    await page.getByRole("button", { name: "Sortear participante" }).click();
    await expect(page.getByTestId("spotlight-reveal")).toBeVisible();
    await expect(page.getByTestId("draw-reconciliation-warning")).toHaveCount(0);
  } finally { await api.dispose(); }
});

test("Modal contract: Arena evidence, material and draw settings use one X and nonredundant actions", async ({ page }, testInfo) => {
  test.setTimeout(95_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 2);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);

    const checkClose = async (dialog: ReturnType<typeof page.getByRole>, label: string, width: number) => {
      const close = dialog.getByRole("button", { name: label });
      await expect(close).toHaveCount(1);
      await expect(close).toBeInViewport();
      const box = await close.boundingBox();
      expect(box, `${label} at ${width}px`).not.toBeNull();
      // Browser geometry has subpixel rounding (43.99998 for a declared 44px).
      expect(box!.width).toBeGreaterThanOrEqual(43.9);
      expect(box!.height).toBeGreaterThanOrEqual(43.9);
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      await expect(close.locator("svg[aria-hidden=true]")).toHaveCount(1);
    };

    for (const width of [320, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await openArenaEvidence(page);
      const evidence = page.getByRole("dialog", { name: "Evidências da sessão" });
      await expect(evidence).toBeVisible();
      await checkClose(evidence, "Fechar painel pedagógico", width);
      await expect(evidence.getByRole("button", { name: "Voltar à Arena" })).toHaveCount(0);
      await expect(evidence.getByRole("button", { name: "Atualizar dados" })).toBeInViewport();
      const primary = evidence.getByRole("button", { name: "Abrir verificação" });
      await expect(primary).toBeInViewport();
      const primaryBackground = await primary.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(primaryBackground).not.toBe("rgba(0, 0, 0, 0)");
      await testInfo.attach(`modal-evidence-${width}`, { body: await page.screenshot(), contentType: "image/png" });
      await evidence.getByRole("button", { name: "Fechar painel pedagógico" }).click();
      await expect(evidence).toHaveCount(0);

      await openArenaMaterial(page);
      const material = page.getByRole("dialog", { name: "Biblioteca nesta aula" });
      await checkClose(material, "Fechar biblioteca", width);
      await expect(material.getByRole("button", { name: /Voltar à aula|Voltar à Arena/ })).toHaveCount(0);
      await testInfo.attach(`modal-library-${width}`, { body: await page.screenshot(), contentType: "image/png" });
      await page.keyboard.press("Escape");
      await expect(material).toHaveCount(0);

      await page.getByRole("button", { name: /Ajustes/ }).click();
      const drawSettings = page.getByRole("dialog", { name: "Configurações do Sorteio" });
      await checkClose(drawSettings, "Fechar ferramenta", width);
      await drawSettings.getByRole("button", { name: "Fechar ferramenta" }).click();
      await expect(drawSettings).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  } finally { await api.dispose(); }
});

test("Modal contract: QR Code ampliado usa o fechamento compartilhado sem perder o conteúdo", async ({ page }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await selectArenaNavigation(page, "Presença e acesso");
      const attendance = page.getByRole("dialog", { name: "Presença e acesso" });
      await expect(attendance).toBeVisible();
      await attendance.getByRole("button", { name: "Ampliar QR Code da sessão" }).click();
      const dialog = page.getByRole("dialog", { name: "Escaneie para participar" });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("img[alt^='QR Code ampliado']")).toBeVisible();
      const close = dialog.getByRole("button", { name: "Fechar QR Code ampliado" });
      await expect(close.locator('svg[aria-hidden="true"]')).toHaveCount(1);
      const box = await close.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(43.9);
      expect(box?.height).toBeGreaterThanOrEqual(43.9);
      await close.click();
      await expect(dialog).toHaveCount(0);
      await attendance.getByRole("button", { name: "Fechar ferramenta" }).click();
      await expect(attendance).toHaveCount(0);
    }
  } finally { await api.dispose(); }
});

test("Mobile Arena uses one hamburger; desktop retains the shared persistent sidebar", async ({ page }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    for (const width of [320, 375, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByRole("button", { name: "Abrir menu da Arena" })).toBeVisible();
      await expect(page.locator(".arena-nav-scroll")).toBeHidden();
      await expect(page.getByRole("button", { name: "Ativar projetor" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Encerrar sessão", exact: true })).toBeHidden();
      await selectArenaNavigation(page, "Timer");
      const timer = page.getByRole("dialog", { name: "Timer" });
      await expect(timer).toBeVisible();
      await timer.getByRole("button", { name: "Fechar ferramenta" }).click();
      await expect(timer).toHaveCount(0);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("button", { name: "Abrir menu da Arena" })).toBeHidden();
    await expect(page.locator(".arena-nav-scroll")).toBeVisible();
    const desktopNav = page.locator(".arena-nav-scroll");
    await expect(desktopNav.getByRole("button", { name: "Selecionar material" })).toBeVisible();
    for (const label of ["Roteiro da aula", "Sorteio", "Evidências da aprendizagem"]) {
      await expect(desktopNav.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Encerrar sessão", exact: true })).toBeVisible();
  } finally { await api.dispose(); }
});

test("v0.10 dynamic visual contract: seven dynamics share full-width, semantic heading without horizontal overflow", async ({ page }, testInfo) => {
  test.setTimeout(125_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    const dynamics = [
      { navigation: "Sorteio", title: "Sorteio da turma", icon: "draw" },
      { navigation: "Quiz", title: "Quiz", icon: "quiz" },
      { navigation: "Verificar aprendizagem", title: "Verificar aprendizagem", icon: "learning-check" },
      { navigation: "Votação", title: "Votação", icon: "poll" },
      { navigation: "Nuvem de Palavras", title: "Nuvem de Palavras", icon: "wordcloud" },
      { navigation: "Buzzer", title: "Buzzer", icon: "buzzer" },
      { navigation: "Boss Battle", title: "Boss Battle", icon: "boss" },
    ];
    for (const width of [320, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const dynamic of dynamics) {
        const nav = page.locator('.arena-nav-scroll button').filter({ hasText: dynamic.navigation });
        await openMobileArenaMenuIfNeeded(page);
        await nav.click();
        const header = page.getByTestId("dynamic-header");
        await expect(header).toHaveCount(1);
        await expect(header.getByRole("heading", { name: dynamic.title, exact: true })).toBeVisible();
        await expect(header).toHaveAttribute("data-dynamic", dynamic.icon);
        const headerGlyph = header.getByTestId("dynamic-header-icon");
        await expect(headerGlyph).toBeVisible();
        const iconConsistency = await page.evaluate((navigation) => {
          const nav = Array.from(document.querySelectorAll<HTMLElement>('.arena-nav-scroll button'))
            .find((button) => button.getAttribute('aria-label') === navigation);
          const svg = document.querySelector<SVGElement>('[data-testid="dynamic-header-icon"] svg');
          const navSvg = nav?.querySelector<SVGElement>('svg');
          if (!svg || !navSvg) return { matches: false, iconCentered: false };
          const icon = svg.closest<HTMLElement>('[data-testid="dynamic-header-icon"]')!.getBoundingClientRect();
          const copy = document.querySelector<HTMLElement>('[data-testid="dynamic-header"] [class*="copy"]')!.getBoundingClientRect();
          return {
            matches: svg.innerHTML === navSvg.innerHTML,
            iconCentered: Math.abs(icon.top + icon.height / 2 - (copy.top + copy.height / 2)) <= 3,
          };
        }, dynamic.navigation);
        expect(iconConsistency.matches, `${dynamic.navigation}: header glyph differs from navigation glyph`).toBe(true);
        expect(iconConsistency.iconCentered, `${dynamic.navigation}: icon not aligned with identity`).toBe(true);
        const geometry = await page.evaluate(() => {
          const header = document.querySelector<HTMLElement>('[data-testid="dynamic-header"]')!.getBoundingClientRect();
          const main = document.querySelector<HTMLElement>(".arena-cockpit-main")!.getBoundingClientRect();
          return {
            headerX: header.x, headerRight: header.right,
            headerWidth: header.width,
            mainX: main.x, mainRight: main.right,
            docOverflow: document.documentElement.scrollWidth - window.innerWidth,
          };
        });
        expect(geometry.headerX).toBeGreaterThanOrEqual(geometry.mainX - 1);
        expect(geometry.headerRight).toBeLessThanOrEqual(geometry.mainRight + 1);
        expect(geometry.headerWidth, `${dynamic.title} excessively narrow at ${width}`).toBeGreaterThan(geometry.mainRight - geometry.mainX - 95);
        expect(geometry.docOverflow, `${dynamic.title} overflows at ${width}`).toBeLessThanOrEqual(1);
        if (dynamic.navigation === "Boss Battle" && width <= 430) {
          const titleWidth = await header.getByRole("heading", { name: "Boss Battle" }).evaluate(el => el.getBoundingClientRect().width);
          expect(titleWidth, "Boss Battle text must not be squeezed by status/projector").toBeGreaterThan(160);
        }
        if (dynamic.navigation === "Sorteio" && width <= 430) {
          const cardHeight = await page.getByTestId("participant-grid-viewport").evaluate(el => el.getBoundingClientRect().height);
          expect(cardHeight, "One student must not create an enormous empty stage").toBeLessThan(260);
        }
        if (width === 390) {
          await page.screenshot({ path: `/tmp/arena-dynamic-${dynamic.navigation.replaceAll(" ", "-").toLowerCase()}.png` });
          await testInfo.attach(`dynamic-${dynamic.navigation}`, { body: await page.screenshot(), contentType: "image/png" });
          if (dynamic.navigation === "Boss Battle" || dynamic.navigation === "Nuvem de Palavras") {
            await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
            await page.screenshot({ path: `/tmp/arena-dynamic-${dynamic.navigation.replaceAll(" ", "-").toLowerCase()}-dark.png` });
            await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
          }
        }
      }
    }
  } finally { await api.dispose(); }
});

test("v0.10 cloud/poll composer: compact auto-growing question, binary visibility and preview below settings", async ({ page }) => {
  test.setTimeout(90_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await selectArenaNavigation(page, "Nuvem de Palavras");
      const question = page.getByTestId("dynamic-question-input");
      await expect(question).toBeVisible();
      const initialHeight = (await question.boundingBox())!.height;
      expect(initialHeight).toBeLessThan(130);
      await question.fill("Qual palavra sintetiza o assunto?");
      const beforeExpansion = (await question.boundingBox())!.height;
      await question.fill("Explique a relação entre os conceitos:\n" + Array.from({ length: 8 }, (_, i) => `Linha ${i + 1}`).join("\n"));
      const afterExpansion = (await question.boundingBox())!.height;
      expect(afterExpansion, "question grows only as content requires").toBeGreaterThan(beforeExpansion);
      expect(afterExpansion).toBeLessThanOrEqual(241);
      await question.fill("Qual palavra melhor representa esta aula?");
      const amount = page.getByRole("combobox", { name: "Respostas por aluno" });
      const cloudHeader = page.getByTestId("dynamic-header");
      await expect(cloudHeader.getByRole("switch", { name: "Exibir resultados ao vivo" })).toHaveCount(1);
      await expect(page.getByText("PERGUNTA DA RODADA", { exact: true })).toHaveCount(0);
      await expect(page.getByText("As palavras ficam ocultas até você revelar.", { exact: true })).toHaveCount(0);
      const configurationLayout = await page.evaluate(() => {
        const question = document.querySelector<HTMLElement>('[data-testid="dynamic-question-input"]')!;
        const control = document.querySelector<HTMLElement>('[aria-label="Respostas por aluno"]')!;
        const heading = question.previousElementSibling as HTMLElement;
        const r = control.getBoundingClientRect();
        return {
          selectWidth: r.width,
          inlineWithQuestionLabel: heading.contains(control),
          aboveTextarea: r.bottom <= question.getBoundingClientRect().top + 1,
          noOverflow: document.documentElement.scrollWidth - window.innerWidth <= 1,
        };
      });
      expect(configurationLayout.selectWidth).toBeLessThanOrEqual(78);
      expect(configurationLayout.inlineWithQuestionLabel).toBe(true);
      expect(configurationLayout.aboveTextarea).toBe(true);
      expect(configurationLayout.noOverflow).toBe(true);
      await amount.selectOption("2");
      const toggle = page.getByRole("switch", { name: "Exibir resultados ao vivo" });
      await expect(toggle).not.toBeChecked();
      await toggle.check();
      await expect(toggle).toBeChecked();
      await toggle.uncheck();
      await expect(toggle).not.toBeChecked();
      const positions = await page.evaluate(() => {
        const prep = document.querySelector<HTMLElement>('[class*="prepareGrid"]')!;
        const questionCard = prep.querySelector<HTMLElement>('[class*="composeCard"]')!;
        const preview = prep.querySelector<HTMLElement>('[aria-label="Prévia da Nuvem de Palavras"]')!;
        const a = questionCard.getBoundingClientRect();
        const b = preview.getBoundingClientRect();
        return { previewBelow: b.top >= a.bottom - 1, widthMatches: Math.abs(a.width - b.width) < 2 };
      });
      expect(positions.previewBelow).toBe(true);
      expect(positions.widthMatches).toBe(true);
      await selectArenaNavigation(page, "Votação");
      await expect(page.getByTestId("dynamic-question-input")).toBeVisible();
      const pollToggle = page.getByRole("switch", { name: "Exibir resultados ao vivo" });
      await expect(pollToggle).not.toBeChecked();
      await pollToggle.check();
      await expect(pollToggle).toBeChecked();
    }
  } finally { await api.dispose(); }
});


test("v0.10 headers: Sorteio has one consolidated header; Votação remains compact", async ({ page }) => {
  test.setTimeout(90_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    for (const width of [320, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await selectArenaNavigation(page, "Sorteio");
      const drawHeader = page.getByTestId("dynamic-header");
      await expect(drawHeader.getByRole("heading", { name: "Sorteio da turma" })).toBeVisible();
      await expect(drawHeader.getByRole("button", { name: "Sortear participante" })).toHaveCount(1);
      await expect(drawHeader.getByRole("button", { name: /Ajustes/ })).toHaveCount(1);
      await expect(drawHeader.getByLabel(/participantes já sorteados/)).toHaveCount(1);
      const structure = await drawHeader.evaluate((element) => {
        const grid = element.parentElement?.querySelector('[data-testid="participant-grid-viewport"]');
        return { immediatelyFollowedByGrid: element.nextElementSibling === grid, headerHeight: element.getBoundingClientRect().height };
      });
      expect(structure.immediatelyFollowedByGrid, "Sorteio should not introduce a second toolbar card").toBe(true);
      expect(structure.headerHeight, `Sorteio header too tall at ${width}px`).toBeLessThan(225);
      await selectArenaNavigation(page, "Votação");
      const pollHeader = page.getByTestId("dynamic-header");
      const size = await pollHeader.boundingBox();
      expect(size).not.toBeNull();
      expect(size!.height, `Votação header stretched at ${width}px`).toBeLessThan(170);
      await expect(page.getByRole("button", { name: "Ativar projetor" })).toHaveAttribute("aria-pressed", "false");
      await expect(page.getByRole("button", { name: /Projetar ↗/ })).toHaveCount(0);
      await selectArenaNavigation(page, "Boss Battle");
      await expect(page.getByTestId("dynamic-header").getByRole("button", { name: /Projetar/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Ativar projetor" })).toHaveCount(1);
    }
  } finally { await api.dispose(); }
});

test("v0.10 projector: global toggle tracks a real projector tab and closes it", async ({ page }) => {
  test.setTimeout(85_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    const enable = page.getByRole("button", { name: "Ativar projetor" });
    await expect(enable).toHaveAttribute("aria-pressed", "false");
    const opened = page.context().waitForEvent("page");
    await enable.click();
    const projector = await opened;
    await projector.waitForLoadState("domcontentloaded");
    await expect(projector.getByText("Modo Projetor", { exact: true })).toBeVisible();
    const disable = page.getByRole("button", { name: "Desativar projetor" });
    await expect(disable).toHaveAttribute("aria-pressed", "true", { timeout: 9000 });
    await selectArenaNavigation(page, "Quiz");
    await expect(disable, "projector is global, not bound to a dynamic").toHaveAttribute("aria-pressed", "true");
    await disable.click();
    await expect.poll(() => projector.isClosed(), { timeout: 8000 }).toBe(true);
    await expect(page.getByRole("button", { name: "Ativar projetor" })).toHaveAttribute("aria-pressed", "false", { timeout: 9000 });
  } finally { await api.dispose(); }
});

test("v0.10 Spotlight: uma ação primária confirma sem XP ou com XP explicitamente habilitado", async ({ page }, testInfo) => {
  test.setTimeout(95_000);
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders);
    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    const statePath = `/api/sessions/${fixture.session.id}/draw-attempts/state`;
    const state = async () => {
      const response = await api.get(statePath);
      await expectOk(response, "Estado autoritativo do desfecho");
      return response.json() as Promise<{
        confirmedCount: number;
        history: Array<{ status: string; scoreEventId: string | null }>;
      }>;
    };

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      if (viewport.width !== 320) continue;
      await page.getByRole("button", { name: "Sortear participante" }).click();
      const dialog = page.getByTestId("spotlight-reveal");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId("spotlight-card")).toHaveCSS("opacity", "1");
      await expect(dialog.getByRole("button")).toHaveCount(3);
      const award = dialog.getByRole("checkbox", { name: /Conceder XP/ });
      const confirm = dialog.getByTestId("draw-confirm-outcome");
      await expect(award).not.toBeChecked();
      await expect(confirm).toHaveText("Confirmar sem XP");
      await expect(dialog.getByTestId("draw-xp-points")).toHaveCount(0);
      await expect(dialog.getByText("Conta como chamado nesta rodada.")).toBeVisible();
      await expect(dialog.getByText("Desfaz a chamada; poderá ser sorteado novamente.")).toBeVisible();
      await expect(dialog).toHaveAttribute("aria-modal", "true");
      const geometry = await dialog.evaluate((element) => {
        const card = element.querySelector<HTMLElement>('[data-testid="spotlight-card"]')!;
        const bounds = card.getBoundingClientRect();
        const middle = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + Math.min(bounds.height / 2, 80));
        return {
          x: bounds.x, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
          height: bounds.height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
          modalOnTop: Boolean(middle && card.contains(middle)),
          position: getComputedStyle(element).position,
          documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(geometry.x).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.top).toBeGreaterThanOrEqual(0);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
      expect(geometry.position).toBe("fixed");
      expect(geometry.modalOnTop).toBe(true);
      expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
      await page.screenshot({ path: "/tmp/arena-spotlight-mobile-320.png" });
      await testInfo.attach("spotlight-mobile-no-xp", { body: await page.screenshot(), contentType: "image/png" });
      await award.check();
      await expect(dialog.getByTestId("draw-xp-points")).toBeVisible();
      const points = dialog.getByTestId("draw-xp-points");
      await points.fill("101");
      await expect(confirm).toBeDisabled();
      await points.fill("0");
      await expect(confirm).toBeDisabled();
      await points.fill("5");
      await expect(confirm).toHaveText("Confirmar +5 XP");
      await expect(confirm).toBeEnabled();
      await testInfo.attach("spotlight-mobile-with-xp", { body: await page.screenshot(), contentType: "image/png" });
      await award.uncheck();
      await expect(dialog.getByTestId("draw-xp-points")).toHaveCount(0);
      await expect(confirm).toHaveText("Confirmar sem XP");
      await confirm.click();
      await expect(dialog).toBeHidden();
      expect((await state()).history[0].scoreEventId).toBeNull();
    }

    await page.getByRole("button", { name: "Iniciar próxima rodada" }).click();
    await page.getByRole("button", { name: "Sortear participante" }).click();
    const dialog = page.getByTestId("spotlight-reveal");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("spotlight-card")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: "/tmp/arena-spotlight-desktop-1440.png" });
    await dialog.getByRole("checkbox", { name: /Conceder XP/ }).check();
    await dialog.getByTestId("draw-xp-points").fill("10");
    await dialog.getByRole("button", { name: "Confirmar +10 XP" }).click();
    await expect(dialog).toBeHidden();
    const updated = await state();
    expect(updated.confirmedCount).toBe(2);
    expect(updated.history.filter((event) => event.scoreEventId != null)).toHaveLength(1);
  } finally { await api.dispose(); }
});

test("v0.11 / 11.2: professor publica leitura segura e o projetor recebe somente snapshot ativo", async ({ page, browser }) => {
  test.setTimeout(110_000);
  const { api, csrfHeaders } = await authenticatedApi();
  const anonymous = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const projector = await anonymous.newPage();
  try {
    const fixture = await createArenaFixture(api, csrfHeaders, 0);
    const title = `Leitura SQL ${fixture.session.id.slice(0,8)}`;
    const publishedText = "Conteúdo preservado da revisão publicada";
    const body = [
      "# Banco de Dados", "", "## SELECT", "", publishedText,
      "", "<aside>", "### Atenção à cláusula WHERE", "",
      "O professor conduz a análise do filtro.", "</aside>", "",
      "[Fonte de leitura](https://example.org/referencia) para estudo posterior.", "",
      "## Prática", "", "| Comando | Finalidade |", "| --- | --- |", "| SELECT | Consulta |",
      "", "```sql", "SELECT * FROM produtos;", "```", "",
      ...Array.from({ length: 38 }, (_, index) => `### Exemplo ${index + 1}\nRevisão contextualizada do comando.`),
    ].join("\n");
    const create = await api.post("/api/library/resources", {
      headers: csrfHeaders,
      data: { title, summary: "Exposição orientada", body,
        format: "MARKDOWN", sourceType: "MANUAL", subject: "Banco de Dados",
        tags: ["SQL"], language: "pt-BR" },
    });
    await expectOk(create, "Material canônico para apresentação");
    const resource = await create.json() as { id: string };
    const codeResponse = await api.get(`/api/sessions/${fixture.session.id}/join-code`);
    await expectOk(codeResponse, "Código de sessão");
    const { code } = await codeResponse.json() as { code: string };

    const publicPath = `/api/projector/${code}/material`;
    const before = await anonymous.request.get(`${apiBaseUrl}${publicPath}`);
    expect(before.status()).toBe(404);
    expect(before.headers()["cache-control"] ?? "").toContain("no-store");

    await openArena(page, fixture.classroomName, fixture.sessionTitle);
    await openArenaMaterial(page);
    const dialog = page.getByRole("dialog", { name: "Biblioteca nesta aula" });
    await dialog.getByLabel("Encontrar material na Biblioteca").fill(title);
    await dialog.getByRole("button", { name: new RegExp(title) }).click();
    const placed = await api.get(`/api/sessions/${fixture.session.id}/contextual-material`);
    await expectOk(placed, "Vínculo de material");
    expect((await placed.json() as { resourceId: string }).resourceId).toBe(resource.id);
    await expect(dialog.getByRole("button", { name: "Apresentar no projetor" })).toBeVisible();
    await expect(dialog.getByText("Material vinculado · ainda não apresentado")).toBeVisible();

    await dialog.getByRole("button", { name: "Apresentar no projetor" }).click();
    await expect(dialog.getByText(/Publicado no palco · revisão 1/)).toBeVisible();
    const stage = await api.get(`/api/sessions/${fixture.session.id}/stage`);
    await expectOk(stage, "Palco após publicação");
    expect((await stage.json() as { primary: { type: string } }).primary.type).toBe("MATERIAL");

    await projector.goto(`/projector?code=${code}`);
    await expect(projector.getByTestId("projector-material-stage")).toBeVisible({ timeout: 15_000 });
    const reader = projector.getByTestId("projector-material-stage");
    await expect(reader.getByRole("heading", { name: title })).toBeVisible();
    await expect(reader.getByRole("region", { name: "Conteúdo publicado para o projetor" })).toHaveAttribute("tabindex", "0");
    await expect(reader.getByText(publishedText)).toBeVisible();
    await expect(reader.getByRole("complementary", { name: "Destaque do material" })).toContainText("WHERE");
    await expect(reader.getByRole("table")).toContainText("Consulta");
    await expect(reader.getByText("SELECT * FROM produtos;")).toBeVisible();
    await expect(reader.locator("iframe,script,img,form,a[href]")).toHaveCount(0);
    await expect(reader.getByText("Fonte de leitura")).toBeVisible();

    const snapshotResponse = await anonymous.request.get(`${apiBaseUrl}${publicPath}`);
    expect(snapshotResponse.status()).toBe(200);
    expect(snapshotResponse.headers()["cache-control"]).toContain("no-store");
    const snapshotJson = await snapshotResponse.text();
    expect(snapshotJson).toContain(publishedText);
    expect(snapshotJson).not.toMatch(/sourceUrl|sourceReference|resourceId|requestId|classroomId/);

    // Overflow stays inside the reader at smaller breakpoints and ultrawide.
    for (const viewport of [{ width: 390, height: 700 }, { width: 2560, height: 1440 }]) {
      await projector.setViewportSize(viewport);
      await expect(reader).toBeVisible();
      const dimensions = await projector.evaluate(() => {
        const section = document.querySelector('[aria-label="Conteúdo publicado para o projetor"]') as HTMLElement;
        return {
          contentScrollable: section.scrollHeight > section.clientHeight,
          viewportOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(dimensions.contentScrollable).toBe(true);
      expect(dimensions.viewportOverflow).toBeLessThanOrEqual(1);
    }

    // 11.3: teacher navigates the canonical outline without republishing.
    const sectionSelect = dialog.getByLabel("Seção apresentada no projetor");
    await expect(sectionSelect).toBeVisible();
    await sectionSelect.selectOption("exemplo-30");
    await expect(sectionSelect).toHaveValue("exemplo-30");
    await expect.poll(async () => {
      const state = await api.get(`/api/sessions/${fixture.session.id}/stage`);
      return (await state.json() as { primary: { sectionAnchor: string } }).primary.sectionAnchor;
    }).toBe("exemplo-30");
    await expect.poll(async () => projector.getByRole("region", {
      name: "Conteúdo publicado para o projetor",
    }).evaluate((element) => element.scrollTop), { timeout: 12_000 }).toBeGreaterThan(100);
    const stillSame = await anonymous.request.get(`${apiBaseUrl}${publicPath}`);
    expect(stillSame.status()).toBe(200);
    expect((await stillSame.json() as { publicationId: string }).publicationId)
      .toBe((JSON.parse(snapshotJson) as { publicationId: string }).publicationId);

    await projector.reload();
    await expect(projector.getByTestId("projector-material-stage")).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => projector.getByRole("region", {
      name: "Conteúdo publicado para o projetor",
    }).evaluate((element) => element.scrollTop), { timeout: 15_000 }).toBeGreaterThan(100);
    await sectionSelect.selectOption("");
    await expect.poll(async () => projector.getByRole("region", {
      name: "Conteúdo publicado para o projetor",
    }).evaluate((element) => element.scrollTop), { timeout: 12_000 }).toBe(0);

    await dialog.getByRole("button", { name: "Retirar do projetor" }).click();
    await expect(dialog.getByText("Material vinculado · ainda não apresentado")).toBeVisible();
    await expect(projector.getByTestId("projector-material-stage")).toHaveCount(0, { timeout: 12_000 });
    await expect(projector.getByRole("heading", { name: "Aguardando próxima dinâmica" })).toBeVisible();
    await expect(projector.getByText(publishedText)).toHaveCount(0);
    const revoked = await anonymous.request.get(`${apiBaseUrl}${publicPath}`);
    expect(revoked.status()).toBe(404);
    expect(revoked.headers()["cache-control"]).toContain("no-store");
    await projector.reload();
    await expect(projector.getByTestId("projector-material-stage")).toHaveCount(0);
  } finally {
    await anonymous.close();
    await api.dispose();
  }
});
