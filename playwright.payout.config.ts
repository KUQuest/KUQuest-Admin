import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /payout-route\.spec\.ts/,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3002",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "NEXT_PUBLIC_ADMIN_DATA_SOURCE=mock npm run dev -- --port 3002",
    url: "http://localhost:3002",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
