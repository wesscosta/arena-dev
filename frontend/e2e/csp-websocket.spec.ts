import { expect, test, type Page } from "./fixtures";

// The "v0.11 / 11.6" prefix keeps this test in the WebKit CI run.
async function socketViolation(page: Page, url: string) {
  return page.evaluate(async (target) => {
    const violation = new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 2_000);
      document.addEventListener("securitypolicyviolation", (event) => {
        clearTimeout(timer);
        resolve(event.effectiveDirective || event.violatedDirective);
      }, { once: true });
    });
    try {
      const socket = new WebSocket(target);
      socket.onerror = () => undefined;
      setTimeout(() => socket.close(), 1_500);
    } catch {
      // Some engines throw synchronously; the violation event still fires.
    }
    return violation;
  }, url);
}

test("v0.11 / 11.6 rc.3 CSP: WebSockets only to the serving host", async ({ page, allowedBrowserErrors }) => {
  // The blocked exfiltration socket is what this test proves.
  allowedBrowserErrors.push(/exfiltration\.example\.invalid/);
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";
  const host = new URL(page.url()).host;
  const connect = policy.split(";").map((item) => item.trim()).find((item) => item.startsWith("connect-src")) ?? "";
  expect(connect).toContain(`ws://${host}`);
  expect(connect).toContain(`wss://${host}`);
  expect(connect.split(/\s+/)).not.toContain("wss:");

  expect(await socketViolation(page, "wss://exfiltration.example.invalid/ws")).toMatch(/connect-src/);
  const sameHost = `${new URL(page.url()).protocol === "https:" ? "wss" : "ws"}://${host}/ws/sessions/csp-check`;
  expect(await socketViolation(page, sameHost)).toBeNull();
});
