import test from "node:test";
import assert from "node:assert/strict";
import { buildClientCommands, toPosixCommand, toPowerShellCommand } from "../src/client/split-commands.js";

test("split commands build operation and monitor windows", () => {
  const commands = buildClientCommands({
    projectRoot: "/tmp/filefront arena",
    server: "http://arena.local:31337",
    name: "alice",
    team: "red"
  });

  assert.equal(commands.length, 3);
  assert.equal(commands[0].title, "OP RED alice");
  assert.deepEqual(commands[0].command.slice(-2), ["--ui", "native"]);
  assert.equal(commands[1].title, "INFO RED alice");
  assert.ok(commands[1].command.includes("alice-info"));
  assert.ok(commands[1].command.includes("--watch"));
  assert.equal(commands[2].title, "OPS RED alice");
  assert.ok(commands[2].command.includes("alice-ops"));
  assert.ok(commands[2].command.includes("--ops"));
});

test("split commands can render shell-safe command lines", () => {
  const [entry] = buildClientCommands({
    projectRoot: "/tmp/filefront arena",
    server: "http://arena.local:31337",
    name: "alice one",
    team: "red"
  });

  assert.equal(
    toPosixCommand(entry.command),
    "cd '/tmp/filefront arena' && 'npm' 'run' 'client' '--' '--server' 'http://arena.local:31337' '--name' 'alice one' '--team' 'red' '--ui' 'native'"
  );

  assert.equal(
    toPowerShellCommand(entry.command),
    "Set-Location -LiteralPath '/tmp/filefront arena'; 'npm' 'run' 'client' '--' '--server' 'http://arena.local:31337' '--name' 'alice one' '--team' 'red' '--ui' 'native'"
  );
});
