import fs from "node:fs";
import path from "node:path";

export const LOCAL_CONFIG_FILE = "filefront.config.local.json";

export const DEFAULT_LOCAL_CONFIG = {
  network: {
    server: {
      enabled: false,
      host: "0.0.0.0",
      port: 31337
    },
    client: {
      host: "localhost",
      port: 31337
    }
  },
  game: {
    duration: 20,
    name: "alice",
    team: "red",
    mode: "split"
  }
};

export function resolveConfigRoot(projectRoot) {
  return process.env.FILEFRONT_CONFIG_DIR || projectRoot;
}

export function localConfigPath(projectRoot) {
  return path.join(resolveConfigRoot(projectRoot), LOCAL_CONFIG_FILE);
}

export function readLocalConfig(projectRoot) {
  const configPath = localConfigPath(projectRoot);
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${LOCAL_CONFIG_FILE}: ${error.message}`);
  }
}

export function writeLocalConfig(projectRoot, config) {
  const configPath = localConfigPath(projectRoot);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(normalizeConfig(config), null, 2)}\n`, "utf8");
  return configPath;
}

export function mergeConfig(base, override) {
  const normalizedBase = normalizeConfig(base);
  const normalizedOverride = normalizeConfig(override);
  return {
    network: {
      server: {
        ...(normalizedBase.network.server || {}),
        ...(normalizedOverride.network.server || {})
      },
      client: {
        ...(normalizedBase.network.client || {}),
        ...(normalizedOverride.network.client || {})
      }
    },
    game: {
      ...(normalizedBase.game || {}),
      ...(normalizedOverride.game || {})
    }
  };
}

export function parseArgs(argv) {
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

export function applyArgOverrides(config, args) {
  const next = mergeConfig(DEFAULT_LOCAL_CONFIG, config);

  if (args["server-enabled"]) next.network.server.enabled = args["server-enabled"] === true || args["server-enabled"] === "true";
  if (args["server-host"]) next.network.server.host = args["server-host"];
  if (args["server-port"]) next.network.server.port = Number(args["server-port"]);
  if (args.duration) next.game.duration = Number(args.duration);

  if (args.host) next.network.client.host = args.host;
  if (args.server) next.network.client.server = args.server;
  if (args.port) next.network.client.port = Number(args.port);
  if (args.name) next.game.name = args.name;
  if (args.team) next.game.team = args.team;
  if (args.mode || args.ui) next.game.mode = args.mode || args.ui;

  return next;
}

function normalizeConfig(config = {}) {
  const legacyServer = config.server || {};
  const legacyClient = config.client || {};
  const network = config.network || {};
  const game = config.game || {};

  return {
    network: {
      server: {
        enabled: legacyServer.enabled ?? network.server?.enabled ?? DEFAULT_LOCAL_CONFIG.network.server.enabled,
        host: legacyServer.host ?? network.server?.host ?? DEFAULT_LOCAL_CONFIG.network.server.host,
        port: legacyServer.port ?? network.server?.port ?? DEFAULT_LOCAL_CONFIG.network.server.port
      },
      client: {
        host: legacyClient.host ?? network.client?.host ?? DEFAULT_LOCAL_CONFIG.network.client.host,
        port: legacyClient.port ?? network.client?.port ?? DEFAULT_LOCAL_CONFIG.network.client.port,
        ...(legacyClient.server || network.client?.server ? { server: legacyClient.server ?? network.client.server } : {})
      }
    },
    game: {
      duration: legacyServer.duration ?? game.duration ?? DEFAULT_LOCAL_CONFIG.game.duration,
      name: legacyClient.name ?? game.name ?? DEFAULT_LOCAL_CONFIG.game.name,
      team: legacyClient.team ?? game.team ?? DEFAULT_LOCAL_CONFIG.game.team,
      mode: legacyClient.mode ?? game.mode ?? DEFAULT_LOCAL_CONFIG.game.mode
    }
  };
}
