#!/usr/bin/env node
import http from "node:http";
import { Server } from "socket.io";
import { runCommand } from "../game/engine.js";
import { checkTimeLimit, createMatchState, joinMatch, leaveMatch, publicState } from "../game/state.js";
import { applyArgOverrides, parseArgs, readLocalConfig } from "../config/local-config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = applyArgOverrides(readLocalConfig(projectRoot), args);
const host = args.host || config.network.server.host || "0.0.0.0";
const port = Number(args.port || config.network.server.port || 31337);
const durationMinutes = Number(args.duration || config.game.duration || 20);

const match = createMatchState({ durationMinutes });
const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  socket.on("join", (payload = {}, ack) => {
    const joined = joinMatch(match, socket.id, payload.name, payload.team);
    if (!joined.ok) {
      socket.emit("error", joined.error);
      ack?.(joined);
      return;
    }
    socket.data.player = joined.player;
    socket.join("match");
    socket.join(`team:${joined.player.team}`);
    socket.emit("joined", { player: joined.player, state: publicState(match) });
    io.to("match").emit("event", `${joined.player.name} joined ${joined.player.team}.`);
    io.to("match").emit("state", publicState(match));
    ack?.(joined);
  });

  socket.on("watch", (payload = {}, ack) => {
    const name = String(payload.name || "monitor").slice(0, 24);
    socket.data.monitor = { name };
    socket.join("match");
    socket.emit("joined", { player: { name, team: "monitor" }, state: publicState(match) });
    socket.emit("event", `${name} is watching broadcast.`);
    ack?.({ ok: true, monitor: socket.data.monitor });
  });

  socket.on("watchTeam", (payload = {}, ack) => {
    const name = String(payload.name || "ops").slice(0, 24);
    const team = String(payload.team || "").toLowerCase();
    if (!["red", "blue"].includes(team)) {
      socket.emit("error", "team must be red or blue");
      ack?.({ ok: false, error: "team must be red or blue" });
      return;
    }
    socket.data.monitor = { name, team, kind: "ops" };
    socket.join(`team:${team}`);
    socket.emit("joined", { player: { name, team: "ops" }, state: publicState(match) });
    socket.emit("teamLog", { type: "system", team, actor: name, text: `watching ${team} operations.` });
    ack?.({ ok: true, monitor: socket.data.monitor });
  });

  socket.on("command", (input = "", ack) => {
    const player = socket.data.player;
    const output = runCommand(match, socket.id, input);
    socket.emit("output", output.lines);
    if (player) {
      io.to(`team:${player.team}`).emit("teamLog", {
        type: "command",
        team: player.team,
        actor: player.name,
        input,
        output: output.lines,
        error: Boolean(output.error)
      });
    }
    if (output.broadcast) {
      io.to("match").emit("event", output.lines.join(" "));
    }
    io.to("match").emit("state", publicState(match));
    if (output.ended || match.ended) {
      io.to("match").emit("matchEnded", match.ended);
    }
    ack?.(output);
  });

  socket.on("chat", (message = "", ack) => {
    const output = runCommand(match, socket.id, `chat ${message}`);
    io.to("match").emit("event", output.lines.join(" "));
    ack?.(output);
  });

  socket.on("disconnect", () => {
    if (!socket.data.monitor) leaveMatch(match, socket.id);
    io.to("match").emit("state", publicState(match));
  });
});

setInterval(() => {
  const ended = checkTimeLimit(match);
  io.to("match").emit("state", publicState(match));
  if (ended) io.to("match").emit("matchEnded", ended);
}, 1000).unref();

httpServer.listen(port, host, () => {
  console.log(`filefront-arena server listening on http://${host}:${port}`);
  console.log(`duration: ${durationMinutes} minute(s), max team size: 5v5`);
});

export { httpServer, io, match };
