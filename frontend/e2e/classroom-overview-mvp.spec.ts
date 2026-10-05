import {
  expect,
  request,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";

type ClassroomView = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
};

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApiBaseUrl = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

const viewports = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
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

async function createClassroom(
  api: APIRequestContext,
  csrfHeaders: Record<string, string>,
  name: string,
  code: string,
  active = true,
) {
  const response = await api.post("/api/classrooms", {
    data: { name, code },
    headers: csrfHeaders,
  });
  await expectOk(response, "Criação da turma");
  const classroom = (await response.json()) as ClassroomView;

  if (!active) {
    const update = await api.put(`/api/classrooms/${classroom.id}`, {
      data: {
        name: classroom.name,
        code: classroom.code,
        active: false,
        studentStudyAccessEnabled: false,
      },
      headers: csrfHeaders,
    });
    await expectOk(update, "Inativação da turma");
    return (await update.json()) as ClassroomView;
  }

  return classroom;
}

async function removeClassroom(
  api: APIRequestContext,
  csrfHeaders: Record<string, string>,
  classroom: ClassroomView | undefined,
) {
  if (!classroom) return;
  const response = await api.delete(`/api/classrooms/${classroom.id}`, {
    data: { confirmationName: classroom.name },
    headers: csrfHeaders,
  });
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Limpeza da turma falhou (${response.status()}): ${await response.text()}`);
  }
}

async function login(page: Page) {
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
}

async function setThemeAndReload(page: Page, theme: "dark" | "light") {
  await page.evaluate((nextTheme) => {
    window.localStorage.setItem("arena-dev-theme", nextTheme);
  }, theme);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();
}

test.describe("Classroom overview MVP contract", () => {
  let api: APIRequestContext;
  let csrfHeaders: Record<string, string>;
  let activeClassroom: ClassroomView;
  let inactiveClassroom: ClassroomView;

  test.beforeAll(async () => {
    const authenticated = await authenticatedApi();
    api = authenticated.api;
    csrfHeaders = authenticated.csrfHeaders;
    const suffix = Date.now().toString(36);
    activeClassroom = await createClassroom(
      api,
      csrfHeaders,
      `MVP Turmas Ativa ${suffix}`,
      `MVP-A-${suffix.slice(-4)}`,
    );
    inactiveClassroom = await createClassroom(
      api,
      csrfHeaders,
      `MVP Turmas Inativa ${suffix}`,
      `MVP-I-${suffix.slice(-4)}`,
      false,
    );
  });

  test.afterAll(async () => {
    await removeClassroom(api, csrfHeaders, activeClassroom);
    await removeClassroom(api, csrfHeaders, inactiveClassroom);
    await api?.dispose();
  });

  test("keeps Biblioteca as global navigation and preserves the classroom workflow", async ({ page }) => {
    await login(page);

    const navigation = page.getByRole("navigation", { name: "Navegação global" });
    await expect(
      navigation.getByRole("button", { name: "Visão geral" }),
    ).toHaveAttribute("aria-current", "page");

    await navigation.getByRole("button", { name: "Biblioteca" }).click();
    await expect(page.getByRole("heading", { name: "Seus materiais" })).toBeVisible();
    await expect(
      navigation.getByRole("button", { name: "Biblioteca" }),
    ).toHaveAttribute("aria-current", "page");

    await navigation.getByRole("button", { name: "Visão geral" }).click();
    await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();

    const search = page.getByLabel("Buscar turma por nome ou código");
    await search.fill(activeClassroom.name);
    await expect(page.getByTestId("classroom-overview-card")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: `Abrir turma ${activeClassroom.name}` }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await page.getByRole("button", { name: /Inativas/ }).click();
    await expect(
      page.getByRole("button", { name: `Abrir turma ${inactiveClassroom.name}` }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Abrir turma ${activeClassroom.name}` }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /Todas/ }).click();
    await page
      .getByRole("button", { name: `Abrir turma ${activeClassroom.name}` })
      .click();
    await expect(page.getByTestId("classroom-home-hero")).toBeVisible();

    await navigation.getByRole("button", { name: "Visão geral" }).click();
    await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();

    const selectedCard = page.getByTestId("classroom-overview-card").filter({ hasText: activeClassroom.name });
    await expect(selectedCard).toHaveClass(/selected/);
    const selectedCue = await selectedCard.evaluate((element) => {
      const cue = window.getComputedStyle(element, "::before");
      return {
        content: cue.content,
        width: Number.parseFloat(cue.width),
        height: Number.parseFloat(cue.height),
        transform: cue.transform,
      };
    });
    expect(selectedCue.content).not.toBe("none");
    expect(selectedCue.width).toBeGreaterThanOrEqual(3);
    expect(selectedCue.height).toBeGreaterThan(selectedCue.width * 4);
    expect(selectedCue.transform).toBe("none");

    const [metricsBox, gridBox] = await Promise.all([
      page.locator(".overview-metrics").boundingBox(),
      page.locator(".classroom-card-grid").boundingBox(),
    ]);
    expect(metricsBox).not.toBeNull();
    expect(gridBox).not.toBeNull();
    if (metricsBox && gridBox) {
      expect(Math.abs(metricsBox.x - gridBox.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(metricsBox.width - gridBox.width)).toBeLessThanOrEqual(1);
    }
  });

  test("survives every target breakpoint and both themes without overflow", async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    await login(page);

    for (const theme of ["dark", "light"] as const) {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await setThemeAndReload(page, theme);

        const navigation = page.getByRole("navigation", { name: "Navegação global" });
        await expect(
          navigation.getByRole("button", { name: "Visão geral" }),
        ).toBeVisible();
        await expect(
          navigation.getByRole("button", { name: "Biblioteca" }),
        ).toBeVisible();

        const overflow = await page.evaluate(
          () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        );
        expect(
          overflow,
          `overflow horizontal em ${viewport.width}x${viewport.height} / ${theme}`,
        ).toBeLessThanOrEqual(1);

        const firstCard = page.getByTestId("classroom-overview-card").first();
        if (await firstCard.isVisible()) {
          const box = await firstCard.boundingBox();
          expect(box).not.toBeNull();
          if (box && viewport.width >= 768) {
            expect(
              box.width,
              `card excessivamente largo em ${viewport.width}px / ${theme}`,
            ).toBeLessThanOrEqual(380);
          }
        }

        if (viewport.width === 2560) {
          const cards = page.getByTestId("classroom-overview-card");
          if (await cards.count() >= 6) {
            const rowBoxes = await Promise.all(Array.from({ length: 6 }, (_, index) => cards.nth(index).boundingBox()));
            const firstRowY = rowBoxes[0]?.y;
            expect(firstRowY).toBeDefined();
            for (const box of rowBoxes.slice(0, 5)) {
              expect(box).not.toBeNull();
              if (box && firstRowY !== undefined) expect(Math.abs(box.y - firstRowY)).toBeLessThanOrEqual(1);
            }
            if (rowBoxes[5] && firstRowY !== undefined) expect(rowBoxes[5].y).toBeGreaterThan(firstRowY + 1);
          }
        }

        if (viewport.width === 1440) {
          await page.screenshot({
            path: `test-results/classroom-overview-${theme}-1440.png`,
            fullPage: true,
          });
        }
      }
    }
  });
});
