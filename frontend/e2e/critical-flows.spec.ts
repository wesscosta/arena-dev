import { expect, request, test, type APIRequestContext, type APIResponse, type Browser, type Page } from "@playwright/test";

type ClassroomView = { id: string; name: string };
type StudentView = { id: string; name: string; nickname: string | null };
type SessionView = { id: string; title: string };
type JoinCodeView = { code: string; expiresAt: string };
type ActivityView = {
  id: string;
  questions: Array<{ id: string; statement: string }>;
};
type WordCloudState = { round: { id: string; prompt: string } | null };
type PollState = { round: { id: string; prompt: string } | null };
type SessionEventView = { eventType: string };

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
  const { token: csrfToken } = await csrfResponse.json() as { token: string };
  const csrfHeaders = { "X-XSRF-TOKEN": csrfToken };
  const login = await api.post("/api/auth/login", {
    data: { username: teacherUsername, password: teacherPassword },
    headers: csrfHeaders,
  });
  await expectOk(login, "Login E2E");
  return { api, csrfHeaders };
}

async function createSessionFixture(api: APIRequestContext, csrfHeaders: Record<string, string>, label: string) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const classroomName = `Turma ${label} ${suffix}`;
  const studentName = `Aluno ${label} ${suffix}`;
  const studentNickname = `${label}-${suffix.slice(-6)}`;
  const registration = `${label}-${suffix}`;
  const sessionTitle = `Sessão ${label} ${suffix}`;

  const classroomResponse = await api.post("/api/classrooms", {
    data: { name: classroomName, code: null },
    headers: csrfHeaders,
  });
  await expectOk(classroomResponse, "Criação da turma E2E");
  const classroom = await classroomResponse.json() as ClassroomView;

  const studentResponse = await api.post("/api/students", {
    data: { registration, name: studentName, nickname: studentNickname },
    headers: csrfHeaders,
  });
  await expectOk(studentResponse, "Criação do aluno E2E");
  const student = await studentResponse.json() as StudentView;

  const enrollment = await api.post(`/api/classrooms/${classroom.id}/students/${student.id}`, { headers: csrfHeaders });
  await expectOk(enrollment, "Matrícula E2E");

  const sessionResponse = await api.post("/api/sessions", {
    data: {
      classroomId: classroom.id,
      title: sessionTitle,
      presentStudentIds: [student.id],
    },
    headers: csrfHeaders,
  });
  await expectOk(sessionResponse, "Criação da sessão E2E");
  const session = await sessionResponse.json() as SessionView;

  const joinCodeResponse = await api.get(`/api/sessions/${session.id}/join-code`);
  await expectOk(joinCodeResponse, "Código de entrada E2E");
  const joinCode = await joinCodeResponse.json() as JoinCodeView;

  return {
    suffix,
    classroom,
    classroomName,
    student,
    studentName,
    studentNickname,
    registration,
    session,
    sessionTitle,
    joinCode,
  };
}

async function joinParticipant(page: Page, code: string, classroomName: string, registration: string, displayName: string) {
  await page.goto(`/join?code=${encodeURIComponent(code)}`);
  await expect(page.getByText(classroomName, { exact: true })).toBeVisible();
  await page.getByPlaceholder("Matrícula ou nome").fill(registration);
  await page.getByRole("button", { name: "Entrar na sessão" }).click();
  await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
  await expect(page.getByText("Conectado", { exact: true })).toBeVisible();
}

