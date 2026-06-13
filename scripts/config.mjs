#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../src/config/local-config.js";
import { configureLocalSettings } from "../src/config/config-menu.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));

console.log("filefront-arena config");
console.log(`project: ${projectRoot}`);

await configureLocalSettings(projectRoot, { yes: args.yes });
