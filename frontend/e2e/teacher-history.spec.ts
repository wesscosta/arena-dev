import { expect, request, test, type APIResponse, type Page } from "./fixtures";

// rc.8: the teacher area is one page; the open screen is mirrored in the URL so
// the browser (and installed PWA) "back" returns to the previous screen.

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApiBaseUrl = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

async function expectOk(response: APIResponse, operation: string) {
  if (!response.ok()) {
    throw new Error(`${operation} falhou (${response.status()}): ${await response.text()}`);
  }
}

async function createClassroom() {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const csrf = await api.get("/api/auth/csrf");
  await expectOk(csrf, "Token CSRF E2E");
  const { token } = (await csrf.json()) as { token: string };
  const headers = { "X-XSRF-TOKEN": token };
  await expectOk(
    await api.post("/api/auth/login", {
      headers,
      data: { username: teacherUsername, password: teacherPassword },
    }),
    "Login E2E",
  );
  const suffix = Date.now().toString(36);
  const response = await api.post("/api/classrooms", {
    headers,
    data: { name: `Histórico ${suffix}`, code: `HIS-${suffix.slice(-5)}` },
  });
  await expectOk(response, "Criação da turma");
  const classroom = (await response.json()) as { id: string; name: string };
  return {
    classroom,
    dispose: async () => {
      await api.delete(`/api/classrooms/${classroom.id}`, { headers });
      await api.dispose();
    },
  };
}

async function login(page: Page) {
  const csrf = await page.request.get(`${browserApiBaseUrl}/api/auth/csrf`);
  await expectOk(csrf, "Token CSRF navegador");
  const { token } = (await csrf.json()) as { token: string };
  await expectOk(
    await page.request.post(`${browserApiBaseUrl}/api/auth/login`, {
      headers: { "X-XSRF-TOKEN": token },
      data: { username: teacherUsername, password: teacherPassword },
    }),
    "Login navegador",
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible({ timeout: 10_000 });
}

test("back and reload follow the teacher's screens instead of leaving the app", async ({ page }) => {
  const fixture = await createClassroom();
  try {
    await login(page);
    const nav = page.getByRole("navigation", { name: "Navegação global" });

    await nav.getByRole("button", { name: "Biblioteca" }).click();
    await expect(page.getByRole("heading", { name: "Seus materiais" })).toBeVisible();
    await expect(page).toHaveURL(/\?tela=biblioteca$/);

    await page.goBack();
    await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    await page.locator("article.overview-class-card").filter({ hasText: fixture.classroom.name }).click();
    await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
    await page.locator(".classroom-section-tab").filter({ hasText: "Jornadas" }).click();
    await expect(page).toHaveURL(new RegExp(`tela=turma&turma=${fixture.classroom.id}&aba=jornadas`));

    await page.reload();
    await expect(page.locator('.classroom-section-tab[aria-selected="true"]')).toContainText("Jornadas");

    await page.goBack();
    await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();

    await page.goForward();
    await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
  } finally {
    await fixture.dispose();
  }
});

test("a link to a classroom that no longer exists falls back to the classroom list", async ({ page }) => {
  await login(page);
  await page.goto("/?tela=turma&turma=00000000-0000-0000-0000-000000000000&aba=jornadas");
  await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