async function openProjector(browser: Browser, code: string, classroomName: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/projector?code=${encodeURIComponent(code)}`);
  await expect(page.getByText(classroomName, { exact: true })).toBeVisible();
  await expect(page.getByText("Modo Projetor", { exact: true })).toBeVisible();
  return { context, page };
}

test("professor entra na Arena e participante reconecta à sessão", async ({ browser, page }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  try {
    const fixture = await createSessionFixture(api, csrfHeaders, "E2E");

    await page.goto("/");
    await page.getByLabel("Usuário").fill(teacherUsername);
    await page.getByLabel("Senha").fill(teacherPassword);
    const [browserLogin] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/auth/login")),
      page.getByRole("button", { name: "Entrar", exact: true }).click(),
    ]);
    expect(browserLogin.status(), await browserLogin.text()).toBe(200);

    const classroomCard = page
      .locator("article.overview-class-card")
      .filter({ hasText: fixture.classroomName });
    await expect(classroomCard).toBeVisible();
    await classroomCard.click();
    await expect(page.getByRole("heading", { name: fixture.classroomName })).toBeVisible();
    await expect(page.getByTitle("Trocar turma")).toContainText(fixture.classroomName);
    await page.getByRole("button", { name: "Continuar Arena" }).click();
    await expect(page.getByText("Arena", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(fixture.sessionTitle, { exact: true })).toBeVisible();

    const participantContext = await browser.newContext();
    const participantPage = await participantContext.newPage();
    try {
      await joinParticipant(
        participantPage,
        fixture.joinCode.code,
        fixture.classroomName,
        fixture.registration,
        fixture.studentNickname,
      );

      await participantPage.reload();
      await expect(participantPage.getByRole("heading", { name: fixture.studentNickname })).toBeVisible();
      await expect(participantPage.getByText("Conectado", { exact: true })).toBeVisible();
    } finally {
      await participantContext.close();
    }
  } finally {
    await api.dispose();
  }
});

test("roteiro preparado sincroniza slide, questão, nuvem, votação e timeline", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  let projectorContext: Awaited<ReturnType<typeof openProjector>>["context"] | undefined;

  try {
    const fixture = await createSessionFixture(api, csrfHeaders, "FLOW");
    const slideTitle = `Slide FLOW ${fixture.suffix}`;
    const questionText = `Qual alternativa identifica o FLOW ${fixture.suffix}?`;
    const cloudPrompt = `Uma palavra para FLOW ${fixture.suffix}`;
    const cloudWord = `Contrato${fixture.suffix.slice(-6)}`;
    const pollPrompt = `O FLOW ${fixture.suffix} ficou claro?`;
    const pollYes = `Sim ${fixture.suffix.slice(-4)}`;
    const pollNo = `Não ${fixture.suffix.slice(-4)}`;

    const activityResponse = await api.post("/api/activities", {
      headers: csrfHeaders,
      data: {
        classroomId: fixture.classroom.id,
        title: `Atividade FLOW ${fixture.suffix}`,
        topic: "E2E",
        points: 100,
        onTimeBonus: 0,
        resource: { kind: "INTERNAL", platform: null, url: null },
        questions: [{
          id: null,
          type: "MULTIPLE_CHOICE",
          statement: questionText,
          difficulty: "EASY",
          points: 10,
          options: [
            { id: "a", text: "Alternativa A" },
            { id: "b", text: "Alternativa B" },
            { id: "c", text: "Alternativa C" },
            { id: "d", text: "Alternativa D" },
          ],
          answer: "a",
          expectedAnswer: null,
          explanation: null,
          code: null,
          language: null,
          expectedOutcome: null,
          evaluationCriteria: [],
        }],
      },
    });
    await expectOk(activityResponse, "Criação da atividade do Live Flow");
    const activity = await activityResponse.json() as ActivityView;
    const questionId = activity.questions[0]?.id;
    expect(questionId).toBeTruthy();

    const stepsResponse = await api.put(`/api/activities/${activity.id}/steps`, {
      headers: csrfHeaders,
      data: [
        {
          id: null,
          type: "SLIDE",
          title: slideTitle,
          instructions: null,
          questionId: null,
          slideContent: `# ${slideTitle}\n- integração ponta a ponta`,
          wordCloud: null,
          poll: null,
        },
        {
          id: null,
          type: "QUESTION",
          title: "Questão E2E",
          instructions: "Escolha mentalmente uma alternativa.",
          questionId,
          slideContent: null,
          wordCloud: null,
          poll: null,
        },
        {
          id: null,
          type: "WORD_CLOUD",
          title: "Nuvem E2E",
          instructions: null,
          questionId: null,
          slideContent: null,
          wordCloud: { prompt: cloudPrompt, maxWordsPerParticipant: 1, liveReveal: false },
          poll: null,
        },
        {
          id: null,
          type: "POLL",
          title: "Votação E2E",
          instructions: null,
          questionId: null,
          slideContent: null,
          wordCloud: null,
          poll: {
            prompt: pollPrompt,
            liveResults: false,
            options: [
              { id: "yes", text: pollYes },
              { id: "no", text: pollNo },
            ],
          },
        },
      ],
    });
    await expectOk(stepsResponse, "Persistência do roteiro E2E");

    const arenaResponse = await api.put(`/api/sessions/${fixture.session.id}/mechanics/arena`, {
      headers: csrfHeaders,
      data: { activityId: activity.id },
    });
    await expectOk(arenaResponse, "Seleção da atividade no Arena E2E");

    await joinParticipant(
      participantPage,
      fixture.joinCode.code,
      fixture.classroomName,
      fixture.registration,
      fixture.studentNickname,
    );
    const projector = await openProjector(browser, fixture.joinCode.code, fixture.classroomName);
    projectorContext = projector.context;

    const start = await api.post(`/api/sessions/${fixture.session.id}/mechanics/arena/flow/start`, { headers: csrfHeaders });
    await expectOk(start, "Início do Live Flow E2E");
    await expect(
      projector.page.getByRole("heading", { level: 1, name: slideTitle, exact: true }),
    ).toBeVisible();

    const question = await api.post(`/api/sessions/${fixture.session.id}/mechanics/arena/flow/next`, { headers: csrfHeaders });
    await expectOk(question, "Avanço para questão E2E");
    await expect(projector.page.getByText(questionText, { exact: true })).toBeVisible();
    await expect(participantPage.getByText(questionText, { exact: true })).toBeVisible();

    const cloud = await api.post(`/api/sessions/${fixture.session.id}/mechanics/arena/flow/next`, { headers: csrfHeaders });
    await expectOk(cloud, "Avanço para Nuvem E2E");
    await expect(participantPage.getByText(cloudPrompt, { exact: true })).toBeVisible();
    await expect(projector.page.getByText(cloudPrompt, { exact: true })).toBeVisible();
    await participantPage.getByPlaceholder("Sua palavra ou expressão").fill(cloudWord);
    await participantPage.getByRole("button", { name: "Enviar" }).click();
    await expect(participantPage.getByText(cloudWord, { exact: true })).toBeVisible();

    const cloudStateResponse = await api.get(`/api/sessions/${fixture.session.id}/word-cloud`);
    await expectOk(cloudStateResponse, "Leitura da Nuvem E2E");
    const cloudState = await cloudStateResponse.json() as WordCloudState;
    expect(cloudState.round?.id).toBeTruthy();
    const revealCloud = await api.post(`/api/sessions/${fixture.session.id}/word-cloud/${cloudState.round!.id}/reveal`, { headers: csrfHeaders });
    await expectOk(revealCloud, "Reveal da Nuvem E2E");
    await expect(projector.page.getByText(cloudWord, { exact: true })).toBeVisible();

    const poll = await api.post(`/api/sessions/${fixture.session.id}/mechanics/arena/flow/next`, { headers: csrfHeaders });
    await expectOk(poll, "Avanço para Poll E2E");
    await expect(participantPage.getByText(pollPrompt, { exact: true })).toBeVisible();
    await expect(projector.page.getByText(pollPrompt, { exact: true })).toBeVisible();
    await participantPage.getByRole("button", { name: new RegExp(pollYes) }).click();
    await expect(participantPage.getByText("Seu voto foi registrado. Você pode acompanhar o estado desta rodada aqui.")).toBeVisible();

    const pollStateResponse = await api.get(`/api/sessions/${fixture.session.id}/poll`);
    await expectOk(pollStateResponse, "Leitura da Poll E2E");
    const pollState = await pollStateResponse.json() as PollState;
    expect(pollState.round?.id).toBeTruthy();
    const revealPoll = await api.post(`/api/sessions/${fixture.session.id}/poll/${pollState.round!.id}/reveal`, { headers: csrfHeaders });
    await expectOk(revealPoll, "Reveal da Poll E2E");
    const winningPollOption = projector.page
      .getByText(`A. ${pollYes}`, { exact: true })
      .locator("..");
    await expect(winningPollOption).toContainText("100%");

    await projector.page.reload();
    await expect(projector.page.getByText(pollPrompt, { exact: true })).toBeVisible();
    await expect(winningPollOption).toContainText("100%");

    const eventsResponse = await api.get(`/api/sessions/${fixture.session.id}/events`);
    await expectOk(eventsResponse, "Timeline E2E");
    const events = await eventsResponse.json() as SessionEventView[];
    const eventTypes = events.map((event) => event.eventType);
    expect(eventTypes).toEqual(expect.arrayContaining([
      "SESSION_STARTED",
      "ARENA_SOURCE_SELECTED",
      "FLOW_STARTED",
      "FLOW_STEP_CHANGED",
      "WORD_CLOUD_OPENED",
      "WORD_CLOUD_REVEALED",
      "POLL_OPENED",
      "POLL_REVEALED",
    ]));
  } finally {
    if (projectorContext) await projectorContext.close();
    await participantContext.close();
    await api.dispose();
  }
});

