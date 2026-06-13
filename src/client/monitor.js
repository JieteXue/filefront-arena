import readline from "node:readline";
import { stdout as output } from "node:process";
import { formatTime, summarizeState } from "./socket.js";
import { ANSI, banner, setTerminalTitle } from "./terminal-style.js";

let lastStateKey = "";

export function runMonitorClient(socket, options) {
  const role = options.ops ? "OPS" : "INFO";
  output.write(setTerminalTitle(`${role} ${options.team.toUpperCase()} ${options.name}`));
  for (const line of banner({ role, team: options.team, name: options.name })) {
    print(line);
  }

  socket.on("connect", () => {
    print(`${ANSI.green}[connected]${ANSI.reset} ${role.toLowerCase()} connected`);
    if (options.ops) {
      socket.emit("watchTeam", { name: options.name, team: options.team }, (response) => {
        if (!response?.ok) print(`${ANSI.red}[error]${ANSI.reset} ${response?.error || "watchTeam failed"}`);
      });
    } else {
      socket.emit("watch", { name: options.name }, (response) => {
        if (!response?.ok) print(`${ANSI.red}[error]${ANSI.reset} ${response?.error || "watch failed"}`);
      });
    }
  });

  socket.on("joined", ({ state }) => renderState(state, true));
  socket.on("event", (message) => print(`${ANSI.yellow}[broadcast]${ANSI.reset} ${message}`));
  socket.on("teamLog", (entry) => {
    if (options.ops) print(formatTeamLog(entry));
  });
  socket.on("state", (state) => renderState(state, false));
  socket.on("matchEnded", (ended) => print(`${ANSI.magenta}[matchEnded]${ANSI.reset} ${ended.winner} won by ${ended.reason}`));
  socket.on("error", (message) => print(`${ANSI.red}[error]${ANSI.reset} ${message}`));
  socket.on("disconnect", () => print(`${ANSI.red}[disconnect]${ANSI.reset} monitor lost connection`));
}

function formatTeamLog(entry) {
  if (entry.type === "system") {
    return `${ANSI.dim}[ops:${entry.team}] ${entry.text}${ANSI.reset}`;
  }
  const actorColor = entry.error ? ANSI.red : ANSI.green;
  return `${actorColor}[${entry.actor}]${ANSI.reset} $ ${entry.input}`;
}

function renderState(state, force) {
  if (!state) return;
  const key = summarizeState(state);
  if (!force && key === lastStateKey) return;
  lastStateKey = key;
  print([
    `${ANSI.cyan}[state]${ANSI.reset} status=${state.status} remaining=${formatTime(state.remainingSeconds)}`,
    `red=${state.teams.red.score} [${state.teams.red.players.join(", ") || "-"}]`,
    `blue=${state.teams.blue.score} [${state.teams.blue.players.join(", ") || "-"}]`
  ].join(" | "));
}

function print(message) {
  output.write(`${message}\n`);
}
