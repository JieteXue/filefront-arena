import path from "node:path/posix";

export function dir(children = {}, options = {}) {
  return { type: "dir", children, ...options };
}

export function file(content = "", options = {}) {
  return { type: "file", content, ...options };
}

export function cloneNode(node) {
  if (node.type === "file") return file(node.content, copyOptions(node));
  const children = {};
  for (const [name, child] of Object.entries(node.children)) {
    children[name] = cloneNode(child);
  }
  return dir(children, copyOptions(node));
}

export function normalizePath(currentPath, inputPath = ".") {
  const raw = String(inputPath || ".").trim() || ".";
  const base = raw.startsWith("/") ? raw : path.join(currentPath, raw);
  const normalized = path.normalize(base);
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function getNode(root, targetPath) {
  const normalized = normalizePath("/", targetPath);
  if (normalized === "/") return { node: root, path: "/" };

  const parts = normalized.split("/").filter(Boolean);
  let node = root;
  for (const part of parts) {
    if (!node || node.type !== "dir") {
      return { node: null, path: normalized, reason: "not_dir" };
    }
    if (node.locked) {
      return { node, path: normalized, reason: "locked" };
    }
    node = node.children[part];
  }

  if (!node) return { node: null, path: normalized, reason: "missing" };
  if (node.locked) return { node, path: normalized, reason: "locked" };
  return { node, path: normalized };
}

export function listDirectory(root, targetPath, options = {}) {
  const result = getNode(root, targetPath);
  if (!result.node) return { ok: false, error: notFound(result.path, result.reason) };
  if (result.reason === "locked") return { ok: false, error: `access denied: ${result.path}` };
  if (result.node.type !== "dir") return { ok: false, error: `not a directory: ${result.path}` };

  const entries = Object.entries(result.node.children)
    .filter(([name, node]) => options.all || (!name.startsWith(".") && !node.hidden))
    .map(([name, node]) => ({
      name,
      type: node.type,
      locked: Boolean(node.locked),
      hidden: Boolean(node.hidden),
      plantedBy: node.plantedBy || null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { ok: true, path: result.path, entries };
}

export function readFile(root, targetPath) {
  const result = getNode(root, targetPath);
  if (!result.node) return { ok: false, error: notFound(result.path, result.reason) };
  if (result.reason === "locked") return { ok: false, error: `access denied: ${result.path}` };
  if (result.node.type !== "file") return { ok: false, error: `not a file: ${result.path}` };
  return { ok: true, path: result.path, content: result.node.content };
}

export function changeDirectory(root, targetPath) {
  const result = getNode(root, targetPath);
  if (!result.node) return { ok: false, error: notFound(result.path, result.reason) };
  if (result.reason === "locked") return { ok: false, error: `access denied: ${result.path}` };
  if (result.node.type !== "dir") return { ok: false, error: `not a directory: ${result.path}` };
  return { ok: true, path: result.path };
}

export function writeFile(root, targetPath, content, options = {}) {
  const normalized = normalizePath("/", targetPath);
  const parentPath = path.dirname(normalized);
  const name = path.basename(normalized);
  const parent = getNode(root, parentPath);
  if (!parent.node) return { ok: false, error: notFound(parent.path, parent.reason) };
  if (parent.reason === "locked") return { ok: false, error: `access denied: ${parent.path}` };
  if (parent.node.type !== "dir") return { ok: false, error: `not a directory: ${parent.path}` };
  parent.node.children[name] = file(content, options);
  return { ok: true, path: normalized };
}

export function makeDirectory(root, targetPath, options = {}) {
  const normalized = normalizePath("/", targetPath);
  if (normalized === "/") return { ok: false, error: "cannot create root" };
  const parentPath = path.dirname(normalized);
  const name = path.basename(normalized);
  const parent = getNode(root, parentPath);
  if (!parent.node) return { ok: false, error: notFound(parent.path, parent.reason) };
  if (parent.reason === "locked") return { ok: false, error: `access denied: ${parent.path}` };
  if (parent.node.type !== "dir") return { ok: false, error: `not a directory: ${parent.path}` };
  if (parent.node.children[name]) return { ok: false, error: `already exists: ${normalized}` };
  parent.node.children[name] = dir({}, options);
  return { ok: true, path: normalized };
}

export function copyNode(root, fromPath, toPath) {
  const source = getNode(root, fromPath);
  if (!source.node) return { ok: false, error: notFound(source.path, source.reason) };
  if (source.reason === "locked") return { ok: false, error: `access denied: ${source.path}` };

  const normalizedTarget = normalizePath("/", toPath);
  const existingTarget = getNode(root, normalizedTarget);
  const finalPath = existingTarget.node?.type === "dir"
    ? path.join(existingTarget.path, path.basename(source.path))
    : normalizedTarget;
  const parentPath = path.dirname(finalPath);
  const name = path.basename(finalPath);
  const parent = getNode(root, parentPath);
  if (!parent.node) return { ok: false, error: notFound(parent.path, parent.reason) };
  if (parent.reason === "locked") return { ok: false, error: `access denied: ${parent.path}` };
  if (parent.node.type !== "dir") return { ok: false, error: `not a directory: ${parent.path}` };
  parent.node.children[name] = cloneNode(source.node);
  return { ok: true, path: finalPath };
}

export function moveNode(root, fromPath, toPath) {
  const copied = copyNode(root, fromPath, toPath);
  if (!copied.ok) return copied;
  const removed = removeNode(root, fromPath);
  if (!removed.ok) return removed;
  return copied;
}

export function chmodNode(root, targetPath, mode) {
  const result = getNode(root, targetPath);
  if (!result.node) return { ok: false, error: notFound(result.path, result.reason) };
  if (result.reason === "locked") return { ok: false, error: `access denied: ${result.path}` };
  result.node.mode = mode;
  return { ok: true, path: result.path, mode };
}

export function removeNode(root, targetPath, predicate = () => true) {
  const normalized = normalizePath("/", targetPath);
  if (normalized === "/") return { ok: false, error: "cannot remove root" };
  const parentPath = path.dirname(normalized);
  const name = path.basename(normalized);
  const parent = getNode(root, parentPath);
  if (!parent.node) return { ok: false, error: notFound(parent.path, parent.reason) };
  if (parent.reason === "locked") return { ok: false, error: `access denied: ${parent.path}` };
  const node = parent.node.children[name];
  if (!node) return { ok: false, error: `not found: ${normalized}` };
  if (!predicate(node)) return { ok: false, error: `cannot remove: ${normalized}` };
  delete parent.node.children[name];
  return { ok: true, path: normalized };
}

export function grep(root, startPath, term) {
  const result = getNode(root, startPath);
  if (!result.node) return { ok: false, error: notFound(result.path, result.reason) };
  if (result.reason === "locked") return { ok: false, error: `access denied: ${result.path}` };

  const matches = [];
  walk(result.node, result.path, (filePath, node) => {
    node.content.split("\n").forEach((line, index) => {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        matches.push({ path: filePath, line: index + 1, text: line });
      }
    });
  });
  return { ok: true, matches };
}

export function findNodes(root, startPath, pattern = "") {
  const result = getNode(root, startPath);
  if (!result.node) return { ok: false, error: notFound(result.path, result.reason) };
  if (result.reason === "locked") return { ok: false, error: `access denied: ${result.path}` };
  const needle = pattern.toLowerCase();
  const matches = [];
  walkAny(result.node, result.path, (nodePath, node) => {
    if (!needle || path.basename(nodePath).toLowerCase().includes(needle)) {
      matches.push({ path: nodePath, type: node.type });
    }
  });
  return { ok: true, matches };
}

export function treeLines(root, startPath, options = {}) {
  const result = getNode(root, startPath);
  if (!result.node) return { ok: false, error: notFound(result.path, result.reason) };
  if (result.reason === "locked") return { ok: false, error: `access denied: ${result.path}` };
  if (result.node.type !== "dir") return { ok: false, error: `not a directory: ${result.path}` };

  const lines = [result.path];
  renderTree(result.node, "", lines, options);
  return { ok: true, lines };
}

function walk(node, currentPath, onFile) {
  if (node.locked) return;
  if (node.type === "file") {
    onFile(currentPath, node);
    return;
  }
  for (const [name, child] of Object.entries(node.children)) {
    if (child.hidden) continue;
    walk(child, path.join(currentPath, name), onFile);
  }
}

function walkAny(node, currentPath, onNode) {
  if (node.locked) return;
  onNode(currentPath, node);
  if (node.type === "file") return;
  for (const [name, child] of Object.entries(node.children)) {
    if (child.hidden) continue;
    walkAny(child, path.join(currentPath, name), onNode);
  }
}

function renderTree(node, prefix, lines, options) {
  const entries = Object.entries(node.children || {})
    .filter(([name, child]) => options.all || (!name.startsWith(".") && !child.hidden))
    .sort(([a], [b]) => a.localeCompare(b));
  entries.forEach(([name, child], index) => {
    const last = index === entries.length - 1;
    const branch = last ? "`-- " : "|-- ";
    const nextPrefix = prefix + (last ? "    " : "|   ");
    const suffix = child.type === "dir" ? "/" : "";
    const locked = child.locked ? " [locked]" : "";
    lines.push(`${prefix}${branch}${name}${suffix}${locked}`);
    if (child.type === "dir" && !child.locked) {
      renderTree(child, nextPrefix, lines, options);
    }
  });
}

function copyOptions(node) {
  const { type, children, content, ...options } = node;
  return { ...options };
}

function notFound(targetPath, reason) {
  if (reason === "locked") return `access denied: ${targetPath}`;
  return `not found: ${targetPath}`;
}
