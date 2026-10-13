import { expect, test } from "@playwright/test";

const journey = [{
  id: "journey-fixture",
  title: "Fundamentos de lógica",
  description: "Condicionais e estruturas de repetição.",
  progress: { completedContents: 3, totalContents: 8, percent: 38 },
  currentContentId: "content-fixture",
  currentContentTitle: "Estruturas de repetição",
  started: true,
  lastStudiedAt: "2026-10-13T14:00:00",
  classroomId: "fixture-classroom",
  classroomName: "Turma piloto",
}];

test("Ramuvi v0.12: jornada exibe progresso real e acesso à Arena sem ranking", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("arena-dev-device:fixture-classroom", "token-e2e");
    localStorage.setItem("arena-dev-theme", "light");
  });
  await page.route("**/api/learn/journeys", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(journey) }));
  await page.route("**/api/learn/live", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{
      sessionId: "live-fixture", classroomId: "fixture-classroom",
      classroomName: "Turma piloto", sessionTitle: "Aula ao vivo",
      joinCode: "AABBCC", startedAt: "2026-10-13T14:00:00",
    }]) }));

  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Fundamentos de lógica" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Conteúdos concluídos nesta jornada" }))
    .toHaveAttribute("aria-valuenow", "38");
  await expect(page.getByText("3", { exact: true })).toBeVisible();
  await expect(page.getByText("5", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuar", exact: true }))
    .toHaveAttribute("href", "/learn/journeys/journey-fixture/content/content-fixture");
  await expect(page.getByRole("complementary", { name: "Aulas ao vivo disponíveis" }).getByRole("link", { name: /Entrar ao vivo/ }))
    .toHaveAttribute("href", "/learn/live");
  await expect(page.getByText(/ranking/i)).toHaveCount(0);

  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await expect(page.getByRole("heading", { name: "Fundamentos de lógica" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
  }
});
