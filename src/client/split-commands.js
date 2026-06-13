export function buildClientCommands({ projectRoot, server, name, team, runner = ["npm", "run", "client", "--"] }) {
  const runnerTokens = Array.isArray(runner) ? runner : String(runner).split(/\s+/).filter(Boolean);
  return [
    {
      title: `OP ${team.toUpperCase()} ${name}`,
      command: [
        "cd",
        projectRoot,
        ...runnerTokens,
        "--server",
        server,
        "--name",
        name,
        "--team",
        team,
        "--ui",
        "native"
      ]
    },
    {
      title: `INFO ${team.toUpperCase()} ${name}`,
      command: [
        "cd",
        projectRoot,
        ...runnerTokens,
        "--server",
        server,
        "--name",
        `${name}-info`,
        "--team",
        team,
        "--ui",
        "monitor",
        "--watch"
      ]
    },
    {
      title: `OPS ${team.toUpperCase()} ${name}`,
      command: [
        "cd",
        projectRoot,
        ...runnerTokens,
        "--server",
        server,
        "--name",
        `${name}-ops`,
        "--team",
        team,
        "--ui",
        "monitor",
        "--ops"
      ]
    }
  ];
}

export function toPosixCommand(parts) {
  return [
    `cd ${shellQuote(parts[1])}`,
    parts.slice(2).map(shellQuote).join(" ")
  ].join(" && ");
}

export function toPowerShellCommand(parts) {
  return [
    `Set-Location -LiteralPath ${powerShellQuote(parts[1])}`,
    parts.slice(2).map(powerShellQuote).join(" ")
  ].join("; ");
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function powerShellQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
