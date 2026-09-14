import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /wallet-route-error\.spec\.ts/,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3004",
    channel: "chrome",
    headless: true,
  },
  webServer: [
    {
      command: "bun tests/e2e/wallet-api-fixture.ts",
      url: "http://localhost:5001/health",
      name: "Wallet API fixture",
      stdout: "pipe",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "NEXT_PUBLIC_API_URL=http://localhost:5001 NEXT_PUBLIC_ADMIN_DATA_SOURCE=api npm run dev -- --port 3004",
      url: "http://localhost:3004/login",
      stdout: "pipe",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
