import { spawn } from "node:child_process";

const separator = process.argv.indexOf("--");
if (separator < 1 || separator === process.argv.length - 1) {
  console.error("Usage: node scripts/run-with-env.mjs NAME=value ... -- command [args...]");
  process.exit(2);
}

const environment = { ...process.env };
for (const assignment of process.argv.slice(2, separator)) {
  const splitAt = assignment.indexOf("=");
  if (splitAt < 1) {
    console.error(`Invalid environment assignment: ${assignment}`);
    process.exit(2);
  }
  environment[assignment.slice(0, splitAt)] = assignment.slice(splitAt + 1);
}

const [command, ...args] = process.argv.slice(separator + 1);
const child = spawn(command, args, {
  env: environment,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
