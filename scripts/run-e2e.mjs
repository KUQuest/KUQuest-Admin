import { runPlaywrightConfigs } from "./run-playwright-configs.mjs";

const configs = [
  "playwright.config.ts",
  "playwright.admin-security.config.ts",
  "playwright.quest-api.config.ts",
  "playwright.activity-live.config.ts",
  "playwright.payout-live.config.ts",
  "playwright.wallet-live.config.ts",
  "playwright.wallet-error.config.ts",
  "playwright.wallet-initial-error.config.ts",
];
const extraArgs = process.argv.slice(2);

process.exit(await runPlaywrightConfigs(configs, extraArgs));
