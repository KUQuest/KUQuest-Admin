import { runPlaywrightConfigs } from "./run-playwright-configs.mjs";

// Each config starts its own servers, so do not start one whose only test will skip.
const hasQuestCredentials = process.env.QUEST_E2E_ADMIN_EMAIL && process.env.QUEST_E2E_ADMIN_PASSWORD;
const hasLiveCredentials = process.env.LIVE_ADMIN_EMAIL && process.env.LIVE_ADMIN_PASSWORD;

const configs = [
  "playwright.config.ts",
  ...(hasQuestCredentials ? ["playwright.quest-api.config.ts"] : []),
  ...(hasLiveCredentials
    ? [
        "playwright.activity-live.config.ts",
        "playwright.payout-live.config.ts",
        "playwright.wallet-live.config.ts",
      ]
    : []),
  "playwright.wallet-error.config.ts",
  "playwright.wallet-initial-error.config.ts",
];
const extraArgs = process.argv.slice(2);

process.exit(await runPlaywrightConfigs(configs, extraArgs));
