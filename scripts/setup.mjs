#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOCAL_CONFIG,
  LOCAL_CONFIG_FILE,
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
  const existing = mergeConfig(DEFAULT_LOCAL_CONFIG, readLocalConfig(projectRoot));
  if (!input.isTTY || !output.isTTY || args.yes) {
    const configPath = writeLocalConfig(projectRoot, existing);
    console.log(`Local config ready: ${LOCAL_CONFIG_FILE}`);
    return existing;
  }

  console.log("");
  console.log(`Local config (${LOCAL_CONFIG_FILE})`);
  console.log("Press Enter to keep the default shown in brackets.");

  const rl = createInterface({ input, output });
  try {
    const serverEnabled = await askYesNo(rl, "Will this machine host the game server?", existing.server.enabled);
    const serverConfig = serverEnabled
      ? {
          enabled: true,
          host: await ask(rl, "Server listen host", existing.server.host),
          port: Number(await ask(rl, "Server port", existing.server.port)),
          duration: Number(await ask(rl, "Match duration minutes", existing.server.duration))
        }
      : {
          ...existing.server,
          enabled: false
        };

    const next = mergeConfig(existing, {
      server: serverConfig,
      client: {
        host: await ask(rl, "Default server host/IP for players", existing.client.host),
        port: Number(await ask(rl, "Default server port for players", existing.client.port)),
        name: await ask(rl, "Default player name", existing.client.name),
        team: await askTeam(rl, existing.client.team),
        mode: await askMode(rl, existing.client.mode)
      }
    });
    const configPath = writeLocalConfig(projectRoot, next);
    console.log(`Saved local config: ${configPath}`);
    return next;
  } finally {
    rl.close();
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

async function askYesNo(rl, label, fallback) {
  const fallbackText = fallback ? "yes" : "no";
  const answer = String(await ask(rl, `${label} yes/no`, fallbackText)).toLowerCase();
  return ["y", "yes", "true", "1"].includes(answer);
}

async function askTeam(rl, fallback) {
  const answer = String(await ask(rl, "Default team red/blue", fallback)).toLowerCase();
  return answer === "blue" ? "blue" : "red";
}

async function askMode(rl, fallback) {
  const answer = String(await ask(rl, "Default client mode split/native/info/ops", fallback)).toLowerCase();
  return ["split", "native", "info", "ops"].includes(answer) ? answer : "split";
}
