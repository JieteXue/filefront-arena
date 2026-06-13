#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = args.server || "http://localhost:31337";
const name = args.name || "alice";
const team = args.team || "red";

const operationCommand = [
  `cd ${shellQuote(projectRoot)}`,
  `npm run client -- --server ${shellQuote(server)} --name ${shellQuote(name)} --team ${shellQuote(team)} --ui native`
].join(" && ");

const monitorCommand = [
  `cd ${shellQuote(projectRoot)}`,
  `npm run client -- --server ${shellQuote(server)} --name ${shellQuote(`${name}-info`)} --team ${shellQuote(team)} --ui monitor --watch`
].join(" && ");

const opsCommand = [
  `cd ${shellQuote(projectRoot)}`,
  `npm run client -- --server ${shellQuote(server)} --name ${shellQuote(`${name}-ops`)} --team ${shellQuote(team)} --ui monitor --ops`
].join(" && ");

openTerminalWindow(`OP ${team.toUpperCase()} ${name}`, operationCommand);
openTerminalWindow(`INFO ${team.toUpperCase()} ${name}`, monitorCommand);
openTerminalWindow(`OPS ${team.toUpperCase()} ${name}`, opsCommand);

function openTerminalWindow(title, command) {
  const script = `
tell application "Terminal"
  activate
  set newTab to do script ${appleQuote(command)}
  set custom title of newTab to ${appleQuote(title)}
end tell
`;
  execFileSync("osascript", ["-e", script], { stdio: "inherit" });
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

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function appleQuote(value) {
  return JSON.stringify(String(value));
}
