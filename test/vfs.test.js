import assert from "node:assert/strict";
import test from "node:test";
import {
  copyNode,
  dir,
  file,
  findNodes,
  grep,
  listDirectory,
  makeDirectory,
  moveNode,
  normalizePath,
  readFile,
  removeNode,
  treeLines,
  writeFile
} from "../src/game/vfs.js";

test("normalizePath resolves relative paths", () => {
  assert.equal(normalizePath("/srv/share", "../log"), "/srv/log");
  assert.equal(normalizePath("/", "vault/token.txt"), "/vault/token.txt");
});

test("directory listing hides hidden files unless all is true", () => {
  const root = dir({
    "open.txt": file("ok"),
    ".hidden": file("secret", { hidden: true })
  });
  assert.deepEqual(listDirectory(root, "/").entries.map((entry) => entry.name), ["open.txt"]);
  assert.deepEqual(listDirectory(root, "/", { all: true }).entries.map((entry) => entry.name), [".hidden", "open.txt"]);
});

test("locked files cannot be read until unlocked", () => {
  const root = dir({ vault: dir({ "token.txt": file("FLAG", { locked: true }) }) });
  assert.equal(readFile(root, "/vault/token.txt").ok, false);
  root.children.vault.children["token.txt"].locked = false;
  assert.equal(readFile(root, "/vault/token.txt").content, "FLAG");
});

test("write and remove planted files", () => {
  const root = dir({ srv: dir({ share: dir() }) });
  assert.equal(writeFile(root, "/srv/share/noise.log", "x", { plantedBy: "red" }).ok, true);
  assert.match(grep(root, "/srv", "x").matches[0].path, /noise/);
  assert.equal(removeNode(root, "/srv/share/noise.log", (node) => Boolean(node.plantedBy)).ok, true);
});

test("virtual filesystem supports mkdir copy move find and tree", () => {
  const root = dir({ tmp: dir(), home: dir({ "a.txt": file("alpha") }) });
  assert.equal(makeDirectory(root, "/tmp/work").ok, true);
  assert.equal(copyNode(root, "/home/a.txt", "/tmp/work/b.txt").ok, true);
  assert.equal(readFile(root, "/tmp/work/b.txt").content, "alpha");
  assert.equal(moveNode(root, "/tmp/work/b.txt", "/tmp/work/c.txt").ok, true);
  assert.equal(readFile(root, "/tmp/work/b.txt").ok, false);
  assert.deepEqual(findNodes(root, "/", "c.txt").matches.map((match) => match.path), ["/tmp/work/c.txt"]);
  assert.match(treeLines(root, "/tmp").lines.join("\n"), /work/);
});
