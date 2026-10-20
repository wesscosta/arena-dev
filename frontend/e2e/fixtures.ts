import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

export * from "@playwright/test";

/**
 * Responses the app handles on purpose (401 to a stale session, 404 to an
 * expired code, 409 to a conflict) still make the browser log "Failed to load
 * resource". They are asserted by the tests themselves, not by this guard.
 */
const EXPECTED_BROWSER_NOISE = [
  /Failed to load resource: the server responded with a status of 4\d\d/,
  // Only raised after a test calls context.setOffline(true); whether a request
  // is in flight at that moment depends on timing, so it is allowed everywhere.
  /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/,
];

type BrowserErrorOptions = {
  /**
   * Errors a test provokes on purpose (going offline, aborting a response,
   * probing the CSP). The test pushes the exact pattern it expects.
   */
  allowedBrowserErrors: RegExp[];
};

/**
 * Every test fails on an uncaught page error, a console error or a CSP
 * violation, in the default page and in contexts the test opens itself.
 * Without this, a broken script or a blocked request only shows up when a
 * later assertion happens to depend on it.
 */
export const test = base.extend<BrowserErrorOptions & { browserErrorGuard: void }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure.
  allowedBrowserErrors: async ({}, provide) => { await provide([]); },
  browserErrorGuard: [async ({ browser, context, allowedBrowserErrors }, provide) => {
    const errors: string[] = [];
    // Init scripts that seed localStorage also run on about:blank, where
    // storage access throws; only the app's own documents are guarded.
    const appPage = (page: Page) => page.url() !== "about:blank";
    const watchPage = (page: Page) => {
      page.on("pageerror", (error) => {
        if (appPage(page)) errors.push(`pageerror em ${page.url()}: ${error.message}`);
      });
      page.on("console", (message) => {
        if (message.type() === "error" && appPage(page)) errors.push(`console em ${page.url()}: ${message.text()}`);
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
      await provide();
    } finally {
      browser.newContext = newContext;
    }

    const unexpected = errors.filter((error) =>
      ![...EXPECTED_BROWSER_NOISE, ...allowedBrowserErrors].some((pattern) => pattern.test(error)));
    expect(unexpected, "erros do navegador durante o teste").toEqual([]);
  }, { auto: true }],
});
