import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /admin-security\.spec\.ts/,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3006",
    channel: "chrome",
    headless: true,
  },
  webServer: [
    {
      command: "bun tests/e2e/admin-security-api-fixture.ts",
      url: "http://localhost:5002/health",
      name: "Admin security API fixture",
      stdout: "pipe",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node scripts/run-with-env.mjs NEXT_PUBLIC_API_URL=http://localhost:5002 NEXT_PUBLIC_ADMIN_DATA_SOURCE=api -- npm run dev -- --port 3006",
      url: "http://localhost:3006/login",
      stdout: "pipe",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
