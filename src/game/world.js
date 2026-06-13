import { dir, file } from "./vfs.js";

export const TEAMS = ["red", "blue"];

export function otherTeam(team) {
  return team === "red" ? "blue" : "red";
}

export function createTeamWorld(team, token) {
  return dir({
    home: dir({
      "readme.txt": file([
        `${team.toUpperCase()} node online.`,
        "This is a simulated host. No real files are touched.",
        "Watch /var/log, harden /srv/share, and keep /vault sealed."
      ].join("\n")),
      "ops-notes.txt": file([
        "Useful commands:",
        "scan <team>",
        "crack <target>",
        "harden <target>",
        "clean <target>",
        "submit <token>"
      ].join("\n"))
    }),
    var: dir({
      log: dir({
        "auth.log": file([
          "00:00 sshd accepted training key",
          "00:01 vault watcher armed",
          "00:02 decoy token rotated"
        ].join("\n")),
        "defense.log": file("No hostile changes detected.")
      })
    }),
    srv: dir({
      share: dir({
        "banner.txt": file("Public share. Attackers can plant noise here."),
        "ports.txt": file("open: share, logs\nfiltered: vault")
      })
    }),
    vault: dir({
      "hint.txt": file("The token is sealed. Crack perimeter, logs, and vault to expose it."),
      "token.txt": file(token, { locked: true })
    }, { locked: true })
  });
}

export function createWorlds(tokens) {
  return {
    red: createTeamWorld("red", tokens.red),
    blue: createTeamWorld("blue", tokens.blue)
  };
}

export function createToken(team) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${team.toUpperCase()}-${random}-FLAG`;
}

export function createAttackTracks(tokens) {
  return {
    red: createTrack(tokens.red),
    blue: createTrack(tokens.blue)
  };
}

function createTrack(token) {
  return {
    perimeter: {
      label: "perimeter",
      defense: 0,
      progress: 0,
      required: 2,
      cracked: false,
      clue: "logs"
    },
    logs: {
      label: "logs",
      defense: 0,
      progress: 0,
      required: 2,
      cracked: false,
      clue: "vault"
    },
    vault: {
      label: "vault",
      defense: 0,
      progress: 0,
      required: 3,
      cracked: false,
      clue: token
    }
  };
}
