import fs from "node:fs";
import path from "node:path";

export const LOCAL_CONFIG_FILE = "filefront.config.local.json";

export const DEFAULT_LOCAL_CONFIG = {
  network: {
    subnet: "LAN_CIDR"
  },
  server: {
    host: "0.0.0.0",
    port: 31337,
    duration: 20
  },
  client: {
    host: "localhost",
    port: 31337,
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
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return configPath;
}

export function mergeConfig(base, override) {
  return {
    ...base,
    ...override,
    network: {
      ...(base.network || {}),
      ...(override.network || {})
    },
    server: {
      ...(base.server || {}),
      ...(override.server || {})
    },
    client: {
      ...(base.client || {}),
      ...(override.client || {})
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

  if (args.subnet) next.network.subnet = args.subnet;
  if (args["server-host"]) next.server.host = args["server-host"];
  if (args["server-port"]) next.server.port = Number(args["server-port"]);
  if (args.duration) next.server.duration = Number(args.duration);

  if (args.host) next.client.host = args.host;
  if (args.server) next.client.server = args.server;
  if (args.port) next.client.port = Number(args.port);
  if (args.name) next.client.name = args.name;
  if (args.team) next.client.team = args.team;
  if (args.mode || args.ui) next.client.mode = args.mode || args.ui;

  return next;
}
