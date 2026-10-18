import {
  expect,
  request,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";

type ClassroomView = { id: string; name: string };
type StudentView = { id: string };
type SessionView = { id: string; title: string };

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApiBaseUrl = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1728, height: 920 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 820, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

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

async function createFixture(api: APIRequestContext, csrfHeaders: Record<string, string>) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const classroomName = `Organizar e operacionalizar procedimentos de recepção - 76h · Responsividade ${suffix}`;

  const classroomResponse = await api.post("/api/classrooms", {
    data: { name: classroomName, code: `UX-${suffix.slice(-6)}` },
    headers: csrfHeaders,
  });
  await expectOk(classroomResponse, "Criação da turma responsiva");
  const classroom = (await classroomResponse.json()) as ClassroomView;

  const studentIds: string[] = [];
  for (let index = 0; index < 2; index += 1) {
    const studentResponse = await api.post("/api/students", {
      data: {
        registration: `UX-${suffix}-${index + 1}`,
        name: `Aluno Responsivo ${index + 1}`,
        nickname: `Aluno ${index + 1}`,
      },
      headers: csrfHeaders,
    });
    await expectOk(studentResponse, "Criação do aluno responsivo");
    const student = (await studentResponse.json()) as StudentView;
    studentIds.push(student.id);
    const enrollment = await api.post(`/api/classrooms/${classroom.id}/students/${student.id}`, {
      headers: csrfHeaders,
    });
    await expectOk(enrollment, "Matrícula responsiva");
  }

  return { classroom, studentIds };
}
async function loginAndOpenClassroom(page: Page, classroomName: string) {
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
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
}

async function reopenClassroomAfterReload(page: Page, classroomName: string) {
  await page.reload();
  const card = page.locator("article.overview-class-card").filter({ hasText: classroomName });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
}
async function expectInsideViewport(page: Page, testId: string, viewportWidth: number) {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box, `${testId} precisa possuir caixa visual`).not.toBeNull();
  if (!box) return;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
}

async function assertHomeLayout(page: Page, viewport: { width: number; height: number }) {
  await expect(page.getByText("INÍCIO DA TURMA", { exact: true })).toBeVisible();
  await expect(page.getByTestId("classroom-session-panel")).toBeVisible();
  await expect(page.getByTestId("classroom-session-action")).toBeVisible();
  await expect(page.getByTestId("classroom-summary")).toBeVisible();
  await expect(page.getByTestId("classroom-integration-workspace")).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  );
  expect(
    overflow,
    `overflow horizontal em ${viewport.width}x${viewport.height}`,
  ).toBeLessThanOrEqual(1);
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY, "Home da turma deve abrir no topo").toBeLessThanOrEqual(1);

  const skipLinkState = await page.locator(".skip-link").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      focused: document.activeElement === element,
      focusVisible: element.matches(":focus-visible"),
      bottom: rect.bottom,
    };
  });
  expect(skipLinkState.focused).toBe(false);
  expect(skipLinkState.focusVisible).toBe(false);
  expect(
    skipLinkState.bottom,
    "skip-link deve permanecer fora da viewport sem foco",
  ).toBeLessThanOrEqual(0);

  await expectInsideViewport(page, "classroom-home-hero", viewport.width);
  await expectInsideViewport(page, "classroom-session-panel", viewport.width);
  await expectInsideViewport(page, "classroom-session-action", viewport.width);
  await expectInsideViewport(page, "classroom-summary", viewport.width);

  const panel = page.getByTestId("classroom-session-panel");
  const action = page.getByTestId("classroom-session-action");
  const state = panel.getByText(/Nenhuma sessão em andamento|SESSÃO EM ANDAMENTO/).first();
  const copy = state.locator("..");
  const [copyBox, actionBox] = await Promise.all([copy.boundingBox(), action.boundingBox()]);
  expect(copyBox).not.toBeNull();
  expect(actionBox).not.toBeNull();

  if (copyBox && actionBox) {
    if (viewport.width <= 820) {
      expect(actionBox.y).toBeGreaterThanOrEqual(copyBox.y + copyBox.height - 1);
    } else {
      expect(actionBox.x).toBeGreaterThanOrEqual(copyBox.x + copyBox.width - 1);
    }
  }
  const cards = page.getByTestId("classroom-summary").locator(":scope > div");
  await expect(cards).toHaveCount(2);
  const [firstBox, secondBox] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  if (firstBox && secondBox) {
    if (viewport.width <= 640) {
      expect(secondBox.y).toBeGreaterThanOrEqual(firstBox.y + firstBox.height - 1);
    } else {
      expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThanOrEqual(2);
    }
  }
}

