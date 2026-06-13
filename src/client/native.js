import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { formatTime, sendCommand, summarizeState } from "./socket.js";
import { ANSI, banner, setTerminalTitle } from "./terminal-style.js";

export function runNativeClient(socket, options) {
  const prompt = "$ ";
  const rl = readline.createInterface({
    input,
    output,
    prompt,
    historySize: 100
  });
  let lastPrintedStateKey = "";

  socket.on("connect", () => {
    print(`connected to ${options.serverUrl}`);
    socket.emit("join", { name: options.name, team: options.team }, (response) => {
      if (!response?.ok) print(`join failed: ${response?.error || "unknown error"}`);
    });
  });

  socket.on("joined", ({ player, state }) => {
    print(`joined as ${player.name} on ${player.team}`);
    renderState(state);
  });

  socket.on("output", (lines) => printLines(lines));
  socket.on("event", (message) => printBroadcast(message));
  socket.on("state", renderState);
  socket.on("matchEnded", (ended) => printBroadcast(`MATCH ENDED: ${ended.winner} won by ${ended.reason}`));
  socket.on("error", (message) => printBroadcast(`error: ${message}`));
  socket.on("disconnect", () => printBroadcast("disconnected"));

  rl.on("line", (value) => {
    const line = value.trim();
    if (!line) {
      rl.prompt();
      return;
    }
    if (line === "quit" || line === "exit") {
      socket.close();
      rl.close();
      return;
    }
    sendCommand(socket, line);
  });

  rl.on("SIGINT", () => {
    socket.close();
    rl.close();
  });

  rl.on("close", () => {
    output.write("\n");
    process.exit(0);
  });

  output.write(setTerminalTitle(`OP ${options.team.toUpperCase()} ${options.name}`));
  for (const line of banner({ role: "OP", team: options.team, name: options.name })) {
    print(line);
  }
  print(`${ANSI.dim}type help for commands, quit to exit client${ANSI.reset}`);
  rl.prompt();

  function renderState(state) {
    if (!state) return;
    const stateKey = summarizeState(state);
    if (stateKey === lastPrintedStateKey) return;
    lastPrintedStateKey = stateKey;

    const red = state.teams.red;
    const blue = state.teams.blue;
    print([
      `status=${state.status} remaining=${formatTime(state.remainingSeconds)}`,
      `red=${red.score} [${red.players.join(", ") || "-"}]`,
      `blue=${blue.score} [${blue.players.join(", ") || "-"}]`
    ].join(" | "));
  }

  function printLines(lines) {
    for (const line of lines || []) print(line);
  }

  function print(message) {
    output.write(`${message}\n`);
    rl.prompt(true);
  }

  function printBroadcast(message) {
    print(`${ANSI.yellow}[broadcast]${ANSI.reset} ${message}`);
  }
}
