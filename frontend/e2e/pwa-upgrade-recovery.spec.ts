import { expect, request, test } from "@playwright/test";

const apiBaseUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";
const username = process.env.E2E_TEACHER_USERNAME ?? "professor";
const password = process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me";

test("PWA instala shell seguro; offline não reutiliza HTML antigo nem dados da API", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await page.goto("/join");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const current = await page.evaluate(async () => {
      const cache = await caches.open("arena-dev-shell-v0.8-join-fix-1");
      await cache.put("/join", new Response("UNSAFE_OLD_JOIN_HTML"));
      const oldDomainCache = await caches.open("legacy-domain-state");
      await oldDomainCache.put("/api/auth/session", new Response("STALE_AUTH_STATE"));
      const worker = navigator.serviceWorker.controller;
      const version = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Sem versão do worker")), 3000);
        const handler = (event: MessageEvent) => {
          if (event.data?.type !== "ARENA_PWA_VERSION") return;
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener("message", handler);
          resolve(event.data.version);
        };
        navigator.serviceWorker.addEventListener("message", handler);
        worker?.postMessage({ type: "ARENA_PWA_GET_VERSION" });
      });
      return version;
    });
    expect(current).toMatch(/^v0\.10-pwa-gate-/);

    await context.setOffline(true);
    await page.goto("/join?code=OFFLINE");
    await expect(page.getByRole("heading", { name: "Arena Dev está sem conexão" })).toBeVisible();
    await expect(page.getByText("UNSAFE_OLD_JOIN_HTML")).toHaveCount(0);
    const status = await page.evaluate(async () => {
      try { const response = await fetch("/api/auth/session"); return `CACHE_OR_NETWORK_${response.status}`; }
      catch { return "NETWORK_UNAVAILABLE"; }
    });
    expect(status).toBe("NETWORK_UNAVAILABLE");
    await context.setOffline(false);
    await page.goto("/join");
    await expect(page.getByRole("heading", { name: "Código de acesso" })).toBeVisible();
  } finally { await context.close(); }
});

test("participante reconecta após perda de rede sem criar nova presença ou novo XP", async ({ browser }) => {
  const api = await request.newContext({ baseURL: apiBaseUrl });
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    const csrf = await api.get("/api/auth/csrf");
    expect(csrf.ok()).toBeTruthy();
    const { token } = (await csrf.json()) as { token: string };
    const headers = { "X-XSRF-TOKEN": token };
    const login = await api.post("/api/auth/login", { data: { username, password }, headers });
    expect(login.ok()).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const classroom = await api.post("/api/classrooms", { data: { name: `Turma PWA ${suffix}` }, headers });
    expect(classroom.ok()).toBeTruthy();
    const { id: classroomId } = (await classroom.json()) as { id: string };
    const registration = `PWA-${suffix}`;
    const student = await api.post("/api/students", {
      data: { registration, name: `Participante PWA ${suffix}`, nickname: `PWA ${suffix.slice(-6)}` }, headers,
    });
    expect(student.ok()).toBeTruthy();
    const { id: studentId } = (await student.json()) as { id: string };
    const enrollment = await api.post(`/api/classrooms/${classroomId}/students/${studentId}`, { headers });
    expect(enrollment.ok()).toBeTruthy();
    const session = await api.post("/api/sessions", {
      data: { classroomId, title: `Aula PWA ${suffix}`, presentStudentIds: [studentId] }, headers,
    });
    expect(session.ok()).toBeTruthy();
    const { id: sessionId } = (await session.json()) as { id: string };
    const codeResponse = await api.get(`/api/sessions/${sessionId}/join-code`);
    expect(codeResponse.ok()).toBeTruthy();
    const { code } = (await codeResponse.json()) as { code: string };
    await page.goto(`/join?code=${code}`);
    await expect(page.getByPlaceholder("Matrícula ou nome")).toBeVisible();
    await page.getByPlaceholder("Matrícula ou nome").fill(registration);
    await page.getByRole("button", { name: "Entrar na sessão" }).click();
    await expect(page.getByText("Conectado", { exact: true })).toBeVisible({ timeout: 12000 });
    const before = await api.get(`/api/sessions/${sessionId}/participants`);
    expect(before.ok()).toBeTruthy();
    const beforeCount = ((await before.json()) as unknown[]).length;

    await context.setOffline(true);
    await expect(page.getByText("Sem internet")).toBeVisible();
    await expect(page.getByText("Conectado", { exact: true })).toHaveCount(0);
    await context.setOffline(false);
    await expect(page.getByText("Conectado", { exact: true })).toBeVisible({ timeout: 18000 });
    const after = await api.get(`/api/sessions/${sessionId}/participants`);
    expect(after.ok()).toBeTruthy();
    expect(((await after.json()) as unknown[]).length).toBe(beforeCount);
    const events = await api.get(`/api/score-events?classroomId=${classroomId}`);
    expect(events.ok()).toBeTruthy();
    expect((await events.json()) as unknown[]).toHaveLength(0);
  } finally { await context.close(); await api.dispose(); }
});

test("PWA atualiza controlador sem recarregar resposta não enviada e descarta cache v0.9", async ({ browser }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await page.goto("/join");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const input = page.getByRole("textbox", { name: "Código da sessão" });
    await input.fill("RASCUNHO");
    await page.evaluate(async () => {
      const oldShell = await caches.open("arena-dev-shell-v0.9.0");
      await oldShell.put("/join", new Response("HTML_ANTIGO_PRIVADO"));
      const oldStatic = await caches.open("arena-dev-static-v0.9.0");
      await oldStatic.put("/_next/static/old-script.js", new Response("OLD_JS_BUNDLE"));
      // A new same-origin SW script URL forces activation, simulating an
      // installed older worker being replaced without relying on a hosted v0.9.
      await Promise.race([
        navigator.serviceWorker.register("/sw.js?upgrade-e2e=1", { scope: "/", updateViaCache: "none" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Service worker upgrade registration timed out")), 10000)),
      ]);
    });
    await expect(page.getByRole("status", { name: "Atualização da Arena Dev" })).toBeVisible();
    await expect(input).toHaveValue("RASCUNHO");
    // controllerchange fires during activation, whereas cache eviction runs
    // asynchronously in activate.waitUntil. Wait for the authoritative result.
    await expect.poll(async () => page.evaluate(async () => {
      const remaining = await caches.keys();
      return remaining.includes("arena-dev-shell-v0.9.0")
        || remaining.includes("arena-dev-static-v0.9.0");
    }), { timeout: 10_000 }).toBe(false);
    await page.getByRole("button", { name: "Depois" }).click();
    await expect(input).toHaveValue("RASCUNHO");
    await context.setOffline(true);
    await page.goto("/join?code=NO_NETWORK");
    await expect(page.getByRole("heading", { name: "Arena Dev está sem conexão" })).toBeVisible();
    await expect(page.getByText("HTML_ANTIGO_PRIVADO")).toHaveCount(0);
    await context.setOffline(false);
    await page.goto("/join");
    await expect(page.getByRole("heading", { name: "Código de acesso" })).toBeVisible();
  } finally { await context.close(); }
});
