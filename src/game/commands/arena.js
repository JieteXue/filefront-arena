import { addScore, pushEvent } from "../state.js";
import { normalizePath, removeNode, writeFile } from "../vfs.js";
import { otherTeam, TEAMS } from "../world.js";
import { result } from "./shared.js";

export function runArenaCommand(context, command) {
  const { state, player, cwd } = context;
  switch (command.name) {
    case "scan":
      return handleScan(state, player, command.args);
    case "crack":
      return handleCrack(state, player, command.args);
    case "plant":
      return handlePlant(state, player, cwd, command.args);
    case "clean":
      return handleClean(state, player, cwd, command.args);
    case "harden":
      return handleHarden(state, player, command.args);
    case "submit":
      return handleSubmit(state, player, command.args);
    case "chat":
      return handleChat(state, player, command.args);
    case "score":
      return result(scoreLines(state));
    default:
      return null;
  }
}

function handleScan(state, player, args) {
  const targetTeam = String(args[0] || otherTeam(player.team)).toLowerCase();
  if (!TEAMS.includes(targetTeam)) return result(["usage: scan <red|blue>"], { error: true });
  const track = state.attack[targetTeam];
  const lines = Object.values(track).map((target) => {
    const status = target.cracked ? "cracked" : `${target.progress}/${target.required + target.defense}`;
    return `${target.label}: ${status}, defense=${target.defense}`;
  });
  pushEvent(state, `${player.name} scanned ${targetTeam}.`);
  return result([`Attack surfaces for ${targetTeam}:`, ...lines], { broadcast: true });
}

function handleCrack(state, player, args) {
  const targetName = String(args[0] || "").toLowerCase();
  const enemy = otherTeam(player.team);
  const target = state.attack[enemy][targetName];
  if (!target) return result(["usage: crack <perimeter|logs|vault>"], { error: true });
  if (target.cracked) return result([`${targetName} is already cracked`]);

  target.progress += 1;
  const needed = target.required + target.defense;
  if (target.progress < needed) {
    pushEvent(state, `${player.name} pressured ${enemy}/${targetName} (${target.progress}/${needed}).`);
    return result([`crack progress ${enemy}/${targetName}: ${target.progress}/${needed}`], { broadcast: true });
  }

  target.cracked = true;
  addScore(state, player.team, targetName === "vault" ? 25 : 10);
  pushEvent(state, `${player.name} cracked ${enemy}/${targetName}.`);
  if (targetName === "vault") {
    state.worlds[enemy].children.vault.locked = false;
    state.worlds[enemy].children.vault.children["token.txt"].locked = false;
    return result([
      `cracked ${enemy}/vault`,
      `token exposed: ${target.clue}`,
      "submit it to win."
    ], { broadcast: true });
  }
  return result([
    `cracked ${enemy}/${targetName}`,
    `next clue: ${target.clue}`
  ], { broadcast: true });
}

function handlePlant(state, player, cwd, args) {
  const rawPath = args[0] || "/srv/share";
  const enemy = otherTeam(player.team);
  const targetPath = normalizePath(cwd, rawPath);
  const stamp = Date.now().toString(36);
  const plantedPath = `${targetPath.replace(/\/$/, "")}/noise-${player.team}-${stamp}.log`;
  const content = [
    `planted by ${player.team}`,
    `operator=${player.name}`,
    "signal=noise",
    "hint=verify before trusting logs"
  ].join("\n");
  const written = writeFile(state.worlds[enemy], plantedPath, content, { plantedBy: player.team });
  if (!written.ok) return result([written.error], { error: true });
  pushEvent(state, `${player.name} planted noise on ${enemy}:${written.path}.`);
  return result([`planted ${enemy}:${written.path}`], { broadcast: true });
}

function handleClean(state, player, cwd, args) {
  if (!args[0]) return result(["usage: clean <path>"], { error: true });
  const targetPath = normalizePath(cwd, args[0]);
  const removed = removeNode(state.worlds[player.team], targetPath, (node) => Boolean(node.plantedBy));
  if (!removed.ok) return result([removed.error], { error: true });
  addScore(state, player.team, 5);
  pushEvent(state, `${player.name} cleaned ${player.team}:${removed.path}.`);
  return result([`cleaned ${removed.path}`, "+5 defense score"], { broadcast: true });
}

function handleHarden(state, player, args) {
  const targetName = String(args[0] || "").toLowerCase();
  const target = state.attack[player.team][targetName];
  if (!target) return result(["usage: harden <perimeter|logs|vault>"], { error: true });
  if (target.cracked) return result([`${targetName} is already cracked; hardening is too late`], { error: true });
  target.defense = Math.min(target.defense + 1, 3);
  pushEvent(state, `${player.name} hardened ${player.team}/${targetName} to ${target.defense}.`);
  return result([`hardened ${targetName}: defense=${target.defense}`], { broadcast: true });
}

function handleSubmit(state, player, args) {
  if (!args[0]) return result(["usage: submit <token>"], { error: true });
  const enemy = otherTeam(player.team);
  if (args[0] === state.tokens[enemy]) {
    state.status = "ended";
    state.ended = {
      winner: player.team,
      reason: "token",
      submittedBy: player.name,
      scores: { red: state.teams.red.score, blue: state.teams.blue.score }
    };
    pushEvent(state, `${player.name} submitted ${enemy} token. ${player.team} wins.`);
    return result([`${player.team} wins by token capture!`], { broadcast: true, ended: state.ended });
  }
  addScore(state, player.team, -10);
  pushEvent(state, `${player.name} submitted a bad token.`);
  return result(["bad token", "-10 score"], { error: true, broadcast: true });
}

function handleChat(state, player, args) {
  const message = args.join(" ").trim();
  if (!message) return result(["usage: chat <message>"], { error: true });
  pushEvent(state, `[${player.team}] ${player.name}: ${message}`);
  return result([`chat sent: ${message}`], { broadcast: true });
}

function scoreLines(state) {
  return [
    `red: ${state.teams.red.score}`,
    `blue: ${state.teams.blue.score}`
  ];
}
