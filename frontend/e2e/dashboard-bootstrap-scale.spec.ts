import { expect, test } from "@playwright/test";

type BootstrapResponse = {
  classrooms: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; classroomId: string; status: string; endedAt: string | null }>;
  sessionParticipants: Array<{ id: string; sessionId: string }>;
};

/** Non-destructive: exercises existing classes regardless of fixture count. The backend
 * DashboardBootstrapIT separately seeds 350 classes/340 active sessions in Testcontainers. */
test("Dashboard initializes from one batched snapshot, hydrates mechanics only on Arena entry", async ({ page }) => {
  test.setTimeout(90_000);
  const urls: string[] = [];
  const failures: string[] = [];
  page.on("request", (req) => { if (req.url().includes("/api/")) urls.push(req.url()); });
  page.on("requestfailed", (req) => { failures.push(`${req.url()}: ${req.failure()?.errorText}`); });

  await page.goto("/");
  await page.getByLabel("Usuário").fill(process.env.E2E_TEACHER_USERNAME ?? "professor");
  await page.getByLabel("Senha").fill(process.env.E2E_TEACHER_PASSWORD ?? "arena-dev-change-me");
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/dashboard/bootstrap") && response.request().method() === "GET",
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  const bootstrapResponse = await responsePromise;
  expect(bootstrapResponse.status()).toBe(200);
  const snapshot = (await bootstrapResponse.json()) as BootstrapResponse;
  await expect(page.getByRole("heading", { name: "Suas turmas" })).toBeVisible();
  await expect(page.locator("article.overview-class-card")).toHaveCount(snapshot.classrooms.length);
  expect(page.getByText("Backend indisponível")).toHaveCount(0);

  const initialCalls = [...urls];
  expect(initialCalls.filter((url) => url.endsWith("/api/dashboard/bootstrap"))).toHaveLength(1);
  expect(initialCalls.filter((url) => /\/api\/sessions\/[^/]+\/mechanics/.test(url))).toHaveLength(0);
  expect(initialCalls.filter((url) => /\/api\/classrooms\/[^/]+\/students/.test(url))).toHaveLength(0);
  expect(initialCalls.filter((url) => /\/api\/sessions\?classroomId=/.test(url))).toHaveLength(0);
  expect(failures.filter((value) => value.includes("ERR_INSUFFICIENT_RESOURCES"))).toEqual([]);

  const active = snapshot.sessions.find((session) => session.status === "ACTIVE" && !session.endedAt);
  if (!active) return;
  const classroom = snapshot.classrooms.find((item) => item.id === active.classroomId);
  expect(classroom).toBeDefined();
  await page.locator("article.overview-class-card").filter({ hasText: classroom!.name })
    .getByRole("button", { name: `Abrir turma ${classroom!.name}` }).click();
  await page.getByRole("button", { name: "Continuar Arena" }).click();
  await expect(page.locator("aside.arena-cockpit-nav")).toBeVisible();
  await expect.poll(() => urls.filter((url) => url.endsWith(`/api/sessions/${active.id}/mechanics`)).length)
    .toBe(1);
  expect(failures.filter((value) => value.includes("ERR_INSUFFICIENT_RESOURCES"))).toEqual([]);
});
