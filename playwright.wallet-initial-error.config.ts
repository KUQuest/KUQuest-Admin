import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /wallet-initial-error\.spec\.ts/,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3005",
    channel: "chrome",
    headless: true,
  },
  webServer: [
    {
      command: "node scripts/run-with-env.mjs WALLET_FIXTURE_INITIAL_ERROR=1 WALLET_ADMIN_ORIGIN=http://localhost:3005 -- bun tests/e2e/wallet-api-fixture.ts",
      url: "http://localhost:5001/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node scripts/run-with-env.mjs NEXT_PUBLIC_API_URL=http://localhost:5001 NEXT_PUBLIC_ADMIN_DATA_SOURCE=api -- npm run dev -- --port 3005",
      url: "http://localhost:3005/login",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
