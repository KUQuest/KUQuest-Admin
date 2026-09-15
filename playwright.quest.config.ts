import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /quest-route\.spec\.ts/,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3002",
    channel: "chrome",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/run-with-env.mjs NEXT_DIST_DIR=.next-quest NEXT_PUBLIC_ADMIN_DATA_SOURCE=mock NEXT_PUBLIC_API_URL=http://localhost:5000 -- npm run dev -- --port 3002",
    url: "http://localhost:3002",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
