import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /(?:admin-canonical-click-flows|admin-shell|canonical-input-responsive|canonical-language-detail|member-route|payout-route|quest-route|report-route|wallet-route)\.spec\.ts/,
  fullyParallel: true,
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
    command: "node scripts/run-with-env.mjs NEXT_PUBLIC_API_URL=http://localhost:5000 NEXT_PUBLIC_ADMIN_DATA_SOURCE=mock -- npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
