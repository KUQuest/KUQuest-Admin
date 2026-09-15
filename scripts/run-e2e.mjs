import { spawn } from "node:child_process";

const playwright = process.platform === "win32" ? "npx.cmd" : "npx";
const configs = [
  "playwright.config.ts",
  "playwright.admin-security.config.ts",
  "playwright.quest-api.config.ts",
  "playwright.payout-live.config.ts",
  "playwright.wallet-live.config.ts",
  "playwright.wallet-error.config.ts",
  "playwright.wallet-initial-error.config.ts",
];
const extraArgs = process.argv.slice(2);

function run(config) {
  return new Promise((resolve, reject) => {
    const child = spawn(playwright, ["playwright", "test", `--config=${config}`, ...extraArgs], {
      env: process.env,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

for (const config of configs) {
  const code = await run(config);
  if (code !== 0) process.exit(code);
}
