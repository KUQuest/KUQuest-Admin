import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /wallet-route\.spec\.ts/,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3003",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "node scripts/run-with-env.mjs NEXT_PUBLIC_ADMIN_DATA_SOURCE=mock -- npm run dev -- --port 3003",
    url: "http://localhost:3003",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
