import { defineConfig } from "@playwright/test";

const adminOrigin = process.env.ADMIN_SECURITY_ADMIN_ORIGIN ?? "http://localhost:3006";
const apiPort = process.env.ADMIN_SECURITY_API_PORT ?? "5002";
const apiOrigin = `http://localhost:${apiPort}`;
const adminPort = new URL(adminOrigin).port;
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /admin-security\.spec\.ts/,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: adminOrigin,
    channel: "chrome",
    headless: true,
  },
  webServer: [
    {
      command: "bun tests/e2e/admin-security-api-fixture.ts",
      url: `${apiOrigin}/health`,
      name: "Admin security API fixture",
      stdout: "pipe",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `node scripts/run-with-env.mjs NEXT_DIST_DIR=.next-top-up-e2e NEXT_PUBLIC_API_URL=${apiOrigin} NEXT_PUBLIC_ADMIN_DATA_SOURCE=api -- npm run dev -- --port ${adminPort}`,
      url: `${adminOrigin}/login`,
      stdout: "pipe",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
