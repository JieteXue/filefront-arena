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
  return mergeConfig(config, {
    network: {
      server: { enabled: false },
      client: {
        host: await ask(rl, "Default server host/IP for players", config.network.client.host)
      }
    }
  });
}

async function editConfigMenu(rl, initialConfig) {
  let next = mergeConfig(DEFAULT_LOCAL_CONFIG, initialConfig);

  while (true) {
    const fields = configFields(next);
    const action = await selectOption("Select a setting to edit", [
      ...fields.map((field) => ({
        label: `${field.section} / ${field.label}`,
        detail: field.value,
        field
      })),
      { label: "Save and exit", detail: "", action: "save" },
      { label: "Reset to defaults", detail: "", action: "reset" },
      { label: "Quit without saving", detail: "", action: "quit" }
    ]);

    if (action.action === "save") {
      return next;
    }

    if (action.action === "quit") {
      console.log("Config unchanged.");
      return null;
    }

    if (action.action === "reset") {
      next = mergeConfig(DEFAULT_LOCAL_CONFIG, {});
      continue;
    }

    next = await editConfigField(rl, next, action.field);
  }
}

function configFields(config) {
  return [
    {
      section: "Network",
      label: "Host game server",
      value: formatYesNo(config.network.server.enabled),
      edit: async (rl, next) => {
        next.network.server.enabled = await askYesNo(rl, "Will this machine host the game server?", next.network.server.enabled);
      }
    },
    {
      section: "Network",
      label: "Server listen host",
      value: config.network.server.host,
      edit: async (rl, next) => {
        next.network.server.host = await ask(rl, "Server listen host", next.network.server.host);
      }
    },
    {
      section: "Network",
      label: "Server port",
      value: config.network.server.port,
      edit: async (rl, next) => {
        next.network.server.port = await askNumber(rl, "Server port", next.network.server.port);
      }
    },
    {
      section: "Network",
      label: "Default server host/IP",
      value: config.network.client.host,
      edit: async (rl, next) => {
        next.network.client.host = await ask(rl, "Default server host/IP for players", next.network.client.host);
      }
    },
    {
      section: "Network",
      label: "Default server port",
      value: config.network.client.port,
      edit: async (rl, next) => {
        next.network.client.port = await askNumber(rl, "Default server port for players", next.network.client.port);
      }
    },
    {
      section: "Game",
      label: "Match duration minutes",
      value: config.game.duration,
      edit: async (rl, next) => {
        next.game.duration = await askNumber(rl, "Match duration minutes", next.game.duration);
      }
    },
    {
      section: "Game",
      label: "Default player name",
      value: config.game.name,
      edit: async (rl, next) => {
        next.game.name = await ask(rl, "Default player name", next.game.name);
      }
    },
    {
      section: "Game",
      label: "Default team",
      value: config.game.team,
      edit: async (rl, next) => {
        next.game.team = await askTeam(rl, next.game.team);
      }
    },
    {
      section: "Game",
      label: "Default client mode",
      value: config.game.mode,
      edit: async (rl, next) => {
        next.game.mode = await askMode(rl, next.game.mode);
      }
    }
  ];
}

async function editConfigField(rl, config, field) {
  const next = mergeConfig(config, {});
  await field.edit(rl, next);
  return next;
}

async function selectOption(title, options) {
  let selected = 0;
  let renderedLines = 0;

  const render = () => {
    if (renderedLines > 0) {
      output.write(`\x1b[${renderedLines}A\x1b[J`);
    }

    const lines = [`${title}:`, "Use Up/Down arrows, Enter to select."];
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const cursor = index === selected ? ">" : " ";
      const detail = option.detail === "" || option.detail === undefined ? "" : `  ${option.detail}`;
      lines.push(`${cursor} ${option.label}${detail}`);
    }
    output.write(`${lines.join("\n")}\n`);
    renderedLines = lines.length;
  };

  return await new Promise((resolve) => {
    const wasRaw = input.isRaw;
    input.setRawMode(true);
    input.resume();

    const cleanup = (value) => {
      input.setRawMode(wasRaw);
      input.off("data", onData);
      output.write("\n");
      resolve(value);
    };

    const onData = (chunk) => {
      const keys = chunk.toString("utf8");
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const sequence = keys.slice(index, index + 3);

        if (key === "\u0003") {
          cleanup({ action: "quit" });
          return;
        }
        if (key === "\r" || key === "\n") {
          cleanup(options[selected]);
          return;
        }
        if (sequence === "\u001b[A") {
          selected = selected === 0 ? options.length - 1 : selected - 1;
          render();
          index += 2;
          continue;
        }
        if (sequence === "\u001b[B") {
          selected = selected === options.length - 1 ? 0 : selected + 1;
          render();
          index += 2;
        }
      }
    };

    input.on("data", onData);
    render();
  });
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
