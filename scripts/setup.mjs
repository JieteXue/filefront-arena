#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOCAL_CONFIG,
  LOCAL_CONFIG_FILE,
  localConfigPath,
  mergeConfig,
  parseArgs,
  readLocalConfig,
  writeLocalConfig
} from "../src/config/local-config.js";
import { npmCommand } from "../src/npm-command.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const npm = npmCommand();

printHeader();
checkNodeVersion();
checkCommand(npm, ["--version"], "npm is required. Install Node.js 20+ from https://nodejs.org/", "npm");
installDependencies();
const config = args["no-config"] ? mergeConfig(DEFAULT_LOCAL_CONFIG, readLocalConfig(projectRoot)) : await configureLocalSettings();
printNextSteps();

function printHeader() {
  console.log("filefront-arena setup");
  console.log(`project: ${projectRoot}`);
  console.log("");
}

function checkNodeVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (major < 20) {
    console.error(`Node.js 20+ is required. Current version: ${process.version}`);
    process.exit(1);
  }
  console.log(`OK Node.js ${process.version}`);
}

function checkCommand(command, commandArgs, errorMessage, displayName = command) {
  const result = spawnSync(command, commandArgs, {
    cwd: projectRoot,
    encoding: "utf8"
  });

  if (result.error || result.status !== 0) {
    console.error(errorMessage);
    process.exit(1);
  }

  console.log(`OK ${displayName} ${String(result.stdout).trim()}`);
}

function installDependencies() {
  console.log("");
  console.log("Installing dependencies...");
  const commandArgs = args.ci ? ["ci"] : ["install"];
  const result = spawnSync(npm, commandArgs, {
    cwd: projectRoot,
    stdio: "inherit"
  });

  if (result.error || result.status !== 0) {
    console.error("npm install failed. Check your network access to the npm registry, then run setup again.");
    process.exit(result.status || 1);
  }
}

async function configureLocalSettings() {
  const isFirstSetup = !fs.existsSync(localConfigPath(projectRoot));
  const existing = mergeConfig(DEFAULT_LOCAL_CONFIG, readLocalConfig(projectRoot));
  if (!input.isTTY || !output.isTTY || args.yes) {
    const configPath = writeLocalConfig(projectRoot, existing);
    console.log(`Local config ready: ${LOCAL_CONFIG_FILE}`);
    return existing;
  }

  console.log("");
  console.log(`Local config (${LOCAL_CONFIG_FILE})`);

  const rl = createInterface({ input, output });
  try {
    const startingConfig = isFirstSetup ? await askFirstSetupConfig(rl, existing) : existing;
    const next = await editConfigMenu(rl, startingConfig);
    if (!next) {
      return existing;
    }

    const configPath = writeLocalConfig(projectRoot, next);
    console.log(`Saved local config: ${configPath}`);
    return next;
  } finally {
    rl.close();
  }
}

async function askFirstSetupConfig(rl, config) {
  console.log("First-time setup");
  const next = mergeConfig(config, {
    server: { enabled: false },
    client: {
      host: await ask(rl, "Default server host/IP for players", config.client.host)
    }
  });
  return next;
}

async function editConfigMenu(rl, initialConfig) {
  let next = mergeConfig(DEFAULT_LOCAL_CONFIG, initialConfig);

  while (true) {
    printConfigMenu(next);
    const choice = (await ask(rl, "Choose a number to edit, s to save, r to reset, q to quit", "s")).toLowerCase();

    if (["", "s", "save"].includes(choice)) {
      return next;
    }

    if (["q", "quit"].includes(choice)) {
      console.log("Config unchanged.");
      return null;
    }

    if (["r", "reset"].includes(choice)) {
      next = mergeConfig(DEFAULT_LOCAL_CONFIG, {});
      continue;
    }

    next = await editConfigField(rl, next, choice);
  }
}

function printConfigMenu(config) {
  console.log("");
  console.log("Current config:");
  console.log(`  1  Host game server: ${formatYesNo(config.server.enabled)}`);
  console.log(`  2  Server listen host: ${config.server.host}`);
  console.log(`  3  Server port: ${config.server.port}`);
  console.log(`  4  Match duration minutes: ${config.server.duration}`);
  console.log(`  5  Default server host/IP: ${config.client.host}`);
  console.log(`  6  Default server port: ${config.client.port}`);
  console.log(`  7  Default player name: ${config.client.name}`);
  console.log(`  8  Default team: ${config.client.team}`);
  console.log(`  9  Default client mode: ${config.client.mode}`);
  console.log("");
  console.log("Enter a number to edit one setting, or s/r/q.");
}

async function editConfigField(rl, config, choice) {
  const next = mergeConfig(config, {});

  switch (choice) {
    case "1":
      next.server.enabled = await askYesNo(rl, "Will this machine host the game server?", next.server.enabled);
      return next;
    case "2":
      next.server.host = await ask(rl, "Server listen host", next.server.host);
      return next;
    case "3":
      next.server.port = await askNumber(rl, "Server port", next.server.port);
      next.client.port = next.client.port || next.server.port;
      return next;
    case "4":
      next.server.duration = await askNumber(rl, "Match duration minutes", next.server.duration);
      return next;
    case "5":
      next.client.host = await ask(rl, "Default server host/IP for players", next.client.host);
      return next;
    case "6":
      next.client.port = await askNumber(rl, "Default server port for players", next.client.port);
      return next;
    case "7":
      next.client.name = await ask(rl, "Default player name", next.client.name);
      return next;
    case "8":
      next.client.team = await askTeam(rl, next.client.team);
      return next;
    case "9":
      next.client.mode = await askMode(rl, next.client.mode);
      return next;
    default:
      console.log(`Unknown choice: ${choice}`);
      return next;
  }
}

function printNextSteps() {
  console.log("");
  console.log("Setup complete.");
  console.log("");
  console.log(`Local config: ${LOCAL_CONFIG_FILE}`);
  console.log("");
  if (config.server.enabled) {
    console.log("Start a server:");
    console.log("  npm run server");
    console.log("");
  }
  console.log("Join a match:");
  console.log("  npm run join");
}

async function ask(rl, label, fallback) {
  const answer = await rl.question(`${label} [${fallback}]: `);
  return answer.trim() || fallback;
}

async function askNumber(rl, label, fallback) {
  const value = Number(await ask(rl, label, fallback));
  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  console.log(`Keeping ${fallback}; expected a positive number.`);
  return fallback;
}

async function askYesNo(rl, label, fallback) {
  const fallbackText = fallback ? "yes" : "no";
  const answer = String(await ask(rl, `${label} yes/no`, fallbackText)).toLowerCase();
  if (["y", "yes", "true", "1"].includes(answer)) {
    return true;
  }
  if (["n", "no", "false", "0"].includes(answer)) {
    return false;
  }
  return fallback;
}

async function askTeam(rl, fallback) {
  const answer = String(await ask(rl, "Default team red/blue", fallback)).toLowerCase();
  if (["red", "blue"].includes(answer)) {
    return answer;
  }
  console.log(`Keeping ${fallback}; expected red or blue.`);
  return fallback;
}

async function askMode(rl, fallback) {
  const answer = String(await ask(rl, "Default client mode split/native/info/ops", fallback)).toLowerCase();
  if (["split", "native", "info", "ops"].includes(answer)) {
    return answer;
  }
  console.log(`Keeping ${fallback}; expected split, native, info, or ops.`);
  return fallback;
}

function formatYesNo(value) {
  return value ? "yes" : "no";
}
