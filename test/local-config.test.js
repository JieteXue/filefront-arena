import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  DEFAULT_LOCAL_CONFIG,
  LOCAL_CONFIG_FILE,
  applyArgOverrides,
  localConfigPath,
  mergeConfig,
  readLocalConfig,
  writeLocalConfig
} from "../src/config/local-config.js";

test("local config path and read/write stay project local", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "filefront-config-"));
  assert.equal(localConfigPath(projectRoot), path.join(projectRoot, LOCAL_CONFIG_FILE));
  assert.deepEqual(readLocalConfig(projectRoot), {});

  const config = mergeConfig(DEFAULT_LOCAL_CONFIG, {
    network: { subnet: "test-lan-cidr" },
    client: { host: "arena.local", name: "alice", team: "blue" }
  });
  writeLocalConfig(projectRoot, config);

  assert.equal(readLocalConfig(projectRoot).network.subnet, "test-lan-cidr");
  assert.equal(readLocalConfig(projectRoot).client.host, "arena.local");
  assert.equal(readLocalConfig(projectRoot).client.team, "blue");
});

test("arg overrides keep config defaults but prefer explicit command args", () => {
  const config = {
    server: { host: "0.0.0.0", port: 4000, duration: 10 },
    client: { host: "saved-host", port: 4000, name: "saved", team: "red", mode: "split" }
  };

  const merged = applyArgOverrides(config, {
    host: "cli-host",
    port: "5000",
    name: "cli-name",
    team: "blue",
    mode: "native",
    subnet: "cli-lan-cidr",
    "server-port": "6000",
    duration: "30"
  });

  assert.equal(merged.network.subnet, "cli-lan-cidr");
  assert.equal(merged.client.host, "cli-host");
  assert.equal(merged.client.port, 5000);
  assert.equal(merged.client.name, "cli-name");
  assert.equal(merged.client.team, "blue");
  assert.equal(merged.client.mode, "native");
  assert.equal(merged.server.host, "0.0.0.0");
  assert.equal(merged.server.port, 6000);
  assert.equal(merged.server.duration, 30);
});

test("FILEFRONT_CONFIG_DIR can move local config outside the package", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "filefront-package-"));
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), "filefront-user-"));
  const previous = process.env.FILEFRONT_CONFIG_DIR;
  process.env.FILEFRONT_CONFIG_DIR = configRoot;

  try {
    assert.equal(localConfigPath(projectRoot), path.join(configRoot, LOCAL_CONFIG_FILE));
  } finally {
    if (previous === undefined) {
      delete process.env.FILEFRONT_CONFIG_DIR;
    } else {
      process.env.FILEFRONT_CONFIG_DIR = previous;
    }
  }
});
