#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveServerUrl } from "../src/client/server-url.js";
import { applyArgOverrides, parseArgs, readLocalConfig } from "../src/config/local-config.js";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localConfig = readLocalConfig(projectRoot);
const mergedConfig = applyArgOverrides(localConfig, args);
const answers = mergedConfig;
const server = resolveServerUrl(answers.network.client);
const name = answers.game.name || "alice";
const team = answers.game.team || "red";
const mode = answers.game.mode || "split";

if (mode === "split") {
  runNode(["scripts/open-split-client.mjs", "--server", server, "--name", name, "--team", team]);
} else if (mode === "native") {
  runNode(["src/client/index.js", "--server", server, "--name", name, "--team", team, "--ui", "native"]);
} else if (mode === "info") {
  runNode(["src/client/index.js", "--server", server, "--name", `${name}-info`, "--team", team, "--ui", "monitor", "--watch"]);
} else if (mode === "ops") {
  runNode(["src/client/index.js", "--server", server, "--name", `${name}-ops`, "--team", team, "--ui", "monitor", "--ops"]);
} else {
  console.error(`unknown join mode: ${mode}`);
  console.error("use --mode split, native, info, or ops");
  process.exit(1);
}

function runNode(argv) {
  const child = spawn(process.execPath, argv, {
    stdio: "inherit",
    cwd: projectRoot
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}
