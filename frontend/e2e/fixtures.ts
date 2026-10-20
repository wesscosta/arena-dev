import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

export * from "@playwright/test";

/**
 * Responses the app handles on purpose (401 to a stale session, 404 to an
 * expired code, 409 to a conflict) still make the browser log "Failed to load
 * resource". They are asserted by the tests themselves, not by this guard.
 */
const EXPECTED_BROWSER_NOISE = [/Failed to load resource: the server responded with a status of 4\d\d/];

type BrowserErrorOptions = {
  /** Per-test allowance for errors a test provokes on purpose (e.g. going offline). */
  allowedBrowserErrors: RegExp[];
};

/**
 * Every test fails on an uncaught page error, a console error or a CSP
 * violation, in the default page and in contexts the test opens itself.
 * Without this, a broken script or a blocked request only shows up when a
 * later assertion happens to depend on it.
 */
export const test = base.extend<BrowserErrorOptions & { browserErrorGuard: void }>({
  allowedBrowserErrors: [[], { option: true }],
  browserErrorGuard: [async ({ browser, context, allowedBrowserErrors }, use) => {
    const errors: string[] = [];
    const watchPage = (page: Page) => {
      page.on("pageerror", (error) => errors.push(`pageerror em ${page.url()}: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console em ${page.url()}: ${message.text()}`);
      });
    };
    const watchContext = async (target: BrowserContext) => {
      await target.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
          console.error(`CSP violation: ${event.violatedDirective} bloqueou ${event.blockedURI}`);
        });
      });
      target.pages().forEach(watchPage);
      target.on("page", watchPage);
    };

    await watchContext(context);
    // Tests open extra contexts for students and projectors; watch those too.
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...args: Parameters<typeof newContext>) => {
      const created = await newContext(...args);
      await watchContext(created);
      return created;
    };
    try {
      await use();
    } finally {
      browser.newContext = newContext;
    }

    const unexpected = errors.filter((error) =>
      ![...EXPECTED_BROWSER_NOISE, ...allowedBrowserErrors].some((pattern) => pattern.test(error)));
    expect(unexpected, "erros do navegador durante o teste").toEqual([]);
  }, { auto: true }],
});
