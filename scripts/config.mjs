#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LOCAL_CONFIG,
  localConfigPath,
  mergeConfig,
  parseArgs,
  readLocalConfig
} from "../src/config/local-config.js";
import { configureLocalSettings } from "../src/config/config-menu.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const [command] = argv;
const args = parseArgs(argv);

console.log("filefront-arena config");
console.log(`project: ${projectRoot}`);

if (command === "show") {
  const config = mergeConfig(DEFAULT_LOCAL_CONFIG, readLocalConfig(projectRoot));
  console.log(`config: ${localConfigPath(projectRoot)}`);
  console.log(JSON.stringify(config, null, 2));
} else {
  await configureLocalSettings(projectRoot, { yes: args.yes });
}
