import {
  changeDirectory,
  chmodNode,
  copyNode,
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
} from "../vfs.js";
import { COMMAND_NAMES, HELP_LINES } from "./help.js";
import { parseLineCount, result } from "./shared.js";

const SUDO_ALLOWED = new Set(["cat", "ls", "find", "tree", "head", "tail", "chmod", "rm"]);

export function runShellCommand(context, command, dispatch) {
  const { state, player, playerId, root, cwd } = context;
  switch (command.name) {
    case "help":
      return result(HELP_LINES);
    case "pwd":
      return result([cwd]);
    case "ls":
      return handleLs(root, cwd, command.args);
    case "cd":
      return handleCd(state, playerId, root, cwd, command.args);
    case "cat":
      return handleCat(root, cwd, command.args);
    case "grep":
      return handleGrep(root, cwd, command.args);
    case "find":
      return handleFind(root, cwd, command.args);
    case "tree":
      return handleTree(root, cwd, command.args);
    case "head":
      return handleHeadTail(root, cwd, command.args, "head");
    case "tail":
      return handleHeadTail(root, cwd, command.args, "tail");
    case "touch":
      return handleTouch(root, cwd, command.args);
    case "mkdir":
      return handleMkdir(root, cwd, command.args);
    case "rm":
      return handleRm(root, cwd, command.args);
    case "cp":
      return handleCp(root, cwd, command.args);
    case "mv":
      return handleMv(root, cwd, command.args);
    case "chmod":
      return handleChmod(root, cwd, command.args);
    case "sudo":
      return handleSudo(context, command.args, dispatch);
    case "su":
      return result([`su: authentication failure for ${command.args[0] || "root"} (simulated)`], { error: true });
    case "id":
      return result([`uid=1000(${player.name}) gid=1000(${player.team}) groups=1000(${player.team}),27(operators)`]);
    case "groups":
      return result([`${player.team} operators arena`]);
    case "uname":
      return result([command.args.includes("-a")
        ? "FilefrontOS arena-kernel 0.1.0 x86_64 virtual"
        : "FilefrontOS"]);
    case "date":
      return result([new Date().toISOString()]);
    case "uptime":
      return result([uptimeLine(state)]);
    case "df":
      return result(diskLines(context));
    case "du":
      return handleDu(root, cwd, command.args);
    case "wc":
      return handleWc(root, cwd, command.args);
    case "echo":
      return result([command.args.join(" ")]);
    case "man":
      return handleMan(command.args);
    case "which":
      return handleWhich(command.args);
    case "alias":
      return result(["ll='ls -a'", "la='ls -a'", "cls='clear'"]);
    case "whoami":
      return result([`${player.name}@${player.team}`]);
    case "hostname":
      return result([`${player.team}-node`]);
    case "env":
      return result(envLines(state, player));
    case "ps":
      return result(processLines(state, player));
    case "kill":
      return handleKill(command.args);
    case "history":
      return result(historyLines(state, playerId));
    case "clear":
      return result(["\x1b[2J\x1b[H"]);
    default:
      return null;
  }
}

function handleLs(root, cwd, args) {
  const all = args.includes("-a") || args.includes("-la") || args.includes("-al");
  const targetArg = args.find((arg) => !arg.startsWith("-")) || ".";
  const listed = listDirectory(root, normalizePath(cwd, targetArg), { all });
  if (!listed.ok) return result([listed.error], { error: true });
  if (listed.entries.length === 0) return result(["(empty)"]);
  return result(listed.entries.map((entry) => {
    const suffix = entry.type === "dir" ? "/" : "";
    const locked = entry.locked ? " [locked]" : "";
    const planted = entry.plantedBy ? ` [planted:${entry.plantedBy}]` : "";
    const mode = entry.mode ? ` ${entry.mode}` : "";
    return `${entry.name}${suffix}${locked}${planted}${mode}`;
  }));
}

function handleCd(state, playerId, root, cwd, args) {
  const target = normalizePath(cwd, args[0] || "/");
  const changed = changeDirectory(root, target);
  if (!changed.ok) return result([changed.error], { error: true });
  state.teams[state.players[playerId].team].cwd[playerId] = changed.path;
  return result([changed.path]);
}

function handleCat(root, cwd, args) {
  if (!args[0]) return result(["usage: cat <file>"], { error: true });
  const read = readFile(root, normalizePath(cwd, args[0]));
  if (!read.ok) return result([read.error], { error: true });
  return result(read.content.split("\n"));
}

function handleGrep(root, cwd, args) {
  if (args.length < 2) return result(["usage: grep <term> <path>"], { error: true });
  const found = grep(root, normalizePath(cwd, args[1]), args[0]);
  if (!found.ok) return result([found.error], { error: true });
  if (found.matches.length === 0) return result(["no matches"]);
  return result(found.matches.map((match) => `${match.path}:${match.line} ${match.text}`));
}

function handleFind(root, cwd, args) {
  const start = normalizePath(cwd, args[0] && !args[0].startsWith("-") ? args[0] : ".");
  const term = args[1] || "";
  const found = findNodes(root, start, term);
  if (!found.ok) return result([found.error], { error: true });
  if (found.matches.length === 0) return result(["no matches"]);
  return result(found.matches.map((match) => match.path));
}

function handleTree(root, cwd, args) {
  const all = args.includes("-a");
  const targetArg = args.find((arg) => arg !== "-a") || ".";
  const rendered = treeLines(root, normalizePath(cwd, targetArg), { all });
  if (!rendered.ok) return result([rendered.error], { error: true });
  return result(rendered.lines);
}

