#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOCAL_CONFIG,
  LOCAL_CONFIG_FILE,
  mergeConfig,
  parseArgs,
  readLocalConfig
} from "../src/config/local-config.js";
import { configureLocalSettings } from "../src/config/config-menu.js";
import { npmCommand } from "../src/npm-command.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const npm = npmCommand();

printHeader();
checkNodeVersion();
checkCommand(npm, ["--version"], "npm is required. Install Node.js 20+ from https://nodejs.org/", "npm");
installDependencies();
const config = args["no-config"]
  ? mergeConfig(DEFAULT_LOCAL_CONFIG, readLocalConfig(projectRoot))
  : await configureLocalSettings(projectRoot, { firstSetup: true, yes: args.yes });
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

function printNextSteps() {
  console.log("");
  console.log("Setup complete.");
  console.log("");
  console.log(`Local config: ${LOCAL_CONFIG_FILE}`);
  console.log("");
  if (config.network.server.enabled) {
    console.log("Start a server:");
    console.log("  npm run server");
    console.log("");
  }
  console.log("Join a match:");
  console.log("  npm run join");
}
