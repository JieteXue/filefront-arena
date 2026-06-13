import assert from "node:assert/strict";
import test from "node:test";
import { checkTimeLimit, createMatchState, joinMatch, MAX_TEAM_SIZE } from "../src/game/state.js";

test("rejects invalid and full teams", () => {
  const state = createMatchState();
  assert.equal(joinMatch(state, "bad", "mallory", "green").ok, false);
  for (let index = 0; index < MAX_TEAM_SIZE; index += 1) {
    assert.equal(joinMatch(state, `r${index}`, `r${index}`, "red").ok, true);
  }
  assert.equal(joinMatch(state, "overflow", "extra", "red").ok, false);
});

test("time limit chooses score winner or draw", () => {
  const state = createMatchState({ durationMinutes: 1 });
  state.startedAt = 0;
  state.endsAt = 1_000;
  state.teams.blue.score = 10;
  const ended = checkTimeLimit(state, 2_000);
  assert.equal(ended.winner, "blue");
  assert.equal(state.status, "ended");
});
