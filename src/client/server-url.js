export const DEFAULT_SERVER_PORT = "31337";

export function resolveServerUrl({ server, host, port = DEFAULT_SERVER_PORT } = {}) {
  const endpoint = String(server || host || "localhost").trim();
  const normalizedPort = String(port || DEFAULT_SERVER_PORT).trim();

  if (!endpoint) {
    return `http://localhost:${normalizedPort}`;
  }

  const withProtocol = hasProtocol(endpoint) ? endpoint : `http://${endpoint}`;
  const url = new URL(withProtocol);

  if (!url.port) {
    url.port = normalizedPort;
  }

  return url.toString().replace(/\/$/, "");
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}
