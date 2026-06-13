export function result(lines, options = {}) {
  return { lines, ...options };
}

export function parseLineCount(args) {
  let count = 10;
  let fileArg = args[0];
  if (args[0] === "-n") {
    count = Math.max(1, Number(args[1] || 10));
    fileArg = args[2];
  } else if (args[0]?.startsWith("-n")) {
    count = Math.max(1, Number(args[0].slice(2) || 10));
    fileArg = args[1];
  }
  return { count, file: fileArg };
}
