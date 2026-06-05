import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 30_000 },
  reporter: "line",
  use: {
    baseURL: "http://localhost:3137",
    trace: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev -p 3137",
    url: "http://localhost:3137",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
