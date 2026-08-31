import { expect, request, test, type APIRequestContext, type APIResponse } from "@playwright/test";

type ClassroomView = { id: string; name: string };
type StudentView = { id: string; name: string; nickname: string | null };
type SessionView = { id: string; title: string };
type JoinCodeView = { code: string; expiresAt: string };

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "professor";
const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

async function expectOk(response: APIResponse, operation: string) {
  if (!response.ok()) {
    throw new Error(`${operation} falhou (${response.status()}): ${await response.text()}`);
  }
}

test("professor entra na Arena e participante reconecta à sessão", async ({ browser, page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const classroomName = `Turma E2E ${suffix}`;
  const studentName = `Aluno E2E ${suffix}`;
  const studentNickname = `E2E-${suffix.slice(-6)}`;
  const registration = `E2E-${suffix}`;
  const sessionTitle = `Sessão E2E ${suffix}`;

  const api: APIRequestContext = await request.newContext({ baseURL: apiBaseUrl });
  try {
    const login = await api.post("/api/auth/login", {
      data: { username: teacherUsername, password: teacherPassword },
    });
    await expectOk(login, "Login E2E");

    const classroomResponse = await api.post("/api/classrooms", {
      data: { name: classroomName, code: null },
    });
    await expectOk(classroomResponse, "Criação da turma E2E");
    const classroom = await classroomResponse.json() as ClassroomView;

    const studentResponse = await api.post("/api/students", {
      data: { registration, name: studentName, nickname: studentNickname },
    });
    await expectOk(studentResponse, "Criação do aluno E2E");
    const student = await studentResponse.json() as StudentView;

    const enrollment = await api.post(`/api/classrooms/${classroom.id}/students/${student.id}`);
    await expectOk(enrollment, "Matrícula E2E");

    const sessionResponse = await api.post("/api/sessions", {
      data: {
        classroomId: classroom.id,
        title: sessionTitle,
        presentStudentIds: [student.id],
      },
    });
    await expectOk(sessionResponse, "Criação da sessão E2E");
    const session = await sessionResponse.json() as SessionView;

    const joinCodeResponse = await api.get(`/api/sessions/${session.id}/join-code`);
    await expectOk(joinCodeResponse, "Código de entrada E2E");
    const joinCode = await joinCodeResponse.json() as JoinCodeView;

    await page.goto("/");
    await page.getByLabel("Usuário").fill(teacherUsername);
    await page.getByLabel("Senha").fill(teacherPassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
    await page.getByLabel("Selecionar turma atual").selectOption(classroom.id);
    await expect(page.getByLabel("Selecionar turma atual")).toHaveValue(classroom.id);
    await expect(page.locator("header.topbar").getByText("Sessão ativa", { exact: true })).toBeVisible();

    await page.locator("nav.nav-list").getByRole("button", { name: /Arena$/ }).click();
    await expect(page.locator("header.topbar").getByRole("heading", { name: "Arena", exact: true })).toBeVisible();
    await expect(page.getByText(sessionTitle, { exact: true })).toBeVisible();

    const participantContext = await browser.newContext();
    const participantPage = await participantContext.newPage();
    try {
      await participantPage.goto(`/join?code=${encodeURIComponent(joinCode.code)}`);
      await expect(participantPage.getByText(classroomName, { exact: true })).toBeVisible();
      await participantPage.getByPlaceholder("Matrícula ou nome completo").fill(registration);
      await participantPage.getByRole("button", { name: "Entrar na sessão" }).click();

      await expect(participantPage.getByRole("heading", { name: studentNickname })).toBeVisible();
      await expect(participantPage.getByText("Conectado", { exact: true })).toBeVisible();

      await participantPage.reload();
      await expect(participantPage.getByRole("heading", { name: studentNickname })).toBeVisible();
      await expect(participantPage.getByText("Conectado", { exact: true })).toBeVisible();
    } finally {
      await participantContext.close();
    }
  } finally {
    await api.dispose();
  }
});
