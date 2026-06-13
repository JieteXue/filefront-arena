import { io } from "socket.io-client";

export function createSocket(serverUrl) {
  return io(serverUrl, { transports: ["websocket", "polling"] });
}

export function sendCommand(socket, line) {
  if (line.startsWith("/chat ")) {
    socket.emit("chat", line.slice(6));
  } else {
    socket.emit("command", line);
  }
}

export function summarizeState(state) {
  return JSON.stringify({
    status: state.status,
    redScore: state.teams.red.score,
    blueScore: state.teams.blue.score,
    redPlayers: state.teams.red.players,
    bluePlayers: state.teams.blue.players,
    ended: state.ended
  });
}

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
