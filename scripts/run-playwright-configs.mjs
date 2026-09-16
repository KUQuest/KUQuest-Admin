import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const playwrightCli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
let activeChild = null;
let receivedSignal = null;

function signalExitCode(signal) {
  return signal === "SIGTERM" ? 143 : 130;
}

function childProcessIds(rootPid) {
  if (process.platform === "win32") return [];
  try {
    const rows = execFileSync("ps", ["-eo", "pid=,ppid="], { encoding: "utf8" })
      .trim()
      .split("\n")
      .map((row) => row.trim().split(/\s+/).map(Number))
      .filter(([pid, ppid]) => Number.isInteger(pid) && Number.isInteger(ppid));
    const children = new Map();
    for (const [pid, ppid] of rows) {
      const siblings = children.get(ppid) ?? [];
      siblings.push(pid);
      children.set(ppid, siblings);
    }
    const descendants = [];
    const pending = [...(children.get(rootPid) ?? [])];
    while (pending.length) {
      const pid = pending.pop();
      descendants.push(pid);
      pending.push(...(children.get(pid) ?? []));
    }
    return descendants;
  } catch {
    return [];
  }
}

function terminateProcessTree(rootPid, signal) {
  if (!rootPid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(rootPid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // The process may already have exited.
    }
    return;
  }
  const descendants = childProcessIds(rootPid);
  try {
    process.kill(-rootPid, signal);
  } catch {
    try {
      process.kill(rootPid, signal);
    } catch {
      // The process may already have exited.
    }
  }
  for (const pid of descendants.reverse()) {
    try {
      process.kill(pid, signal);
    } catch {
      // The process may already have exited.
    }
  }
}

function terminateChild(signal) {
  if (!activeChild || activeChild.killed || activeChild.exitCode !== null) return;
  terminateProcessTree(activeChild.pid, signal);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    receivedSignal = signal;
    if (activeChild) terminateChild(signal);
    else process.exit(signalExitCode(signal));
  });
}

export async function runPlaywrightConfigs(configs, extraArgs = []) {
  for (const config of configs) {
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [playwrightCli, "test", `--config=${config}`, ...extraArgs], {
        detached: process.platform !== "win32",
        env: process.env,
        stdio: "inherit",
        shell: false,
      });
      activeChild = child;
      child.on("error", (error) => {
        if (activeChild === child) activeChild = null;
        reject(error);
      });
      child.on("exit", (exitCode, signal) => {
        if (receivedSignal) terminateProcessTree(child.pid, "SIGKILL");
        if (activeChild === child) activeChild = null;
        resolve(receivedSignal ? signalExitCode(receivedSignal) : exitCode ?? (signal ? 1 : 0));
      });
    });

    if (code !== 0) return code;
  }

  return 0;
}
