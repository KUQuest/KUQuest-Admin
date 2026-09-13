import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /admin-shell\.spec\.ts/,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "NEXT_PUBLIC_ADMIN_DATA_SOURCE=mock npm run dev -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
