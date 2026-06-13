#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveServerUrl } from "../src/client/server-url.js";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const interactive = input.isTTY && output.isTTY;
const answers = interactive ? await askMissingArgs(args) : args;
const server = resolveServerUrl(answers);
const name = answers.name || "alice";
const team = answers.team || "red";
const mode = args.mode || args.ui || "split";

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

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      parsed[arg.slice(2)] = argv[index + 1] && !argv[index + 1].startsWith("--")
        ? argv[++index]
        : true;
    }
  }
  return parsed;
}

async function askMissingArgs(args) {
  if ((args.server || args.host) && args.name && args.team) {
    return args;
  }

  const rl = createInterface({ input, output });
  try {
    return {
      ...args,
      host: args.server || args.host || await ask(rl, "Server host or IP", "localhost"),
      name: args.name || await ask(rl, "Player name", "alice"),
      team: args.team || await askTeam(rl)
    };
  } finally {
    rl.close();
  }
}

async function ask(rl, label, fallback) {
  const answer = await rl.question(`${label} [${fallback}]: `);
  return answer.trim() || fallback;
}

async function askTeam(rl) {
  const answer = (await ask(rl, "Team red/blue", "red")).toLowerCase();
  return answer === "blue" ? "blue" : "red";
}
