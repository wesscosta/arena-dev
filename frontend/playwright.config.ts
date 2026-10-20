import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  // Retries collect a trace, but a test that only passes on retry fails CI.
  retries: process.env.CI ? 2 : 0,
  failOnFlakyTests: Boolean(process.env.CI),
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_FRONTEND_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  outputDir: "test-results",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
});
