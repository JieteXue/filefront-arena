import assert from "node:assert/strict";
import test from "node:test";
import { runCommand } from "../src/game/engine.js";
import { createMatchState, joinMatch } from "../src/game/state.js";

test("basic commands operate on a team's virtual host", () => {
  const state = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG" });
  joinMatch(state, "p1", "alice", "red");
  assert.match(runCommand(state, "p1", "pwd").lines.join("\n"), /^\//);
  assert.match(runCommand(state, "p1", "ls /").lines.join("\n"), /home/);
  assert.match(runCommand(state, "p1", "cat /home/readme.txt").lines.join("\n"), /simulated host/);
});

test("crack exposes enemy token and submit wins", () => {
  const state = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG" });
  joinMatch(state, "p1", "alice", "red");
  let now = 1_000;
  assert.match(runCommand(state, "p1", "crack perimeter", now).lines.join("\n"), /progress/);
  now += 6_000;
  assert.match(runCommand(state, "p1", "crack perimeter", now).lines.join("\n"), /cracked/);
  now += 6_000;
  runCommand(state, "p1", "crack logs", now);
  now += 6_000;
  runCommand(state, "p1", "crack logs", now);
  now += 6_000;
  runCommand(state, "p1", "crack vault", now);
  now += 6_000;
  runCommand(state, "p1", "crack vault", now);
  now += 6_000;
  const exposed = runCommand(state, "p1", "crack vault", now);
  assert.match(exposed.lines.join("\n"), /BLUE-FLAG/);
  now += 3_000;
  const won = runCommand(state, "p1", "submit BLUE-FLAG", now);
  assert.equal(state.ended.winner, "red");
  assert.match(won.lines.join("\n"), /wins/);
});

test("bad submit deducts score", () => {
  const state = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG" });
  joinMatch(state, "p1", "alice", "red");
  runCommand(state, "p1", "submit WRONG", 1_000);
  assert.equal(state.teams.red.score, -10);
});

test("plant and clean model interference", () => {
  const state = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG" });
  joinMatch(state, "red1", "alice", "red");
  joinMatch(state, "blue1", "bob", "blue");
  const planted = runCommand(state, "red1", "plant /srv/share", 1_000);
  const match = planted.lines.join("\n").match(/blue:(\/\S+)/);
  assert.ok(match);
  const path = match[1];
  const cleaned = runCommand(state, "blue1", `clean ${path}`, 1_000);
  assert.match(cleaned.lines.join("\n"), /cleaned/);
  assert.equal(state.teams.blue.score, 5);
});

test("shell-like commands operate only on the virtual host", () => {
  const state = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG" });
  joinMatch(state, "p1", "alice", "red");

  assert.match(runCommand(state, "p1", "mkdir /home/work").lines.join("\n"), /\/home\/work/);
  assert.match(runCommand(state, "p1", "touch /home/work/note.txt").lines.join("\n"), /note/);
  assert.match(runCommand(state, "p1", "cp /home/readme.txt /home/work/readme.copy").lines.join("\n"), /readme.copy/);
  assert.match(runCommand(state, "p1", "mv /home/work/readme.copy /home/work/readme.moved").lines.join("\n"), /readme.moved/);
  assert.match(runCommand(state, "p1", "find /home moved").lines.join("\n"), /readme.moved/);
  assert.match(runCommand(state, "p1", "tree /home/work").lines.join("\n"), /note.txt/);
  assert.match(runCommand(state, "p1", "head -n 1 /home/readme.txt").lines.join("\n"), /RED node/);
  assert.match(runCommand(state, "p1", "tail -n 1 /home/readme.txt").lines.join("\n"), /sealed/);
  assert.match(runCommand(state, "p1", "chmod 600 /home/work/note.txt").lines.join("\n"), /600/);
  assert.match(runCommand(state, "p1", "rm /home/work/note.txt").lines.join("\n"), /removed/);
});

test("pseudo system commands report simulated state", () => {
  const state = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG" });
  joinMatch(state, "p1", "alice", "red");

  assert.match(runCommand(state, "p1", "whoami").lines.join("\n"), /alice@red/);
  assert.match(runCommand(state, "p1", "hostname").lines.join("\n"), /red-node/);
  assert.match(runCommand(state, "p1", "env").lines.join("\n"), /SHELL=\/bin\/filefront/);
  assert.match(runCommand(state, "p1", "ps").lines.join("\n"), /vault-watch/);
  assert.match(runCommand(state, "p1", "kill 101").lines.join("\n"), /simulated pid 101/);
  assert.match(runCommand(state, "p1", "history").lines.join("\n"), /whoami/);
});

test("additional safe pseudo linux commands are simulated", () => {
  const state = createMatchState({ redToken: "RED-FLAG", blueToken: "BLUE-FLAG" });
  joinMatch(state, "p1", "alice", "red");

  assert.match(runCommand(state, "p1", "sudo cat /home/readme.txt").lines.join("\n"), /simulated privilege/);
  assert.match(runCommand(state, "p1", "sudo plant /srv/share").lines.join("\n"), /not permitted/);
  assert.match(runCommand(state, "p1", "su root").lines.join("\n"), /authentication failure/);
  assert.match(runCommand(state, "p1", "id").lines.join("\n"), /uid=1000/);
  assert.match(runCommand(state, "p1", "groups").lines.join("\n"), /operators/);
  assert.match(runCommand(state, "p1", "uname -a").lines.join("\n"), /FilefrontOS/);
  assert.match(runCommand(state, "p1", "date").lines.join("\n"), /T/);
  assert.match(runCommand(state, "p1", "uptime").lines.join("\n"), /load average/);
  assert.match(runCommand(state, "p1", "df").lines.join("\n"), /arena-root/);
  assert.match(runCommand(state, "p1", "du /home").lines.join("\n"), /\/home/);
  assert.match(runCommand(state, "p1", "wc /home/readme.txt").lines.join("\n"), /\/home\/readme.txt/);
  assert.match(runCommand(state, "p1", "echo hello arena").lines.join("\n"), /hello arena/);
  assert.match(runCommand(state, "p1", "man sudo").lines.join("\n"), /simulated/);
  assert.match(runCommand(state, "p1", "which sudo").lines.join("\n"), /\/bin\/sudo/);
  assert.match(runCommand(state, "p1", "alias").lines.join("\n"), /ll=/);
});
