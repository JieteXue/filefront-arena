export const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m"
};

export function setTerminalTitle(title) {
  return `\x1b]0;${title}\x07`;
}

export function teamColor(team) {
  return team === "red" ? ANSI.red : team === "blue" ? ANSI.blue : ANSI.cyan;
}

export function banner({ role, team, name }) {
  const color = role === "OP" ? teamColor(team) : role === "OPS" ? ANSI.green : ANSI.magenta;
  const title = `${role} | ${team.toUpperCase()} | ${name}`;
  const line = "=".repeat(Math.max(36, title.length + 8));
  return [
    `${color}${ANSI.bold}${line}${ANSI.reset}`,
    `${color}${ANSI.bold}  ${title}${ANSI.reset}`,
    `${color}${ANSI.bold}${line}${ANSI.reset}`
  ];
}
