import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import { runCommand } from "../src/game/engine.js";
import { createMatchState, joinMatch, publicState } from "../src/game/state.js";

test("socket flow joins two teams and submits a token", async () => {
  const match = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG", durationMinutes: 1 });
  const httpServer = http.createServer();
  const io = new Server(httpServer);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const port = httpServer.address().port;

  io.on("connection", (socket) => {
    socket.on("join", (payload, ack) => {
      const joined = joinMatch(match, socket.id, payload.name, payload.team);
      ack(joined);
      socket.emit("state", publicState(match));
    });
    socket.on("command", (input, ack) => {
      const output = runCommand(match, socket.id, input, Date.now());
      ack(output);
      if (match.ended) io.emit("matchEnded", match.ended);
    });
  });

  const red = Client(`http://127.0.0.1:${port}`);
  const blue = Client(`http://127.0.0.1:${port}`);
  await Promise.all([
    onceConnect(red),
    onceConnect(blue)
  ]);

  const redJoin = await emitAck(red, "join", { name: "alice", team: "red" });
  const blueJoin = await emitAck(blue, "join", { name: "bob", team: "blue" });
  assert.equal(redJoin.ok, true);
  assert.equal(blueJoin.ok, true);

  match.worlds.blue.children.vault.locked = false;
  match.worlds.blue.children.vault.children["token.txt"].locked = false;
  const won = await emitAck(red, "command", "submit BLUE-FLAG");
  assert.match(won.lines.join("\n"), /wins/);
  assert.equal(match.ended.winner, "red");

  red.close();
  blue.close();
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

test("monitor sockets can watch without joining a team", async () => {
  const match = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG", durationMinutes: 1 });
  const httpServer = http.createServer();
  const io = new Server(httpServer);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const port = httpServer.address().port;

  io.on("connection", (socket) => {
    socket.on("join", (payload, ack) => {
      ack(joinMatch(match, socket.id, payload.name, payload.team));
    });
    socket.on("watch", (payload, ack) => {
      socket.data.monitor = { name: payload.name };
      socket.join("match");
      socket.emit("joined", { player: { name: payload.name, team: "monitor" }, state: publicState(match) });
      ack({ ok: true });
    });
  });

  const monitor = Client(`http://127.0.0.1:${port}`);
  const red = Client(`http://127.0.0.1:${port}`);
  await Promise.all([onceConnect(monitor), onceConnect(red)]);

  const watched = await emitAck(monitor, "watch", { name: "screen" });
  assert.equal(watched.ok, true);
  assert.equal(match.teams.red.players.length, 0);

  const joined = await emitAck(red, "join", { name: "alice", team: "red" });
  assert.equal(joined.ok, true);
  assert.equal(match.teams.red.players.length, 1);

  monitor.close();
  red.close();
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

test("team operation monitors receive same-team command logs", async () => {
  const match = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG", durationMinutes: 1 });
  const httpServer = http.createServer();
  const io = new Server(httpServer);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const port = httpServer.address().port;

  io.on("connection", (socket) => {
    socket.on("join", (payload, ack) => {
      const joined = joinMatch(match, socket.id, payload.name, payload.team);
      if (joined.ok) socket.join(`team:${joined.player.team}`);
      ack(joined);
    });
    socket.on("watchTeam", (payload, ack) => {
      socket.join(`team:${payload.team}`);
      ack({ ok: true });
    });
    socket.on("command", (input, ack) => {
      const player = match.players[socket.id];
      const output = runCommand(match, socket.id, input, Date.now());
      io.to(`team:${player.team}`).emit("teamLog", {
        type: "command",
        team: player.team,
        actor: player.name,
        input,
        output: output.lines,
        error: Boolean(output.error)
      });
      ack(output);
    });
  });

  const red = Client(`http://127.0.0.1:${port}`);
  const ops = Client(`http://127.0.0.1:${port}`);
  await Promise.all([onceConnect(red), onceConnect(ops)]);
  await emitAck(red, "join", { name: "alice", team: "red" });
  await emitAck(ops, "watchTeam", { name: "ops", team: "red" });

  const logPromise = new Promise((resolve) => ops.once("teamLog", resolve));
  await emitAck(red, "command", "pwd");
  const entry = await logPromise;
  assert.equal(entry.actor, "alice");
  assert.equal(entry.input, "pwd");
  assert.deepEqual(entry.output, ["/"]);

  red.close();
  ops.close();
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
});

function onceConnect(socket) {
  return new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}
