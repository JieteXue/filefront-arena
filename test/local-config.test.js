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
    server: { enabled: true },
    client: { host: "arena.local", name: "alice", team: "blue" }
  });
  writeLocalConfig(projectRoot, config);

  assert.equal(readLocalConfig(projectRoot).network.server.enabled, true);
  assert.equal(readLocalConfig(projectRoot).network.client.host, "arena.local");
  assert.equal(readLocalConfig(projectRoot).game.team, "blue");
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
    "server-enabled": "true",
    "server-port": "6000",
    duration: "30"
  });

  assert.equal(merged.network.server.enabled, true);
  assert.equal(merged.network.client.host, "cli-host");
  assert.equal(merged.network.client.port, 5000);
  assert.equal(merged.game.name, "cli-name");
  assert.equal(merged.game.team, "blue");
  assert.equal(merged.game.mode, "native");
  assert.equal(merged.network.server.host, "0.0.0.0");
  assert.equal(merged.network.server.port, 6000);
  assert.equal(merged.game.duration, 30);
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

test("writeLocalConfig creates FILEFRONT_CONFIG_DIR when needed", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "filefront-package-"));
  const configRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "filefront-parent-")), "nested");
  const previous = process.env.FILEFRONT_CONFIG_DIR;
  process.env.FILEFRONT_CONFIG_DIR = configRoot;

  try {
    writeLocalConfig(projectRoot, DEFAULT_LOCAL_CONFIG);
    assert.equal(fs.existsSync(path.join(configRoot, LOCAL_CONFIG_FILE)), true);
  } finally {
    if (previous === undefined) {
      delete process.env.FILEFRONT_CONFIG_DIR;
    } else {
      process.env.FILEFRONT_CONFIG_DIR = previous;
    }
  }
});

test("legacy server and client config is migrated when merging or writing", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "filefront-obsolete-"));
  const merged = mergeConfig(DEFAULT_LOCAL_CONFIG, {
    server: { enabled: true, duration: 30 },
    client: { host: "arena.local" }
  });

  assert.equal(merged.network.server.enabled, true);
  assert.equal(merged.network.client.host, "arena.local");
  assert.equal(merged.game.duration, 30);

  writeLocalConfig(projectRoot, {
    server: { enabled: true },
    client: { name: "legacy" }
  });

  const written = readLocalConfig(projectRoot);
  assert.equal("server" in written, false);
  assert.equal("client" in written, false);
  assert.equal(written.network.server.enabled, true);
  assert.equal(written.game.name, "legacy");
});
