import { runPlaywrightConfigs } from "./run-playwright-configs.mjs";

const requiredEnvironment = [
  "QUEST_E2E_ADMIN_EMAIL",
  "QUEST_E2E_ADMIN_PASSWORD",
  "LIVE_ADMIN_EMAIL",
  "LIVE_ADMIN_PASSWORD",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length) {
  console.error(`Missing live E2E environment variables: ${missingEnvironment.join(", ")}`);
  process.exit(1);
}

const configs = [
  "playwright.quest-api.config.ts",
  "playwright.activity-live.config.ts",
  "playwright.payout-live.config.ts",
  "playwright.wallet-live.config.ts",
];
const extraArgs = process.argv.slice(2);

process.exit(await runPlaywrightConfigs(configs, extraArgs));
