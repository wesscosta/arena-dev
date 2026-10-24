import { expect, request, test, type APIResponse } from "./fixtures";

/**
 * v0.11 / 11.6 — isolation-only release regression.
 * Creates synthetic classroom/student/Journey through the backend running in CI.
 * Never run this test against a classroom with real student data.
 */
const apiBase = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const browserApi = process.env.E2E_BROWSER_API_URL ?? "http://localhost:8080";
const username = process.env.E2E_TEACHER_USERNAME ?? "professor";
const password = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

async function ok(response: APIResponse, label: string) {
  expect(response.ok(), label + " (" + response.status() + "): " + await response.text()).toBe(true);
}

type StudentProjection = {
  releasedChapterCount: number | null;
  progress: { completedContents: number };
  modules: Array<{ title: string; contents: Array<{ id: string; state: string }> }>;
};

test("v0.11 / 11.6 — professor libera capítulos inteiros sem expor conteúdo bloqueado nem apagar progresso", async ({ page }) => {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const api = await request.newContext({ baseURL: apiBase });
  const studentApi = await request.newContext({ baseURL: apiBase });
  let classroomId: string | undefined;
  let teacherHeaders: Record<string, string> | undefined;

  try {
    const csrf = await api.get("/api/auth/csrf");
    await ok(csrf, "CSRF docente");
    teacherHeaders = { "X-XSRF-TOKEN": ((await csrf.json()) as { token: string }).token };
    await ok(await api.post("/api/auth/login", {
      data: { username, password }, headers: teacherHeaders,
    }), "Login docente");

    const classroomResult = await api.post("/api/classrooms", {
      headers: teacherHeaders, data: { name: "Turma gradual " + suffix, code: "G" + suffix.slice(-7) },
    });
    await ok(classroomResult, "Criar turma");
    classroomId = ((await classroomResult.json()) as { id: string }).id;

    const registration = "GATE-" + suffix;
    const studentResult = await api.post("/api/students", {
      headers: teacherHeaders, data: { registration, name: "Aluno gradual " + suffix },
    });
    await ok(studentResult, "Criar aluno sintético");
    const studentId = ((await studentResult.json()) as { id: string }).id;
    await ok(await api.post("/api/classrooms/" + classroomId + "/students/" + studentId, {
      headers: teacherHeaders,
    }), "Matricular aluno");

    const resources: string[] = [];
    for (let index = 1; index <= 3; index++) {
      const response = await api.post("/api/library/resources", {
        headers: teacherHeaders,
        data: { title: "Material " + index + " " + suffix, body: "# Conteúdo " + index,
          sourceType: "MANUAL", format: "MARKDOWN" },
      });
      await ok(response, "Criar material " + index);
      resources.push(((await response.json()) as { id: string }).id);
    }
    const created = await api.post("/api/journeys", {
      headers: teacherHeaders,
      data: { classroomId, title: "Jornada gradual " + suffix, stages: [
        { title: "Introdução", sectionTitle: "Capítulo inicial", unlockRule: "IMMEDIATE",
          completionRule: "MANUAL", itemType: "CONTENT", learningResourceId: resources[0] },
        { title: "Exemplo", sectionTitle: "Capítulo inicial", unlockRule: "PREVIOUS_STAGE_COMPLETED",
          completionRule: "MANUAL", itemType: "CONTENT", learningResourceId: resources[1] },
        { title: "Avançado", sectionTitle: "Capítulo seguinte", unlockRule: "PREVIOUS_STAGE_COMPLETED",
          completionRule: "MANUAL", itemType: "CONTENT", learningResourceId: resources[2] },
      ] },
    });
    await ok(created, "Criar Jornada");
    const journey = (await created.json()) as { id: string; stages: Array<{ id: string }> };
    await ok(await api.post("/api/journeys/" + journey.id + "/publish", { headers: teacherHeaders }), "Publicar Jornada");
    const codeResult = await api.post("/api/journeys/" + journey.id + "/redemption/enable", { headers: teacherHeaders });
    await ok(codeResult, "Gerar código");
    const { code } = (await codeResult.json()) as { code: string };
    const bootstrap = await studentApi.post("/api/learn/journeys/redeem/bootstrap", {
      data: { code, identity: registration },
    });
    await ok(bootstrap, "Resgate sintético");
    const { deviceToken } = (await bootstrap.json()) as { deviceToken: string };
    const studentHeaders = { "X-Study-Token": deviceToken };
    const projection = async () => {
      const response = await studentApi.get("/api/learn/journeys/" + journey.id, { headers: studentHeaders });
      await ok(response, "Ler projeção do aluno");
      return (await response.json()) as StudentProjection;
    };

    const initial = await projection();
    expect(initial.releasedChapterCount).toBeNull();
    expect(initial.modules.map(module => module.contents.map(content => content.state)))
      .toEqual([["CURRENT", "LOCKED"], ["LOCKED"]]);

    // Teacher uses the actual interface, not only the API.
    const browserCsrf = await page.request.get(browserApi + "/api/auth/csrf");
    await ok(browserCsrf, "CSRF navegador");
    const browserToken = ((await browserCsrf.json()) as { token: string }).token;
    await ok(await page.request.post(browserApi + "/api/auth/login", {
      data: { username, password }, headers: { "X-XSRF-TOKEN": browserToken },
    }), "Login navegador");
    await page.goto("/?tela=turma&turma=" + classroomId + "&aba=jornadas");
    const catalog = page.getByRole("complementary", { name: "Jornadas da turma" });
    await catalog.getByRole("button", { name: new RegExp("Jornada gradual " + suffix) }).click();
    await expect(page.getByText("Liberação gradual", { exact: true })).toBeVisible();
    await page.getByLabel("Modo de liberação").selectOption("teacher");
    await page.getByLabel("Liberar os primeiros").fill("1");
    page.once("dialog", async dialog => dialog.accept());
    await page.getByRole("button", { name: "Aplicar liberação" }).click();
    await expect(page.getByTestId("toast").getByText("Primeiro capítulo liberado para a turma.")).toBeVisible();

    const limited = await projection();
    expect(limited.releasedChapterCount).toBe(1);
    expect(limited.modules.map(module => module.contents.map(content => content.state)))
      .toEqual([["CURRENT", "AVAILABLE"], ["LOCKED"]]);
    const blocked = await studentApi.get("/api/learn/journeys/" + journey.id +
      "/contents/" + journey.stages[2].id, { headers: studentHeaders });
    expect(blocked.status()).toBe(409);
    expect((await blocked.text())).not.toContain("Conteúdo 3");

    const releaseTwo = await api.patch("/api/journeys/" + journey.id + "/release", {
      data: { releasedChapterCount: 2 }, headers: teacherHeaders,
    });
    await ok(releaseTwo, "Abrir segundo capítulo");
    const available = await studentApi.get("/api/learn/journeys/" + journey.id +
      "/contents/" + journey.stages[2].id, { headers: studentHeaders });
    await ok(available, "Conteúdo liberado");
    expect((await available.json()) as { body: string }).toHaveProperty("body", "# Conteúdo 3");

    await ok(await studentApi.post("/api/learn/journeys/" + journey.id + "/contents/" +
      journey.stages[2].id + "/complete", { headers: studentHeaders }), "Concluir conteúdo");
    await ok(await api.patch("/api/journeys/" + journey.id + "/release", {
      data: { releasedChapterCount: 1 }, headers: teacherHeaders,
    }), "Bloquear novamente");
    expect((await projection()).progress.completedContents).toBe(1);
    expect((await projection()).modules[1].contents[0].state).toBe("LOCKED");
    await ok(await api.patch("/api/journeys/" + journey.id + "/release", {
      data: { releasedChapterCount: 2 }, headers: teacherHeaders,
    }), "Restaurar acesso");
    expect((await projection()).modules[1].contents[0].state).toBe("COMPLETED");
  } finally {
    if (classroomId && teacherHeaders) {
      await api.delete("/api/classrooms/" + classroomId, {
        headers: teacherHeaders, data: { confirmationName: "Turma gradual " + suffix },
      }).catch(() => undefined);
    }
    await studentApi.dispose();
    await api.dispose();
  }
});
