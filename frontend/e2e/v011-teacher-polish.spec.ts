import { expect, request, test, type APIRequestContext, type APIResponse, type Page } from "./fixtures";

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApiBaseUrl = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

async function assertOk(response: APIResponse, action: string) {
  if (!response.ok()) throw new Error(`${action} retornou ${response.status()}: ${await response.text()}`);
}

async function login(page: Page) {
  const csrf = await page.request.get(`${browserApiBaseUrl}/api/auth/csrf`);
  await assertOk(csrf, "CSRF navegador");
  const { token } = await csrf.json() as { token: string };
  await assertOk(await page.request.post(`${browserApiBaseUrl}/api/auth/login`, {
    data: { username: teacherUsername, password: teacherPassword },
    headers: { "X-XSRF-TOKEN": token },
  }), "Login navegador");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();
}

test.describe("v0.11 — navegação acessível dos participantes e edição segura de turma", () => {
  let api: APIRequestContext;
  let csrfHeaders: Record<string, string>;
  let classroom: { id: string; name: string };
  let student: { id: string; name: string };

  test.beforeAll(async () => {
    api = await request.newContext({ baseURL: apiBaseUrl });
    const csrf = await api.get("/api/auth/csrf");
    await assertOk(csrf, "CSRF fixture");
    const { token } = await csrf.json() as { token: string };
    csrfHeaders = { "X-XSRF-TOKEN": token };
    await assertOk(await api.post("/api/auth/login", {
      data: { username: teacherUsername, password: teacherPassword }, headers: csrfHeaders,
    }), "Login fixture");
    const suffix = `v011-${Date.now()}`;
    const response = await api.post("/api/classrooms", {
      data: { name: `QA v0.11 ${suffix}`, code: suffix.slice(-10) },
      headers: csrfHeaders,
    });
    await assertOk(response, "Criar turma");
    classroom = await response.json() as typeof classroom;
    const studentResponse = await api.post("/api/students", {
      data: { registration: suffix, name: "Aluno QA Acessibilidade", nickname: "Aluno QA" },
      headers: csrfHeaders,
    });
    await assertOk(studentResponse, "Criar aluno");
    student = await studentResponse.json() as typeof student;
    await assertOk(await api.post(`/api/classrooms/${classroom.id}/students/${student.id}`, {
      headers: csrfHeaders,
    }), "Matricular");
  });

  test.afterAll(async () => {
    if (classroom?.id) {
      const removed = await api.delete(`/api/classrooms/${classroom.id}`, {
        data: { confirmationName: classroom.name }, headers: csrfHeaders,
      });
      await assertOk(removed, "Limpeza turma QA");
    }
    await api?.dispose();
  });

  async function openClassroom(page: Page) {
    await login(page);
    await page.getByRole("button", { name: `Abrir turma ${classroom.name}` }).click();
    await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
  }

  test("menu de ações tem foco, navegação por setas, Escape e fecha na busca", async ({ page }) => {
    await openClassroom(page);
    await page.locator(".classroom-section-tab").filter({ hasText: "Alunos" }).click();
    const trigger = page.getByRole("button", { name: `Mais ações para ${student.name}` });
    await expect(trigger).toBeVisible();
    await trigger.click();
    const menu = page.getByRole("menu", { name: `Ações para ${student.name}` });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Remover da turma" })).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "Apagar dados pessoais (LGPD)" })).toBeFocused();
    await page.keyboard.press("Home");
    await expect(menu.getByRole("menuitem", { name: "Remover da turma" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await expect(menu).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar participante" }).fill("inexistente");
    await expect(menu).toHaveCount(0);
    await expect(page.getByText("Nenhum participante encontrado")).toBeVisible();
  });

  test("configurações protegem contra descarte acidental e evitam salvar dados inalterados", async ({ page }) => {
    await openClassroom(page);
    await page.getByRole("button", { name: "Gerenciar turma" }).first().click();
    const name = page.getByLabel("Nome da turma");
    const save = page.getByRole("button", { name: "Salvar alterações" });
    const back = page.getByRole("button", { name: /Voltar para a turma/ });
    await expect(save).toBeDisabled();

    await name.fill("Rascunho que não deve ser salvo");
    await expect(save).toBeEnabled();
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("não salvas");
      await dialog.dismiss();
    });
    await back.click();
    await expect(name).toHaveValue("Rascunho que não deve ser salvo");

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("descartá-las");
      await dialog.accept();
    });
    await back.click();
    await expect(page.getByTestId("classroom-home-hero")).toBeVisible();
  });
});
