import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /payout-live\.spec\.ts/,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3003",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command:
      "NEXT_PUBLIC_API_URL=http://localhost:5000 NEXT_PUBLIC_ADMIN_DATA_SOURCE=api npm run dev -- --port 3003",
    url: "http://localhost:3003/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
