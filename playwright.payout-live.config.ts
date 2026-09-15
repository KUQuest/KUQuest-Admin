import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /payout-live\.spec\.ts/,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command:
      "node scripts/run-with-env.mjs NEXT_PUBLIC_API_URL=http://localhost:5000 NEXT_PUBLIC_ADMIN_DATA_SOURCE=api -- npm run dev -- --port 3000",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
