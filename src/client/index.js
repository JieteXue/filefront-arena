#!/usr/bin/env node
import { createSocket } from "./socket.js";
import { runNativeClient } from "./native.js";
import { runMonitorClient } from "./monitor.js";
import { resolveServerUrl } from "./server-url.js";

const args = parseArgs(process.argv.slice(2));
const options = {
  serverUrl: resolveServerUrl(args),
  name: args.name || `op-${Math.random().toString(36).slice(2, 6)}`,
  team: args.team || "red",
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
