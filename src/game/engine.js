import { checkTimeLimit } from "./state.js";
import { runArenaCommand } from "./commands/arena.js";
import { runShellCommand } from "./commands/shell.js";
import { result } from "./commands/shared.js";

const COOLDOWNS = {
  scan: 3_000,
  crack: 5_000,
  plant: 8_000,
  clean: 5_000,
  harden: 7_000,
  submit: 2_000
};

export function parseCommand(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return { name: "", args: [] };
  const args = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(trimmed))) {
    args.push(match[1] ?? match[2] ?? match[3]);
  }
  return { name: args.shift().toLowerCase(), args };
}

export function runCommand(state, playerId, input, now = Date.now()) {
  checkTimeLimit(state, now);
  const player = state.players[playerId];
  if (!player) return result(["not joined"], { error: true });
  if (state.ended) return result([`match ended: ${state.ended.winner} won by ${state.ended.reason}`]);

  const command = parseCommand(input);
  if (!command.name) return result(["type help for commands"]);

  recordHistory(state, playerId, input);
  const context = createContext(state, playerId, player);
  const output = dispatchCommand(context, command, now);
  if (output) return output;
  return result([`unknown command: ${command.name}`, "type help for commands"], { error: true });
}

function dispatchCommand(context, command, now = Date.now()) {
  const shellOutput = runShellCommand(context, command, (nextCommand, nextContext = context) => (
    dispatchCommand(nextContext, nextCommand, now)
  ));
  if (shellOutput) return shellOutput;

  const cooldown = COOLDOWNS[command.name];
  if (cooldown) {
    return withCooldown(context, command.name, now, () => runArenaCommand(context, command));
  }
  return runArenaCommand(context, command);
}

function createContext(state, playerId, player) {
  const team = player.team;
  return {
    state,
    playerId,
    player,
    team,
    root: state.worlds[team],
    cwd: state.teams[team].cwd[playerId] || "/",
    sudo: false
  };
}

function withCooldown(context, name, now, fn) {
  const { state, playerId, team } = context;
  const cooldowns = state.teams[team].cooldowns[playerId] ||= {};
  const readyAt = cooldowns[name] || 0;
  if (readyAt > now) {
    return result([`${name} cooling down: ${Math.ceil((readyAt - now) / 1000)}s`], { error: true });
  }
  const out = fn();
  if (!out?.error) cooldowns[name] = now + COOLDOWNS[name];
  return out;
}

function recordHistory(state, playerId, input) {
  const team = state.players[playerId].team;
  const history = state.teams[team].history[playerId] ||= [];
  history.push(input);
  state.teams[team].history[playerId] = history.slice(-100);
}
