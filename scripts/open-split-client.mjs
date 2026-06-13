#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveServerUrl } from "../src/client/server-url.js";
import { buildClientCommands, toPosixCommand, toPowerShellCommand } from "../src/client/split-commands.js";
import { applyArgOverrides, parseArgs, readLocalConfig } from "../src/config/local-config.js";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = applyArgOverrides(readLocalConfig(projectRoot), args);
const server = resolveServerUrl(config.client);
const name = config.client.name || "alice";
const team = config.client.team || "red";
const commands = buildClientCommands({ projectRoot, server, name, team });

try {
  if (process.platform === "darwin") {
    openMacTerminal(commands);
  } else if (process.platform === "win32") {
    openWindowsTerminal(commands);
  } else {
    openLinuxTerminal(commands);
  }
} catch (error) {
  printManualCommands(commands, error);
  process.exit(1);
}

function openMacTerminal(entries) {
  for (const entry of entries) {
    const command = toPosixCommand(entry.command);
    const script = `
tell application "Terminal"
  activate
  set newTab to do script ${appleQuote(command)}
  set custom title of newTab to ${appleQuote(entry.title)}
end tell
`;
    execFileSync("osascript", ["-e", script], { stdio: "inherit" });
  }
}

function openWindowsTerminal(entries) {
  const wtArgs = [];
  for (const entry of entries) {
    if (wtArgs.length > 0) {
      wtArgs.push(";");
    }
    wtArgs.push(
      "new-tab",
      "--title",
      entry.title,
      "powershell",
      "-NoExit",
      "-Command",
      toPowerShellCommand(entry.command)
    );
  }

  const wt = spawnSync("wt", wtArgs, { stdio: "inherit" });
  if (!wt.error && wt.status === 0) {
    return;
  }

  for (const entry of entries) {
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Start-Process powershell -ArgumentList ${powerShellArgumentList([
        "-NoExit",
        "-Command",
        toPowerShellCommand(entry.command)
      ])}`
    ], { stdio: "inherit" });
  }
}

function openLinuxTerminal(entries) {
  const terminal = findLinuxTerminal();
  if (!terminal) {
    throw new Error("No supported terminal emulator found");
  }

  for (const entry of entries) {
    const command = toPosixCommand(entry.command);
    spawnSync(terminal.bin, terminal.args(entry.title, command), {
      detached: true,
      stdio: "ignore"
    });
  }
}

function findLinuxTerminal() {
  const candidates = [
    {
      bin: "x-terminal-emulator",
      args: (title, command) => ["-T", title, "-e", "sh", "-lc", `${command}; exec sh`]
    },
    {
      bin: "gnome-terminal",
      args: (title, command) => ["--title", title, "--", "sh", "-lc", `${command}; exec sh`]
    },
    {
      bin: "konsole",
      args: (title, command) => ["--new-tab", "-p", `tabtitle=${title}`, "-e", "sh", "-lc", `${command}; exec sh`]
    },
    {
      bin: "xfce4-terminal",
      args: (title, command) => ["--title", title, "--command", `sh -lc ${shellQuote(`${command}; exec sh`)}`]
    },
    {
      bin: "xterm",
      args: (title, command) => ["-T", title, "-e", "sh", "-lc", `${command}; exec sh`]
    }
  ];

  return candidates.find((candidate) => {
    const found = spawnSync("sh", ["-lc", `command -v ${shellQuote(candidate.bin)}`], {
      shell: true,
      stdio: "ignore"
    });
    return found.status === 0;
  });
}

function appleQuote(value) {
  return JSON.stringify(String(value));
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function powerShellArgumentList(values) {
  return values.map((value) => `'${String(value).replaceAll("'", "''")}'`).join(",");
}

function printManualCommands(entries, error) {
  console.error(`Could not open split terminals automatically: ${error.message}`);
  console.error("Run these commands in three terminal windows:");
  for (const entry of entries) {
    const command = process.platform === "win32"
      ? toPowerShellCommand(entry.command)
      : toPosixCommand(entry.command);
    console.error(`\n[${entry.title}]\n${command}`);
  }
}
