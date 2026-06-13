import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import {
  DEFAULT_LOCAL_CONFIG,
  LOCAL_CONFIG_FILE,
  localConfigPath,
  mergeConfig,
  readLocalConfig,
  writeLocalConfig
} from "./local-config.js";

export async function configureLocalSettings(projectRoot, options = {}) {
  const existing = mergeConfig(DEFAULT_LOCAL_CONFIG, readLocalConfig(projectRoot));
  if (!input.isTTY || !output.isTTY || options.yes) {
    const configPath = writeLocalConfig(projectRoot, existing);
    console.log(`Local config ready: ${LOCAL_CONFIG_FILE}`);
    return existing;
  }

  console.log("");
  console.log(`Local config (${LOCAL_CONFIG_FILE})`);

  const rl = createInterface({ input, output });
  try {
    const startingConfig = options.firstSetup && !fs.existsSync(localConfigPath(projectRoot))
      ? await askFirstSetupConfig(rl, existing)
      : existing;
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
