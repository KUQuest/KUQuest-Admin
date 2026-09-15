import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /quest-route-api\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/run-with-env.mjs NEXT_DIST_DIR=.next-quest-api NEXT_PUBLIC_ADMIN_DATA_SOURCE=api NEXT_PUBLIC_API_URL=http://localhost:5000 -- npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
