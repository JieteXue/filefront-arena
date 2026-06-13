import test from "node:test";
import assert from "node:assert/strict";
import packageJson from "../package.json" with { type: "json" };

test("package files exclude local config", () => {
  assert.deepEqual(packageJson.files, [
    "README.md",
    "scripts/",
    "src/"
  ]);
});