test("Buzzer e Boss permanecem sincronizados entre participante e Projetor", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  let projectorContext: Awaited<ReturnType<typeof openProjector>>["context"] | undefined;

  try {
    const fixture = await createSessionFixture(api, csrfHeaders, "RUNTIME");
    await joinParticipant(
      participantPage,
      fixture.joinCode.code,
      fixture.classroomName,
      fixture.registration,
      fixture.studentNickname,
    );
    const projector = await openProjector(browser, fixture.joinCode.code, fixture.classroomName);
    projectorContext = projector.context;

    const openBuzzer = await api.post(`/api/sessions/${fixture.session.id}/buzzer/open`, { headers: csrfHeaders });
    await expectOk(openBuzzer, "Abertura do Buzzer E2E");
    await expect(participantPage.getByRole("heading", { name: "Valendo!" })).toBeVisible();
    await participantPage.getByRole("button", { name: "APERTAR" }).click();
    await expect(participantPage.getByRole("heading", { name: "Você é o 1º" })).toBeVisible();
    await expect(projector.page.getByText(fixture.studentNickname, { exact: true })).toBeVisible();

    const closeBuzzer = await api.post(`/api/sessions/${fixture.session.id}/buzzer/close`, { headers: csrfHeaders });
    await expectOk(closeBuzzer, "Fechamento do Buzzer E2E");

    const bossName = `Legacy Monolith ${fixture.suffix.slice(-6)}`;
    const startBoss = await api.post(`/api/sessions/${fixture.session.id}/mechanics/boss`, {
      headers: csrfHeaders,
      data: { name: bossName, maxHp: 10 },
    });
    await expectOk(startBoss, "Início do Boss E2E");
    await expect(projector.page.getByText(bossName, { exact: true })).toBeVisible();
    await expect(participantPage.getByText(bossName, { exact: true })).toBeVisible();
    await expect(projector.page.getByText("10 HP", { exact: true })).toBeVisible();

    const defeatBoss = await api.post(`/api/sessions/${fixture.session.id}/mechanics/boss/damage`, {
      headers: csrfHeaders,
      data: { amount: 10 },
    });
    await expectOk(defeatBoss, "Dano final do Boss E2E");
    await expect(projector.page.getByText(/BOSS DERROTADO/)).toBeVisible();
    await expect(participantPage.getByText(/BOSS DERROTADO/)).toBeVisible();
  } finally {
    if (projectorContext) await projectorContext.close();
    await participantContext.close();
    await api.dispose();
  }
});


