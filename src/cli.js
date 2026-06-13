#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [command = "help", ...args] = process.argv.slice(2);

const targets = {
  server: ["src/server/index.js", args],
  client: ["src/client/index.js", args],
  split: ["scripts/open-split-client.mjs", args],
  join: ["scripts/join-client.mjs", args],
  setup: ["scripts/setup.mjs", args]
};

if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

const target = targets[command];
if (!target) {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

const child = spawn(process.execPath, [path.join(root, target[0]), ...target[1]], {
  stdio: "inherit",
  cwd: root,
  env: {
    ...process.env,
    FILEFRONT_CONFIG_DIR: process.cwd()
  }
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

function printHelp() {
  console.log(`filefront-arena

Usage:
  filefront setup
  filefront server
  filefront join

Commands:
  setup    Create local config and install dependencies
  server   Start the match server
  join     Join using local config
`);
}
