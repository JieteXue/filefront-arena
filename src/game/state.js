import { createAttackTracks, createToken, createWorlds, TEAMS } from "./world.js";

export const DEFAULT_DURATION_MINUTES = 20;
export const MAX_TEAM_SIZE = 5;

export function createMatchState(options = {}) {
  const durationMinutes = Number(options.durationMinutes || DEFAULT_DURATION_MINUTES);
  const tokens = {
    red: options.redToken || createToken("red"),
    blue: options.blueToken || createToken("blue")
  };
  const now = Date.now();

  return {
    status: "waiting",
    startedAt: now,
    endsAt: now + durationMinutes * 60_000,
    durationMinutes,
    players: {},
    teams: {
      red: { score: 0, players: [], cwd: {}, cooldowns: {}, history: {} },
      blue: { score: 0, players: [], cwd: {}, cooldowns: {}, history: {} }
    },
    tokens,
    worlds: createWorlds(tokens),
    attack: createAttackTracks(tokens),
    events: [],
    ended: null
  };
}

export function publicState(state) {
  return {
    status: state.status,
    remainingSeconds: remainingSeconds(state),
    teams: {
      red: publicTeam(state, "red"),
      blue: publicTeam(state, "blue")
    },
    ended: state.ended
  };
}

export function joinMatch(state, playerId, name, team) {
  const normalizedTeam = String(team || "").toLowerCase();
  if (!TEAMS.includes(normalizedTeam)) {
    return { ok: false, error: "team must be red or blue" };
  }
  if (state.teams[normalizedTeam].players.length >= MAX_TEAM_SIZE) {
    return { ok: false, error: `${normalizedTeam} team is full` };
  }

  const playerName = String(name || "operator").slice(0, 24);
  state.players[playerId] = { id: playerId, name: playerName, team: normalizedTeam };
  state.teams[normalizedTeam].players.push(playerId);
  state.teams[normalizedTeam].cwd[playerId] = "/";
  state.teams[normalizedTeam].history[playerId] = [];
  state.status = "running";
  pushEvent(state, `${playerName} joined ${normalizedTeam}.`);
  return { ok: true, player: state.players[playerId] };
}

export function leaveMatch(state, playerId) {
  const player = state.players[playerId];
  if (!player) return;
  const team = state.teams[player.team];
  team.players = team.players.filter((id) => id !== playerId);
  delete team.cwd[playerId];
  delete team.cooldowns[playerId];
  delete team.history[playerId];
  delete state.players[playerId];
  pushEvent(state, `${player.name} disconnected.`);
}

export function addScore(state, team, amount) {
  state.teams[team].score += amount;
}

export function pushEvent(state, message) {
  const event = { at: Date.now(), message };
  state.events.push(event);
  state.events = state.events.slice(-100);
  return event;
}

export function remainingSeconds(state, now = Date.now()) {
  if (state.ended) return 0;
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}

export function checkTimeLimit(state, now = Date.now()) {
  if (state.ended || remainingSeconds(state, now) > 0) return null;
  const red = state.teams.red.score;
  const blue = state.teams.blue.score;
  const winner = red === blue ? "draw" : red > blue ? "red" : "blue";
  state.ended = { winner, reason: "time", scores: { red, blue } };
  state.status = "ended";
  pushEvent(state, `Match ended by time. Winner: ${winner}.`);
  return state.ended;
}

function publicTeam(state, team) {
  return {
    score: state.teams[team].score,
    players: state.teams[team].players.map((id) => state.players[id]?.name).filter(Boolean)
  };
}
