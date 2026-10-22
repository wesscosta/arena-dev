import { expect, request, test, type APIResponse, type Page } from "./fixtures";

// rc.8: a published Journey stays editable. The teacher corrects a stage's
// text in place and renames the Journey without unpublishing it.

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApiBaseUrl = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

async function expectOk(response: APIResponse, operation: string) {
  if (!response.ok()) {
    throw new Error(`${operation} falhou (${response.status()}): ${await response.text()}`);
  }
}

async function publishedJourney() {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const csrf = await api.get("/api/auth/csrf");
  await expectOk(csrf, "Token CSRF E2E");
  const { token } = (await csrf.json()) as { token: string };
  const headers = { "X-XSRF-TOKEN": token };
  await expectOk(
    await api.post("/api/auth/login", { headers, data: { username: teacherUsername, password: teacherPassword } }),
    "Login E2E",
  );
  const suffix = Date.now().toString(36);
  const classroomResponse = await api.post("/api/classrooms", {
    headers,
    data: { name: `Edição ${suffix}`, code: `EDT-${suffix.slice(-5)}` },
  });
  await expectOk(classroomResponse, "Criação da turma");
  const classroom = (await classroomResponse.json()) as { id: string };
  const resourceResponse = await api.post("/api/library/resources", {
    headers,
    data: { title: `SQL ${suffix}`, body: "# SQL\n\nSELEC com erro de digitação.", format: "MARKDOWN", sourceType: "MANUAL" },
  });
  await expectOk(resourceResponse, "Material da Biblioteca");
  const resource = (await resourceResponse.json()) as { id: string };
  const journeyResponse = await api.post("/api/journeys", {
    headers,
    data: {
      classroomId: classroom.id,
      title: `Jornada ${suffix}`,
      stages: [{
        title: "Consultas básicas", unlockRule: "IMMEDIATE", completionRule: "MANUAL",
        sectionTitle: "Consultas", itemType: "CONTENT", learningResourceId: resource.id,
      }],
    },
  });
  await expectOk(journeyResponse, "Criação da jornada");
  const journey = (await journeyResponse.json()) as { id: string; title: string };
  await expectOk(await api.post(`/api/journeys/${journey.id}/publish`, { headers }), "Publicação da jornada");
  return {
    api,
    classroom,
    journey,
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
}

test("the teacher corrects a published Journey's text and title without unpublishing it", async ({ page }) => {
  const fixture = await publishedJourney();
  try {
    await login(page);
    await page.goto(`/?tela=turma&turma=${fixture.classroom.id}&aba=jornadas`);
    const catalog = page.getByRole("complementary", { name: "Jornadas da turma" });
    await catalog.getByRole("button", { name: new RegExp(fixture.journey.title) }).click();
    await expect(page.getByText("Publicada e editável.", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Editar texto" }).click();
    const editor = page.getByRole("dialog", { name: "Consultas básicas" });
    await expect(editor.getByText("Salvar também atualiza o material na Biblioteca", { exact: false })).toBeVisible();
    const body = editor.getByLabel("Texto do conteúdo");
    await expect(body).toHaveValue(/SELEC com erro/);
    await body.fill("# SQL\n\nSELECT corrigido.");
    await editor.getByRole("button", { name: "Salvar texto" }).click();
    await expect(editor).toBeHidden();

    const renamed = `${fixture.journey.title} revisada`;
    await page.getByLabel("Título", { exact: true }).fill(renamed);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(catalog.getByRole("button", { name: new RegExp(renamed) })).toBeVisible();

    const journey = await fixture.api.get(`/api/journeys/${fixture.journey.id}`);
    await expectOk(journey, "Leitura da jornada");
    const view = (await journey.json()) as { title: string; status: string; stages: { id: string }[] };
    expect(view.status).toBe("PUBLISHED");
    expect(view.title).toBe(renamed);
    expect(view.stages).toHaveLength(1);
    const content = await fixture.api.get(`/api/journeys/${fixture.journey.id}/stages/${view.stages[0].id}/content`);
    await expectOk(content, "Leitura do texto");
    expect(((await content.json()) as { body: string }).body).toContain("SELECT corrigido");
  } finally {
    await fixture.dispose();
  }
});
