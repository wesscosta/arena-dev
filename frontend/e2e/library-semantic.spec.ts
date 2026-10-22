import {
  expect,
  request,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "./fixtures";

type ResourceView = {
  id: string;
  title: string;
  revision: number;
};

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApiBaseUrl = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

async function expectOk(response: APIResponse, operation: string) {
  if (!response.ok()) {
    throw new Error(`${operation} falhou (${response.status()}): ${await response.text()}`);
  }
}

async function authenticatedApi() {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const csrf = await api.get("/api/auth/csrf");
  await expectOk(csrf, "Token CSRF E2E");
  const { token } = (await csrf.json()) as { token: string };
  const headers = { "X-XSRF-TOKEN": token };
  const login = await api.post("/api/auth/login", {
    headers,
    data: { username: teacherUsername, password: teacherPassword },
  });
  await expectOk(login, "Login E2E");
  return { api, headers };
}

async function login(page: Page) {
  const csrf = await page.request.get(`${browserApiBaseUrl}/api/auth/csrf`);
  await expectOk(csrf, "Token CSRF navegador");
  const { token } = (await csrf.json()) as { token: string };
  const response = await page.request.post(`${browserApiBaseUrl}/api/auth/login`, {
    headers: { "X-XSRF-TOKEN": token },
    data: { username: teacherUsername, password: teacherPassword },
  });
  await expectOk(response, "Login navegador");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible({ timeout: 10_000 });
}

test.describe("Semantic Library v0.8", () => {
  let api: APIRequestContext;
  let headers: Record<string, string>;
  let resource: ResourceView;

  test.beforeAll(async () => {
    ({ api, headers } = await authenticatedApi());
    const suffix = Date.now().toString(36);
    const response = await api.post("/api/library/resources", {
      headers,
      data: {
        title: `SQL E2E ${suffix}`,
        summary: "Material semântico para validação E2E",
        body: [
          "# Banco de Dados",
          "",
          "## Consultas",
          "",
          "### SELECT",
          "",
          "Consulta dados.",
          "",
          "### WHERE",
          "",
          "Filtra linhas.",
        ].join("\n"),
        format: "MARKDOWN",
        sourceType: "MANUAL",
        subject: "Banco de Dados",
        tags: ["SQL", "SELECT", "WHERE"],
        language: "pt-BR",
      },
    });
    await expectOk(response, "Criação do material E2E");
    resource = (await response.json()) as ResourceView;
  });

  test.afterAll(async () => {
    if (resource?.id) {
      const response = await api.post(`/api/library/resources/${resource.id}/archive`, { headers });
      if (!response.ok() && response.status() !== 404) {
        throw new Error(
          `Limpeza do material falhou (${response.status()}): ${await response.text()}`,
        );
      }
    }
    await api?.dispose();
  });

  test("navigates Turmas → Biblioteca and renders metadata, structure and map from one resource", async ({
    page,
  }) => {
    await login(page);

    const nav = page.getByRole("navigation", { name: "Navegação global" });
    await expect(nav.getByRole("button", { name: "Turmas" })).toBeVisible();
    await nav.getByRole("button", { name: "Biblioteca" }).click();

    await expect(page.getByRole("heading", { name: "Seus materiais" })).toBeVisible();

    const search = page.getByPlaceholder("Buscar por título, descrição, assunto ou tag...");
    await search.fill(resource.title);

    const row = page.getByRole("button", { name: new RegExp(resource.title) });
    await expect(row).toContainText("Banco de Dados");
    await expect(row).toContainText("SQL");
    await row.click();

    await expect(page.getByRole("heading", { name: resource.title })).toBeVisible();
    await expect(page.getByText("Revisão 1")).toBeVisible();
    await expect(page.getByText("pt-BR")).toBeVisible();

    await page.getByRole("button", { name: "Estrutura" }).click();
    await expect(page.getByRole("region", { name: "Estrutura do conteúdo" })).toContainText(
      "Consultas",
    );
    await expect(page.getByRole("button", { name: /SELECT/ })).toBeVisible();

    await page.getByRole("button", { name: "Mapa" }).click();
    const map = page.getByRole("region", { name: "Mapa do conteúdo" });
    await expect(map).toContainText("Banco de Dados");
    await expect(map).toContainText("WHERE");

    // Small materials open fully; each branch collapses and reopens on its own.
    await map.getByRole("button", { name: "Recolher Consultas" }).click();
    await expect(map.getByRole("button", { name: /^SELECT/ })).toHaveCount(0);
    await map.getByRole("button", { name: /^Expandir Consultas/ }).click();
    await expect(map.getByRole("button", { name: "Recolher Consultas" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await map.getByRole("button", { name: /SELECT/ }).click();
    await expect(page.getByRole("button", { name: "Leitura" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: "SELECT" })).toBeVisible();
  });

  test("exposes review-first ingestion before materialization", async ({ page }) => {
    await login(page);
    await page
      .getByRole("navigation", { name: "Navegação global" })
      .getByRole("button", { name: "Biblioteca" })
      .click();

    await page.getByRole("button", { name: "Importar" }).click();
    await expect(page.getByRole("heading", { name: "Importar material" })).toBeVisible();

    await expect(page.getByRole("button", { name: /^Markdown\b/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Notion\b/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Arquivo\b/ })).toBeVisible();

    await page.getByLabel("Assunto").fill("Banco de Dados");
    await page.getByLabel("Tags").fill("SQL, SELECT");
    await page.getByLabel("Markdown").fill("# SQL\n\n## Consultas\n\n### SELECT\n\nConteúdo.");
    await page.getByRole("button", { name: "Analisar material" }).click();

    await expect(page.getByText("Estrutura analisada", { exact: true })).toBeVisible();
    await expect(page.getByText("Hierarquia H1–H6 preservada deterministicamente.")).toBeVisible();
    await expect(page.getByRole("button", { name: /SELECT/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Importar para a Biblioteca" })).toBeVisible();
  });

  test("keeps the Library usable on mobile and ultrawide without page overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await login(page);
    await page
      .getByRole("navigation", { name: "Navegação global" })
      .getByRole("button", { name: "Biblioteca" })
      .click();

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("heading", { name: "Seus materiais" })).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
          window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page.getByRole("button", { name: "Importar" })).toBeVisible();
    }
  });
});
