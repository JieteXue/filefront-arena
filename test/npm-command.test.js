import test from "node:test";
import assert from "node:assert/strict";
import { npmCommand } from "../src/npm-command.js";

test("npm command resolves to Windows command shim on win32", () => {
  assert.equal(npmCommand("win32"), "npm.cmd");
});

test("npm command stays npm on non-Windows platforms", () => {
  assert.equal(npmCommand("darwin"), "npm");
  assert.equal(npmCommand("linux"), "npm");
});
