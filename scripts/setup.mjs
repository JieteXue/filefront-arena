#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));

printHeader();
checkNodeVersion();
checkCommand("npm", ["--version"], "npm is required. Install Node.js 20+ from https://nodejs.org/");
installDependencies();
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

function checkCommand(command, commandArgs, errorMessage) {
  const result = spawnSync(command, commandArgs, {
    cwd: projectRoot,
    encoding: "utf8"
  });

  if (result.error || result.status !== 0) {
    console.error(errorMessage);
    process.exit(1);
  }

  console.log(`OK ${command} ${String(result.stdout).trim()}`);
}

function installDependencies() {
  console.log("");
  console.log("Installing dependencies...");
  const commandArgs = args.ci ? ["ci"] : ["install"];
  const result = spawnSync("npm", commandArgs, {
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
  console.log("Start a server:");
  console.log("  npm run server -- --host 0.0.0.0 --port 31337 --duration 20");
  console.log("");
  console.log("Join a match:");
  console.log("  npm run join -- --host SERVER_LAN_IP --name alice --team red");
  console.log("");
  console.log("Local test:");
  console.log("  npm run server -- --host 127.0.0.1 --port 31337 --duration 20");
  console.log("  npm run join -- --host localhost --name alice --team red");
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