test.describe.serial("Classroom Home responsive contract", () => {
  let api: APIRequestContext;
  let csrfHeaders: Record<string, string>;
  let fixture: Awaited<ReturnType<typeof createFixture>>;
  let activeSession: SessionView | undefined;

  test.beforeAll(async () => {
    ({ api, csrfHeaders } = await authenticatedApi());
    fixture = await createFixture(api, csrfHeaders);
  });

  test.afterAll(async () => {
    if (activeSession) {
      await api.post(`/api/sessions/${activeSession.id}/finish`, { headers: csrfHeaders });
    }
    await api.delete(`/api/classrooms/${fixture.classroom.id}`, {
      data: { confirmationName: fixture.classroom.name },
      headers: csrfHeaders,
    });
    await api.dispose();
  });
  test("reloads the idle Home through all target breakpoints and themes without overflow or collisions", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(60_000);
    for (const theme of ["dark", "light"] as const) {
      const context = await browser.newContext({ viewport: viewports[0] });
      await context.addInitScript((preference) => {
        window.localStorage.setItem("arena-dev-theme", preference);
      }, theme);
      const page = await context.newPage();

      try {
        await loginAndOpenClassroom(page, fixture.classroom.name);

        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          await reopenClassroomAfterReload(page, fixture.classroom.name);
          await expect(
            page.getByText("Nenhuma sessão em andamento", { exact: true }),
          ).toBeVisible();
          await expect(page.getByRole("button", { name: /Iniciar Arena/ })).toBeVisible();
          await assertHomeLayout(page, viewport);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

          const shot = await page.screenshot();
          await testInfo.attach(`home-${theme}-${viewport.width}x${viewport.height}`, {
            body: shot,
            contentType: "image/png",
          });
        }
      } finally {
        await context.close();
      }
    }
  });

  test("active-session state survives reload at desktop and mobile widths", async ({ browser }) => {
    const response = await api.post("/api/sessions", {
      data: {
        classroomId: fixture.classroom.id,
        title: "Aula ao vivo · Validação responsiva",
        presentStudentIds: fixture.studentIds,
      },
      headers: csrfHeaders,
    });
    await expectOk(response, "Criação da sessão responsiva");
    activeSession = (await response.json()) as SessionView;

    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addInitScript(() => {
      window.localStorage.setItem("arena-dev-theme", "dark");
    });
    const page = await context.newPage();

    try {
      await loginAndOpenClassroom(page, fixture.classroom.name);
      for (const viewport of [
        { width: 1366, height: 768 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await reopenClassroomAfterReload(page, fixture.classroom.name);
        await expect(page.getByText("SESSÃO EM ANDAMENTO", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: /Continuar Arena/ })).toBeVisible();
        await assertHomeLayout(page, viewport);
      }

      await page.setViewportSize({ width: 1366, height: 768 });
      await reopenClassroomAfterReload(page, fixture.classroom.name);
      await page.getByRole("button", { name: /Continuar Arena/ }).click();
      await expect(page.locator("aside.arena-cockpit-nav")).toBeVisible();
      await page.getByRole("button", { name: "Timer", exact: true }).click();
      const timerDialog = page.getByRole("dialog", { name: "Timer" });
      await expect(timerDialog).toBeVisible();
      await expect(timerDialog.getByText("Configuração do timer", { exact: true })).toHaveCount(0);
      await expect(timerDialog.getByText("NOVO TEMPORIZADOR", { exact: true })).toHaveCount(0);
      await expect(timerDialog.getByText("Tempo da atividade", { exact: true })).toBeVisible();
      await expect(timerDialog.getByText("Conteúdo", { exact: true })).toBeVisible();
      await expect(timerDialog.getByText("Exibição", { exact: true })).toBeVisible();
      await expect(timerDialog.getByText("Alertas locais", { exact: true })).toBeVisible();
      await expect(timerDialog.getByText("Ações", { exact: true })).toHaveCount(0);
      await expect(timerDialog.getByText("Configurar", { exact: true })).toHaveCount(0);
      await expect(timerDialog.locator(".timer-config-card")).toHaveCount(1);

      for (const viewport of [
        { width: 1366, height: 768 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        const overflow = await timerDialog.evaluate((element) => element.scrollWidth - element.clientWidth);
        expect(overflow, `Timer sem overflow em ${viewport.width}px`).toBeLessThanOrEqual(1);

        const drawerContent = timerDialog.getByTestId("arena-tool-drawer-content");
        await expect(drawerContent).toHaveCSS("overflow-y", "scroll");
        await expect(drawerContent).toHaveCSS("scrollbar-width", "none");

        const segments = timerDialog.locator(".timer-duration-segment");
        await expect(segments).toHaveCount(3);
        const boxes = await Promise.all([0, 1, 2].map((index) => segments.nth(index).boundingBox()));
        for (const box of boxes) {
          expect(box).not.toBeNull();
          if (box) expect(box.width).toBeGreaterThan(80);
        }

        const presetRail = timerDialog.locator(".timer-preset-chips");
        const presetOverflow = await presetRail.evaluate((element) => element.scrollWidth - element.clientWidth);
        expect(presetOverflow, `Presets sem scroll horizontal em ${viewport.width}px`).toBeLessThanOrEqual(1);

        const presets = presetRail.locator("button");
        await expect(presets).toHaveCount(8);
        const presetBoxes = await Promise.all(Array.from({ length: 8 }, (_, index) => presets.nth(index).boundingBox()));
        const firstPresetY = presetBoxes[0]?.y;
        expect(firstPresetY).toBeDefined();
        for (const box of presetBoxes) {
          expect(box).not.toBeNull();
          if (box && firstPresetY !== undefined) expect(Math.abs(box.y - firstPresetY)).toBeLessThanOrEqual(5);
        }

        const startButton = timerDialog.getByRole("button", { name: "Iniciar agora" });
        await startButton.scrollIntoViewIfNeeded();
        await expect(startButton).toBeInViewport();
        await drawerContent.focus();
        await page.keyboard.press("Home");
        await page.keyboard.press("End");
        await expect(startButton).toBeInViewport();
      }
    } finally {
      await context.close();
    }
  });

  test("iOS: profile aligned right and tabs only scroll horizontally", async ({ browser }, testInfo) => {
    test.setTimeout(80_000);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await loginAndOpenClassroom(page, fixture.classroom.name);
      for (const width of [320, 375, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        for (const tabName of ["Início", "Alunos", "Atividades", "Jornadas"]) {
          await page.locator(".classroom-section-tab").filter({ hasText: tabName }).click();
          const state = await page.evaluate(() => {
            const nav = document.querySelector<HTMLElement>(".classroom-section-nav")!;
            const strip = document.querySelector<HTMLElement>(".classroom-section-tabs")!;
            const selected = document.querySelector<HTMLElement>('.classroom-section-tab[aria-selected="true"]')!;
            const header = document.querySelector<HTMLElement>(".contextual-topbar")!;
            const profile = header.querySelector<HTMLElement>(".topbar-profile")!;
            const activeBounds = selected.getBoundingClientRect();
            const stripBounds = strip.getBoundingClientRect();
            return {
              navHeight: nav.getBoundingClientRect().height,
              verticalOverflow: strip.scrollHeight - strip.clientHeight,
              overflowY: getComputedStyle(strip).overflowY,
              touchAction: getComputedStyle(strip).touchAction,
              activeVisible: activeBounds.left >= stripBounds.left - 1 && activeBounds.right <= stripBounds.right + 1,
              textWrap: getComputedStyle(selected.querySelector("strong")!).whiteSpace,
              profileGap: header.getBoundingClientRect().right - profile.getBoundingClientRect().right,
              pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
            };
          });
          expect(state.navHeight).toBeCloseTo(64, 0);
          expect(state.verticalOverflow, `tabs have vertical scroll at ${width}px`).toBeLessThanOrEqual(1);
          expect(state.overflowY).toBe("hidden");
          expect(state.touchAction).toBe("pan-x");
          expect(state.activeVisible, `${tabName} clipped at ${width}px`).toBe(true);
          expect(state.textWrap).toBe("nowrap");
          expect(state.profileGap, `profile inset at ${width}px`).toBeGreaterThanOrEqual(-1);
          expect(state.profileGap).toBeLessThanOrEqual(18);
          expect(state.pageOverflow).toBeLessThanOrEqual(1);
        }
        await testInfo.attach(`ios-classroom-${width}`, { body: await page.screenshot(), contentType: "image/png" });
      }
    } finally {
      await context.close();
    }
  });
});
