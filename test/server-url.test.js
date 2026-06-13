import test from "node:test";
import assert from "node:assert/strict";
import { resolveServerUrl } from "../src/client/server-url.js";

test("server url defaults to localhost", () => {
  assert.equal(resolveServerUrl(), "http://localhost:31337");
});

test("host is expanded into a playable server url", () => {
  assert.equal(resolveServerUrl({ host: "arena.local" }), "http://arena.local:31337");
  assert.equal(resolveServerUrl({ host: "arena.local", port: "4000" }), "http://arena.local:4000");
});

test("server accepts complete or protocol-less endpoints", () => {
  assert.equal(resolveServerUrl({ server: "http://arena.local:4000" }), "http://arena.local:4000");
  assert.equal(resolveServerUrl({ server: "arena.local:4000" }), "http://arena.local:4000");
});
