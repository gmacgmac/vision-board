#!/usr/bin/env node
// Validates every primitive file in this directory and, if all checks pass,
// writes index.json per CONTRACT.md. Node 22, no dependencies.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = "index.json";

const VALID_KINDS = new Set(["node", "attachment"]);
const VALID_STAGES = new Set(["in", "make", "out"]);
const VALID_FAMILIES = new Set(["live", "files", "managed", "uplynk", "destination"]);
const VALID_ICONS = new Set([
  "signal", "file", "cloud", "cog", "layers", "broadcast", "calendar",
  "scissors", "doc", "globe", "play", "share", "tv", "server", "box",
  "lock", "dollar", "cc", "image", "ban", "tag", "user", "bolt", "link",
]);

const problems = [];
const warn = (msg) => problems.push(msg);

function main() {
  const files = readdirSync(__dirname).filter(
    (f) => f.endsWith(".json") && f !== INDEX_FILE
  );

  if (files.length === 0) {
    fail(["No primitive .json files found in " + __dirname]);
  }

  const primitives = [];
  const byType = new Map();

  // ---- Load + per-file structural checks ----
  for (const file of files) {
    const path = join(__dirname, file);
    const expectedType = file.replace(/\.json$/, "");
    let raw;
    try {
      raw = readFileSync(path, "utf8");
    } catch (e) {
      warn(`${file}: could not read file (${e.message})`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      warn(`${file}: invalid JSON (${e.message})`);
      continue;
    }

    if (data.type !== expectedType) {
      warn(`${file}: "type" is "${data.type}" but must equal the filename "${expectedType}"`);
    }
    if (!VALID_KINDS.has(data.kind)) {
      warn(`${file}: "kind" must be "node" or "attachment", got ${JSON.stringify(data.kind)}`);
    }
    if (!data.name || typeof data.name !== "string") {
      warn(`${file}: missing or invalid "name"`);
    }
    if (!data.description || typeof data.description !== "string") {
      warn(`${file}: missing or invalid "description"`);
    }
    if (!data.icon || !VALID_ICONS.has(data.icon)) {
      warn(`${file}: "icon" ${JSON.stringify(data.icon)} is not in the allowed ICONS list`);
    }
    if (data.family !== undefined && data.family !== null && !VALID_FAMILIES.has(data.family)) {
      warn(`${file}: "family" ${JSON.stringify(data.family)} is not a valid family`);
    }
    if (!Array.isArray(data.aliases)) {
      warn(`${file}: "aliases" must be an array`);
    } else {
      for (const a of data.aliases) {
        if (typeof a !== "string" || a !== a.toLowerCase()) {
          warn(`${file}: alias ${JSON.stringify(a)} must be a lower-case string`);
        }
      }
    }
    if (data.props !== undefined && !Array.isArray(data.props)) {
      warn(`${file}: "props" must be an array when present`);
    }

    if (data.kind === "node") {
      if (!VALID_STAGES.has(data.stage)) {
        warn(`${file}: node "stage" must be one of in/make/out, got ${JSON.stringify(data.stage)}`);
      }
      if (
        !data.inputs ||
        typeof data.inputs !== "object" ||
        !(data.inputs.max === null || typeof data.inputs.max === "number") ||
        !Array.isArray(data.inputs.from)
      ) {
        warn(`${file}: node "inputs" must be { max: number|null, from: array }`);
      } else if (data.inputs.max === 0 && data.inputs.from.length !== 0) {
        warn(`${file}: node "inputs.max" is 0 but "inputs.from" is not empty`);
      }
      if (
        !data.outputs ||
        typeof data.outputs !== "object" ||
        !(data.outputs.max === null || typeof data.outputs.max === "number") ||
        !Array.isArray(data.outputs.to)
      ) {
        warn(`${file}: node "outputs" must be { max: number|null, to: array }`);
      } else if (data.outputs.max === 0 && data.outputs.to.length !== 0) {
        warn(`${file}: node "outputs.max" is 0 but "outputs.to" is not empty`);
      }
      if (data.attachesTo !== undefined && data.attachesTo !== null) {
        warn(`${file}: node must not define "attachesTo"`);
      }
    } else if (data.kind === "attachment") {
      if (data.stage !== undefined && data.stage !== null) {
        warn(`${file}: attachment must not define "stage"`);
      }
      if (data.inputs !== undefined && data.inputs !== null) {
        warn(`${file}: attachment must not define "inputs"`);
      }
      if (data.outputs !== undefined && data.outputs !== null) {
        warn(`${file}: attachment must not define "outputs"`);
      }
      if (!Array.isArray(data.attachesTo) || data.attachesTo.length === 0) {
        warn(`${file}: attachment "attachesTo" must be a non-empty array`);
      }
    }

    if (byType.has(data.type)) {
      warn(`${file}: duplicate type "${data.type}" (already defined in ${byType.get(data.type).__file})`);
    } else if (data.type) {
      data.__file = file;
      byType.set(data.type, data);
      primitives.push(data);
    }
  }

  if (problems.length > 0) fail(problems);

  const allTypes = new Set(byType.keys());

  // ---- Cross-reference checks ----
  function checkTypeRef(type, context) {
    if (!allTypes.has(type)) {
      warn(`${context}: references unknown type "${type}"`);
    }
  }

  function checkSubflow(subflow, context) {
    if (!subflow) return;
    if (!Array.isArray(subflow.nodes) || !Array.isArray(subflow.edges)) {
      warn(`${context}: subflow must be a Plan-shaped {nodes, edges} object`);
      return;
    }
    const ids = new Set();
    for (const n of subflow.nodes) {
      if (!n.id) warn(`${context}: subflow node missing "id"`);
      else ids.add(n.id);
      checkTypeRef(n.type, `${context} subflow node "${n.id ?? "?"}"`);
      if (n.subflow) checkSubflow(n.subflow, `${context} subflow node "${n.id}"`);
    }
    for (const e of subflow.edges) {
      if (!ids.has(e.from)) warn(`${context}: subflow edge references unknown node "${e.from}"`);
      if (!ids.has(e.to)) warn(`${context}: subflow edge references unknown node "${e.to}"`);
    }
  }

  for (const data of primitives) {
    const ctx = data.__file;
    if (data.kind === "node") {
      for (const t of data.inputs?.from ?? []) checkTypeRef(t, `${ctx} inputs.from`);
      for (const t of data.outputs?.to ?? []) checkTypeRef(t, `${ctx} outputs.to`);
    } else {
      for (const t of data.attachesTo ?? []) checkTypeRef(t, `${ctx} attachesTo`);
    }
    if (data.subflow) checkSubflow(data.subflow, ctx);
  }

  if (problems.length > 0) fail(problems);

  // ---- inputs.from / outputs.to must be exact inverses across the library ----
  for (const data of primitives) {
    if (data.kind !== "node") continue;
    for (const fromType of data.inputs?.from ?? []) {
      const other = byType.get(fromType);
      if (!other) continue; // already reported as unknown type ref
      const otherTo = other.outputs?.to ?? [];
      if (!otherTo.includes(data.type)) {
        warn(
          `${data.__file}: "${data.type}" lists "${fromType}" in inputs.from, but ${other.__file} does not list "${data.type}" in outputs.to`
        );
      }
    }
  }
  for (const data of primitives) {
    if (data.kind !== "node") continue;
    for (const toType of data.outputs?.to ?? []) {
      const other = byType.get(toType);
      if (!other) continue; // already reported as unknown type ref
      const otherFrom = other.inputs?.from ?? [];
      if (!otherFrom.includes(data.type)) {
        warn(
          `${data.__file}: "${data.type}" lists "${toType}" in outputs.to, but ${other.__file} does not list "${data.type}" in inputs.from`
        );
      }
    }
  }

  // ---- Global alias uniqueness (aliases + types + lower-cased names) ----
  const aliasMap = {};
  const aliasOwner = new Map(); // key -> file, for collision reporting

  function claim(key, type, file) {
    if (aliasMap[key] !== undefined && aliasMap[key] !== type) {
      warn(
        `alias/key collision: "${key}" is claimed by both "${aliasMap[key]}" (${aliasOwner.get(key)}) and "${type}" (${file})`
      );
      return;
    }
    aliasMap[key] = type;
    aliasOwner.set(key, file);
  }

  for (const data of primitives) {
    claim(data.type, data.type, data.__file);
    claim(data.name.toLowerCase(), data.type, data.__file);
    for (const a of data.aliases ?? []) {
      claim(a, data.type, data.__file);
    }
  }

  if (problems.length > 0) fail(problems);

  // ---- Write index.json ----
  const outPrimitives = primitives.map((p) => ({
    type: p.type,
    name: p.name,
    kind: p.kind,
    stage: p.stage ?? null,
    family: p.family ?? null,
    icon: p.icon,
    description: p.description,
    aliases: p.aliases,
    ...(p.kind === "node" ? { inputs: p.inputs, outputs: p.outputs } : {}),
  }));

  // Keep deterministic ordering (by type) for stable diffs.
  outPrimitives.sort((a, b) => a.type.localeCompare(b.type));

  const sortedAliasMap = {};
  for (const key of Object.keys(aliasMap).sort()) sortedAliasMap[key] = aliasMap[key];

  const index = {
    generated: new Date().toISOString(),
    primitives: outPrimitives,
    aliasMap: sortedAliasMap,
  };

  writeFileSync(join(__dirname, INDEX_FILE), JSON.stringify(index, null, 2) + "\n");

  console.log(`OK: ${primitives.length} primitives validated, index.json written.`);
}

function fail(problemList) {
  console.error(`FAILED: ${problemList.length} problem(s) found:\n`);
  for (const p of problemList) console.error(" - " + p);
  console.error("");
  process.exit(1);
}

main();