function handleHeadTail(root, cwd, args, mode) {
  const parsed = parseLineCount(args);
  if (!parsed.file) return result([`usage: ${mode} [-n count] <file>`], { error: true });
  const read = readFile(root, normalizePath(cwd, parsed.file));
  if (!read.ok) return result([read.error], { error: true });
  const lines = read.content.split("\n");
  return result(mode === "head" ? lines.slice(0, parsed.count) : lines.slice(-parsed.count));
}

function handleTouch(root, cwd, args) {
  if (!args[0]) return result(["usage: touch <file>"], { error: true });
  const target = normalizePath(cwd, args[0]);
  const existing = readFile(root, target);
  if (existing.ok) return result([target]);
  const written = writeFile(root, target, "");
  if (!written.ok) return result([written.error], { error: true });
  return result([written.path]);
}

function handleMkdir(root, cwd, args) {
  if (!args[0]) return result(["usage: mkdir <path>"], { error: true });
  const made = makeDirectory(root, normalizePath(cwd, args[0]));
  if (!made.ok) return result([made.error], { error: true });
  return result([made.path]);
}

function handleRm(root, cwd, args) {
  const filtered = args.filter((arg) => arg !== "-r" && arg !== "-rf" && arg !== "-f");
  if (!filtered[0]) return result(["usage: rm <path>"], { error: true });
  const removed = removeNode(root, normalizePath(cwd, filtered[0]));
  if (!removed.ok) return result([removed.error], { error: true });
  return result([`removed ${removed.path}`]);
}

function handleCp(root, cwd, args) {
  if (args.length < 2) return result(["usage: cp <from> <to>"], { error: true });
  const copied = copyNode(root, normalizePath(cwd, args[0]), normalizePath(cwd, args[1]));
  if (!copied.ok) return result([copied.error], { error: true });
  return result([copied.path]);
}

function handleMv(root, cwd, args) {
  if (args.length < 2) return result(["usage: mv <from> <to>"], { error: true });
  const moved = moveNode(root, normalizePath(cwd, args[0]), normalizePath(cwd, args[1]));
  if (!moved.ok) return result([moved.error], { error: true });
  return result([moved.path]);
}

function handleChmod(root, cwd, args) {
  if (args.length < 2) return result(["usage: chmod <mode> <path>"], { error: true });
  const changed = chmodNode(root, normalizePath(cwd, args[1]), args[0]);
  if (!changed.ok) return result([changed.error], { error: true });
  return result([`${changed.mode} ${changed.path}`]);
}

function handleSudo(context, args, dispatch) {
  if (args.length === 0) {
    return result(["usage: sudo <command>", "sudo is simulated; no real privileges are granted."], { error: true });
  }
  const [name, ...rest] = args;
  if (!SUDO_ALLOWED.has(name)) {
    return result([`sudo: ${name}: command not permitted in arena sandbox`], { error: true });
  }
  const next = dispatch({ name, args: rest, sudo: true }, { ...context, sudo: true });
  if (next?.error) return next;
  return {
    ...next,
    lines: ["[sudo] simulated privilege granted", ...next.lines]
  };
}

function handleDu(root, cwd, args) {
  const target = normalizePath(cwd, args[0] || ".");
  const found = findNodes(root, target);
  if (!found.ok) return result([found.error], { error: true });
  return result([`${found.matches.length * 4}K\t${target}`]);
}

function handleWc(root, cwd, args) {
  if (!args[0]) return result(["usage: wc <file>"], { error: true });
  const target = normalizePath(cwd, args[0]);
  const read = readFile(root, target);
  if (!read.ok) return result([read.error], { error: true });
  const lines = read.content.length ? read.content.split("\n").length : 0;
  const words = read.content.trim() ? read.content.trim().split(/\s+/).length : 0;
  const bytes = Buffer.byteLength(read.content);
  return result([`${lines} ${words} ${bytes} ${target}`]);
}

function handleMan(args) {
  const name = args[0];
  if (!name) return result(["usage: man <command>"], { error: true });
  if (!COMMAND_NAMES.includes(name)) return result([`No manual entry for ${name}`], { error: true });
  return result([
    `${name}(1) Filefront Arena Manual`,
    `${name} is simulated inside the arena sandbox.`,
    "It never invokes the host operating system shell."
  ]);
}

function handleWhich(args) {
  if (!args[0]) return result(["usage: which <command>"], { error: true });
  if (!COMMAND_NAMES.includes(args[0])) return result([`${args[0]} not found`], { error: true });
  return result([`/bin/${args[0]}`]);
}

function envLines(state, player) {
  return [
    `USER=${player.name}`,
    `TEAM=${player.team}`,
    `HOSTNAME=${player.team}-node`,
    "SHELL=/bin/filefront",
    "ARENA=filefront-arena",
    `MATCH_STATUS=${state.status}`
  ];
}

function processLines(state, player) {
  const enemy = player.team === "red" ? "blue" : "red";
  return [
    "PID  USER       COMMAND",
    `101  root       vault-watch --team ${player.team}`,
    `143  ${player.name.padEnd(10)} filefront-shell`,
    `202  daemon     score-sync --enemy ${enemy}`
  ];
}

function handleKill(args) {
  if (!args[0]) return result(["usage: kill <pid>"], { error: true });
  return result([`signal sent to simulated pid ${args[0]}`]);
}

function historyLines(state, playerId) {
  const team = state.players[playerId].team;
  const history = state.teams[team].history[playerId] || [];
  return history.map((line, index) => `${index + 1}  ${line}`);
}

function uptimeLine(state) {
  const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
  return `up ${seconds}s, 2 teams, load average: 0.07, 0.13, 0.21`;
}

function diskLines() {
  return [
    "Filesystem      Size  Used Avail Use% Mounted on",
    "arena-root       64M   12M   52M  19% /",
    "arena-vault      16M    4M   12M  25% /vault"
  ];
}
