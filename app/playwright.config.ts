import { defineConfig, devices } from "@playwright/test"
import { e2eEnv } from "./e2e/helpers/env"

const baseURL = e2eEnv.baseUrl

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    navigationTimeout: 120_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "smoke",
      testMatch: /smoke\.public\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "purchase",
      testMatch: /purchase\.flow\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
      timeout: 90_000,
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "admin",
      testMatch: /admin\.(purchases|change-password)\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Pixel 5"], storageState: e2eEnv.adminStoragePath },
    },
    {
      name: "verifier",
      testMatch: /verifier\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: `pnpm exec vite dev --port ${e2eEnv.port} --host 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    wait: {
      stdout: /Local:\s+http:\/\/127\.0\.0\.1:\d+/,
    },
    env: {
      ...process.env,
      NODE_ENV: "development",
      DATABASE_URL: process.env.DATABASE_URL ?? e2eEnv.databaseUrl,
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? "e2e-dev-secret-minimum-32-characters",
      BETTER_AUTH_URL: baseURL,
      APP_URL: baseURL,
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "noop",
    },
  },
})
