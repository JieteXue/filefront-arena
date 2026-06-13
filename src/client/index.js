#!/usr/bin/env node
import { createSocket } from "./socket.js";
import { runNativeClient } from "./native.js";
import { runMonitorClient } from "./monitor.js";
import { resolveServerUrl } from "./server-url.js";
import { applyArgOverrides, parseArgs, readLocalConfig } from "../config/local-config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = applyArgOverrides(readLocalConfig(projectRoot), args);
const options = {
  serverUrl: resolveServerUrl(config.network.client),
  name: config.game.name || `op-${Math.random().toString(36).slice(2, 6)}`,
  team: config.game.team || "red",
  ui: args.ui || "native",
  watch: Boolean(args.watch),
  ops: Boolean(args.ops)
};

const socket = createSocket(options.serverUrl);

if (options.ui === "native") {
  runNativeClient(socket, options);
} else if (options.ui === "monitor") {
  runMonitorClient(socket, options);
} else {
  console.error(`unknown ui mode: ${options.ui}`);
  console.error("use --ui native or --ui monitor");
  process.exit(1);
}