test("Quiz completo preserva resposta no reconnect, revela no Projetor e gera ScoreEvent", async ({ browser }) => {
  const { api, csrfHeaders } = await authenticatedApi();
  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  let projectorContext: { close: () => Promise<void> } | undefined;

  try {
    const fixture = await createSessionFixture(api, csrfHeaders, "QUIZ");
    const questionText = `Qual alternativa fecha o Quiz E2E ${fixture.suffix}?`;
    const correctText = `Resposta correta ${fixture.suffix.slice(-5)}`;

    const activityResponse = await api.post("/api/activities", {
      headers: csrfHeaders,
      data: {
        classroomId: fixture.classroom.id,
        title: `Atividade Quiz E2E ${fixture.suffix}`,
        topic: "Quiz E2E",
        points: 100,
        onTimeBonus: 0,
        resource: { kind: "INTERNAL", platform: null, url: null },
        questions: [{
          id: null,
          type: "MULTIPLE_CHOICE",
          statement: questionText,
          difficulty: "EASY",
          points: 10,
          options: [
            { id: "a", text: correctText },
            { id: "b", text: `Distrator B ${fixture.suffix.slice(-4)}` },
            { id: "c", text: `Distrator C ${fixture.suffix.slice(-4)}` },
            { id: "d", text: `Distrator D ${fixture.suffix.slice(-4)}` },
          ],
          answer: "a",
          expectedAnswer: null,
          explanation: "A alternativa A é a resposta autorada para o gate E2E.",
          code: null,
          language: null,
          expectedOutcome: null,
          evaluationCriteria: [],
        }],
      },
    });
    await expectOk(activityResponse, "Criação da atividade Quiz E2E");
    const activity = await activityResponse.json() as ActivityView;
    const questionId = activity.questions[0]?.id;
    expect(questionId).toBeTruthy();

    const prepareResponse = await api.post(`/api/sessions/${fixture.session.id}/quiz`, {
      headers: csrfHeaders,
      data: { questionId },
    });
    await expectOk(prepareResponse, "Preparação do Quiz E2E");
    const prepared = await prepareResponse.json() as {
      round: { id: string; status: string } | null;
    };
    expect(prepared.round?.status).toBe("READY");
    const roundId = prepared.round?.id;
    expect(roundId).toBeTruthy();

    await joinParticipant(
      participantPage,
      fixture.joinCode.code,
      fixture.classroomName,
      fixture.registration,
      fixture.studentNickname,
    );

    const projector = await openProjector(
      browser,
      fixture.joinCode.code,
      fixture.classroomName,
    );
    projectorContext = projector.context;

    const openResponse = await api.post(
      `/api/sessions/${fixture.session.id}/quiz/${roundId}/open`,
      { headers: csrfHeaders },
    );
    await expectOk(openResponse, "Abertura do Quiz E2E");

    await expect(
      participantPage.getByRole("heading", { name: questionText }),
    ).toBeVisible();
    await expect(
      projector.page.getByRole("heading", { name: questionText }),
    ).toBeVisible();

    await expect(
      projector.page.getByText("Resultados protegidos", { exact: true }),
    ).toBeVisible();
    await expect(
      projector.page.getByText("RESPOSTA CORRETA", { exact: true }),
    ).toHaveCount(0);

    await participantPage.getByRole("button", { name: new RegExp(correctText) }).click();
    await expect(
      participantPage.getByText("Resposta registrada", { exact: true }),
    ).toBeVisible();

    // Reload exercises participant token restoration + authoritative runtime snapshot.
    await participantPage.reload();
    await expect(
      participantPage.getByRole("heading", { name: questionText }),
    ).toBeVisible();
    await expect(
      participantPage.getByText("Resposta registrada", { exact: true }),
    ).toBeVisible();

    const lockResponse = await api.post(
      `/api/sessions/${fixture.session.id}/quiz/${roundId}/lock`,
      { headers: csrfHeaders },
    );
    await expectOk(lockResponse, "Bloqueio/avaliação do Quiz E2E");

    const scoreResponse = await api.get(
      `/api/score-events?classroomId=${encodeURIComponent(fixture.classroom.id)}`,
    );
    await expectOk(scoreResponse, "Consulta de ScoreEvent do Quiz E2E");
    const scores = await scoreResponse.json() as Array<{
      studentId: string;
      points: number;
      source: string;
      questionId: string | null;
    }>;
    const quizScores = scores.filter(
      (score) => score.source === "QUIZ" && score.questionId === questionId,
    );
    expect(quizScores).toHaveLength(1);
    expect(quizScores[0]?.studentId).toBe(fixture.student.id);
    expect(quizScores[0]?.points).toBe(10);

    const revealResponse = await api.post(
      `/api/sessions/${fixture.session.id}/quiz/${roundId}/reveal`,
      { headers: csrfHeaders },
    );
    await expectOk(revealResponse, "Reveal do Quiz E2E");

    await expect(
      projector.page.getByText("RESPOSTA CORRETA", { exact: true }),
    ).toBeVisible();
    await expect(
      projector.page.getByText(correctText, { exact: true }),
    ).toBeVisible();

    // Snapshot REST/realtime must preserve revealed correction after reload.
    await projector.page.reload();
    await expect(
      projector.page.getByText("RESPOSTA CORRETA", { exact: true }),
    ).toBeVisible();
    await expect(
      projector.page.getByText(correctText, { exact: true }),
    ).toBeVisible();
  } finally {
    await projectorContext?.close();
    await participantContext.close();
    await api.dispose();
  }
});
