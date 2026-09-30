#!/usr/bin/env node
// Uplynk Architect — static server + API + `claude -p` bridge.
// Node 22, built-in modules only. No npm, no package.json.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths / config
// ---------------------------------------------------------------------------

const APP_DIR = path.dirname(fileURLToPath(import.meta.url)); // .../prototypes/architect/app
const REPO_ROOT = path.dirname(APP_DIR);                      // .../prototypes/architect

const PRIMITIVES_DIR = process.env.PRIMITIVES_DIR
  ? path.resolve(process.env.PRIMITIVES_DIR)
  : path.join(REPO_ROOT, 'primitives');

const PLANS_DIR = process.env.PLANS_DIR
  ? path.resolve(process.env.PLANS_DIR)
  : path.join(REPO_ROOT, 'plans');

const RULES_DIR = process.env.RULES_DIR
  ? path.resolve(process.env.RULES_DIR)
  : path.join(REPO_ROOT, 'rules');

const PROMPT_PATH = process.env.ARCHITECT_PROMPT
  ? path.resolve(process.env.ARCHITECT_PROMPT)
  : path.join(REPO_ROOT, 'prompts', 'architect.md');

const MODEL = process.env.ARCHITECT_MODEL || 'sonnet';
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const PORT = Number(process.env.PORT) || 4455;
const HOST = '127.0.0.1';
const PROPOSE_TIMEOUT_MS = 150000;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Primitives (loaded fresh at request time — other agents write these files
// concurrently; we never cache them beyond a single request).
// ---------------------------------------------------------------------------

function loadPrimitives() {
  let files = [];
  try {
    files = fs.readdirSync(PRIMITIVES_DIR);
  } catch {
    files = [];
  }

  const primitives = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    if (f === 'index.json') continue; // that's the generated summary, not a primitive
    const full = path.join(PRIMITIVES_DIR, f);
    const data = readJsonSafe(full);
    if (data && typeof data === 'object' && data.type) {
      primitives.push(data);
    }
  }

  const byType = new Map();
  for (const p of primitives) byType.set(p.type, p);

  let aliasMap = {};
  const indexPath = path.join(PRIMITIVES_DIR, 'index.json');
  const indexData = readJsonSafe(indexPath);
  if (indexData && typeof indexData.aliasMap === 'object' && indexData.aliasMap) {
    aliasMap = indexData.aliasMap;
  }

  return { primitives, byType, aliasMap };
}

function compactPrimitive(p) {
  return {
    type: p.type,
    name: p.name,
    kind: p.kind,
    stage: p.stage,
    family: p.family,
    description: p.description,
    aliases: p.aliases || [],
    props: p.props || [],
    providers: p.providers || [],
    inputs: p.inputs || null,
    outputs: p.outputs || null,
    attachesTo: p.attachesTo || [],
    hasSubflow: Boolean(p.subflow),
  };
}

// ---------------------------------------------------------------------------
// Rules (loaded fresh at request time, same as primitives)
// ---------------------------------------------------------------------------

function loadRules() {
  const file = path.join(RULES_DIR, 'platform-rules.json');
  const data = readJsonSafe(file);
  if (data && Array.isArray(data.rules)) return data.rules;
  return [];
}

// ---------------------------------------------------------------------------
// Plans on disk
// ---------------------------------------------------------------------------

function planDir(id) {
  return path.join(PLANS_DIR, id);
}

// Returns sorted list of version numbers that exist for a plan id.
function listVersionNumbers(id) {
  const dir = planDir(id);
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const versions = [];
  for (const f of files) {
    const m = /^v(\d+)\.json$/.exec(f);
    if (m) versions.push(Number(m[1]));
  }
  versions.sort((a, b) => a - b);
  return versions;
}

function listPlanIds() {
  let entries = [];
  try {
    entries = fs.readdirSync(PLANS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

function readPlanVersion(id, version) {
  const file = path.join(planDir(id), `v${version}.json`);
  return readJsonSafe(file);
}

function readLatestPlan(id) {
  const versions = listVersionNumbers(id);
  if (versions.length === 0) return null;
  const version = versions[versions.length - 1];
  const plan = readPlanVersion(id, version);
  if (!plan) return null;
  return { version, plan };
}

function writePlanVersion(id, plan) {
  ensureDir(planDir(id));
  const file = path.join(planDir(id), `v${plan.version}.json`);
  fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n', 'utf8');
}

function appendLog(id, entry) {
  ensureDir(planDir(id));
  const file = path.join(planDir(id), 'log.jsonl');
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// Validation of planner output against the primitive catalogue and the
// platform rules. Runs independently on the top-level {nodes, edges} and on
// every node's non-null subflow (which is itself a Plan-shaped scope).
// ---------------------------------------------------------------------------

// "Live signal (signal-in)" — node label plus type in parentheses, the
// format every problem sentence uses when it names a node.
function describeNode(n) {
  if (!n) return '(unknown node)';
  const label = n.label || n.id || '(unlabeled node)';
  return `${label} (${n.type})`;
}

// Render a list of primitive types as "Name (type), Name (type)" using the
// catalogue for a friendly name where we have one, falling back to the bare
// type string otherwise.
function describeTypes(types, byType) {
  const list = Array.isArray(types) ? types : [];
  if (list.length === 0) return 'nothing';
  return list
    .map((t) => {
      const p = byType.get(t);
      return p && p.name ? `${p.name} (${t})` : t;
    })
    .join(', ');
}

function protocolMatches(protocol, abrProtocols) {
  if (!protocol || !Array.isArray(abrProtocols) || abrProtocols.length === 0) return false;
  const p = String(protocol).toLowerCase();
  return abrProtocols.some((x) => String(x).toLowerCase() === p);
}

function validatePlanShape(planLike, byType, rules = [], pathPrefix = '') {
  const problems = [];
  const nodes = Array.isArray(planLike.nodes) ? planLike.nodes : [];
  const edges = Array.isArray(planLike.edges) ? planLike.edges : [];

  const seenIds = new Set();
  const nodesById = new Map();
  for (const n of nodes) {
    if (!n || typeof n.id !== 'string' || !n.id) {
      problems.push(`${pathPrefix}a node is missing a string id`);
      continue;
    }
    if (seenIds.has(n.id)) {
      problems.push(`${pathPrefix}duplicate node id: ${n.id}`);
    }
    seenIds.add(n.id);
    nodesById.set(n.id, n);
  }

  for (const n of nodes) {
    if (!n || !n.id || !seenIds.has(n.id)) continue;
    const label = `${pathPrefix}${describeNode(n)}`;

    const prim = byType.get(n.type);
    if (!prim) {
      problems.push(`${label}: type ${JSON.stringify(n.type)} is not a known primitive`);
    } else if (prim.kind !== 'node') {
      problems.push(`${label}: type ${JSON.stringify(n.type)} has kind ${JSON.stringify(prim.kind)}, expected "node"`);
    }

    const attachments = Array.isArray(n.attachments) ? n.attachments : [];
    for (const a of attachments) {
      const aprim = a && byType.get(a.type);
      if (!aprim) {
        problems.push(`${label}: attachment type ${JSON.stringify(a && a.type)} is not a known primitive`);
        continue;
      }
      if (aprim.kind !== 'attachment') {
        problems.push(`${label}: attachment type ${JSON.stringify(a.type)} has kind ${JSON.stringify(aprim.kind)}, expected "attachment"`);
        continue;
      }
      const attachesTo = Array.isArray(aprim.attachesTo) ? aprim.attachesTo : [];
      if (attachesTo.length > 0 && !attachesTo.includes(n.type)) {
        problems.push(
          `${pathPrefix}${aprim.name || a.type} (${a.type}) attachment cannot be placed on ${describeNode(n)}; it attaches to ${describeTypes(attachesTo, byType)}.`
        );
      }
    }

    if (n.subflow && typeof n.subflow === 'object') {
      problems.push(...validatePlanShape(n.subflow, byType, rules, `${label} subflow: `));
    }
  }

  for (const e of edges) {
    if (!e || typeof e.from !== 'string' || typeof e.to !== 'string') {
      problems.push(`${pathPrefix}an edge is missing "from"/"to"`);
      continue;
    }
    if (!seenIds.has(e.from)) {
      problems.push(`${pathPrefix}edge references unknown "from" node: ${e.from}`);
    }
    if (!seenIds.has(e.to)) {
      problems.push(`${pathPrefix}edge references unknown "to" node: ${e.to}`);
    }
  }

  // From here on we only look at edges whose endpoints resolved to real
  // nodes in this scope — dangling edges were already reported above.
  const validEdges = edges.filter(
    (e) => e && typeof e.from === 'string' && typeof e.to === 'string' && seenIds.has(e.from) && seenIds.has(e.to)
  );

  // Edge A→B allowed only if B.type is in A.outputs.to and A.type is in
  // B.inputs.from.
  for (const e of validEdges) {
    const A = nodesById.get(e.from);
    const B = nodesById.get(e.to);
    const aPrim = byType.get(A.type);
    const bPrim = byType.get(B.type);
    if (!aPrim || !bPrim) continue; // already reported as unknown type above

    const aOut = aPrim.outputs && Array.isArray(aPrim.outputs.to) ? aPrim.outputs.to : [];
    const bIn = bPrim.inputs && Array.isArray(bPrim.inputs.from) ? bPrim.inputs.from : [];
    if (!aOut.includes(B.type) || !bIn.includes(A.type)) {
      problems.push(
        `${pathPrefix}${describeNode(A)} cannot feed ${describeNode(B)}; ${describeNode(B)} accepts input only from ${describeTypes(bIn, byType)}.`
      );
    }
  }

  // Incoming/outgoing edge counts vs inputs.max / outputs.max.
  const incoming = new Map();
  const outgoing = new Map();
  for (const e of validEdges) {
    incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
    outgoing.set(e.from, (outgoing.get(e.from) || 0) + 1);
  }

  for (const n of nodes) {
    if (!n || !n.id || !seenIds.has(n.id)) continue;
    const prim = byType.get(n.type);
    if (!prim) continue;

    const maxIn = prim.inputs && Object.prototype.hasOwnProperty.call(prim.inputs, 'max') ? prim.inputs.max : null;
    const cin = incoming.get(n.id) || 0;
    if (maxIn !== null && cin > maxIn) {
      if (maxIn === 1) {
        problems.push(
          `[single-input-outputs] ${pathPrefix}${describeNode(n)} has ${cin} inputs but takes 1. Give each source its own ${prim.name || n.type} output, or put a Switcher in front of one destination.`
        );
      } else if (maxIn === 0) {
        problems.push(`${pathPrefix}${describeNode(n)} has ${cin} inputs but is a source and accepts none.`);
      } else {
        problems.push(`${pathPrefix}${describeNode(n)} has ${cin} inputs but takes at most ${maxIn}.`);
      }
    }

    const maxOut = prim.outputs && Object.prototype.hasOwnProperty.call(prim.outputs, 'max') ? prim.outputs.max : null;
    const cout = outgoing.get(n.id) || 0;
    if (maxOut !== null && cout > maxOut) {
      if (maxOut === 0) {
        problems.push(`${pathPrefix}${describeNode(n)} has ${cout} outputs but is a terminal node and sends none.`);
      } else {
        problems.push(`${pathPrefix}${describeNode(n)} has ${cout} outputs but allows at most ${maxOut}.`);
      }
    }
  }

  // Named rule checks. Only enforced when a rule in the rules file declares
  // that check.
  const abrPathRule = rules.find((r) => r && r.check === 'abr-path');
  const abrNoAttachRule = rules.find((r) => r && r.check === 'abr-no-attachment');

  // Is `nodeId` (in this scope) fed directly by a signal-in node whose
  // protocol counts as ABR under `abrProtocols`? Returns the feeding
  // signal-in node if so, else null.
  function abrFeeder(nodeId, abrProtocols) {
    for (const e of validEdges) {
      if (e.to !== nodeId) continue;
      const feeder = nodesById.get(e.from);
      if (feeder && feeder.type === 'signal-in' && protocolMatches(feeder.props && feeder.props.protocol, abrProtocols)) {
        return feeder;
      }
    }
    return null;
  }

  if (abrPathRule) {
    const abrProtocols = Array.isArray(abrPathRule.abrProtocols) ? abrPathRule.abrProtocols : [];
    // Ingest → Transcode / Transmux is structural (primitive inputs/outputs);
    // what's left is choosing the right ingest from the signal's protocol.
    for (const n of nodes) {
      if (!n || n.type !== 'signal-in' || !seenIds.has(n.id)) continue;
      const isAbr = protocolMatches(n.props && n.props.protocol, abrProtocols);
      for (const e of validEdges) {
        if (e.from !== n.id) continue;
        const target = nodesById.get(e.to);
        if (!target) continue;
        if (isAbr && target.type === 'cloud-ingest') {
          problems.push(
            `[${abrPathRule.id}] ${pathPrefix}${describeNode(n)} is an ABR signal (protocol ${n.props.protocol}) and must go into Cloud Ingest (ABR) (cloud-ingest-abr), not ${describeNode(target)}.`
          );
        } else if (!isAbr && target.type === 'cloud-ingest-abr') {
          problems.push(
            `[${abrPathRule.id}] ${pathPrefix}${describeNode(n)} is not an ABR signal (protocol ${(n.props && n.props.protocol) || 'not set'}); only HLS or DASH go into ${describeNode(target)}. Use Cloud Ingest (Slicer) (cloud-ingest).`
          );
        }
      }
    }
  }

  if (abrNoAttachRule && abrNoAttachRule.attachment) {
    const abrProtocols = Array.isArray(abrNoAttachRule.abrProtocols) ? abrNoAttachRule.abrProtocols : [];
    const attachmentType = abrNoAttachRule.attachment;
    for (const n of nodes) {
      if (!n || !seenIds.has(n.id)) continue;
      const attachments = Array.isArray(n.attachments) ? n.attachments : [];
      const hasAttachment = attachments.some((a) => a && a.type === attachmentType);
      if (!hasAttachment) continue;

      if (n.type === 'signal-in' && protocolMatches(n.props && n.props.protocol, abrProtocols)) {
        problems.push(
          `[${abrNoAttachRule.id}] ${pathPrefix}${describeNode(n)} carries an ABR signal (protocol ${n.props && n.props.protocol}) and may not carry a ${attachmentType} attachment.`
        );
      } else if (n.type === 'cloud-ingest') {
        const feeder = abrFeeder(n.id, abrProtocols);
        if (feeder) {
          problems.push(
            `[${abrNoAttachRule.id}] ${pathPrefix}${describeNode(n)} is fed directly by an ABR signal (${describeNode(feeder)}, protocol ${feeder.props && feeder.props.protocol}) and may not carry a ${attachmentType} attachment.`
          );
        }
      }
    }
  }

  return problems;
}

// ---------------------------------------------------------------------------
// The planner bridge: spawn `claude -p ...`
// ---------------------------------------------------------------------------

const PLANNER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    reply: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          label: { type: 'string' },
          props: { type: 'object' },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                props: { type: 'object' },
              },
              required: ['type'],
            },
          },
          notes: { type: 'array', items: { type: 'string' } },
          subflow: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                properties: {
                  nodes: { type: 'array' },
                  edges: { type: 'array' },
                },
              },
            ],
          },
        },
        required: ['id', 'type', 'label'],
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['from', 'to'],
      },
    },
  },
  required: ['title', 'summary', 'reply', 'nodes', 'edges'],
};

// Pull the structured-output object out of whatever envelope `claude -p
// --output-format json` hands back. Handles the shapes we've observed and
// falls back to parsing `result` as JSON text if a dedicated field isn't
// present.
function extractStructuredOutput(envelope) {
  if (envelope && typeof envelope === 'object') {
    if (envelope.structured_output && typeof envelope.structured_output === 'object') {
      return envelope.structured_output;
    }
    if (envelope.structuredOutput && typeof envelope.structuredOutput === 'object') {
      return envelope.structuredOutput;
    }
    if (envelope.result && typeof envelope.result === 'object') {
      return envelope.result;
    }
    if (typeof envelope.result === 'string') {
      const text = envelope.result.trim();
      try {
        return JSON.parse(text);
      } catch {
        // Sometimes the model wraps JSON in a fenced code block despite
        // --output-format json; try to salvage it.
        const m = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
        if (m) {
          try {
            return JSON.parse(m[1]);
          } catch {
            /* fall through */
          }
        }
      }
    }
  }
  return null;
}

function runClaudePlanner(userMessage) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--system-prompt-file', PROMPT_PATH,
      '--output-format', 'json',
      '--json-schema', JSON.stringify(PLANNER_SCHEMA),
      '--tools', '',
      '--model', MODEL,
    ];

    let child;
    try {
      child = spawn(CLAUDE_BIN, args, {
        cwd: os.tmpdir(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      reject(new Error(`failed to spawn claude: ${err.message}`));
      return;
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, PROPOSE_TIMEOUT_MS);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`failed to run claude (is it on PATH?): ${err.message}`));
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (timedOut) {
        reject(new Error(`claude timed out after ${PROPOSE_TIMEOUT_MS}ms`));
        return;
      }

      let envelope = null;
      try {
        envelope = JSON.parse(stdout);
      } catch (err) {
        reject(new Error(
          `claude did not return valid JSON on stdout (exit ${code}): ${err.message}. ` +
          `stdout: ${stdout.slice(0, 500)} stderr: ${stderr.slice(0, 500)}`
        ));
        return;
      }

      if (envelope && envelope.is_error) {
        reject(new Error(`claude reported an error: ${envelope.result || JSON.stringify(envelope).slice(0, 500)}`));
        return;
      }

      const structured = extractStructuredOutput(envelope);
      if (!structured) {
        reject(new Error(
          `could not locate structured output in claude's response envelope. ` +
          `Keys seen: ${envelope && typeof envelope === 'object' ? Object.keys(envelope).join(',') : typeof envelope}`
        ));
        return;
      }

      resolve(structured);
    });

    child.stdin.write(userMessage);
    child.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// Propose flow
// ---------------------------------------------------------------------------

const proposeLocks = new Set();

async function proposePlan(id, body) {
  if (proposeLocks.has(id)) {
    throw new HttpError(409, 'A proposal is already running for this plan');
  }
  proposeLocks.add(id);
  const startedAt = Date.now();

  try {
    const latest = readLatestPlan(id);
    const currentPlan = latest ? latest.plan : { nodes: [], edges: [] };
    const nextVersion = latest ? latest.version + 1 : 1;

    const { primitives, byType } = loadPrimitives();
    const compact = primitives.map(compactPrimitive);
    const rules = loadRules();
    const rulesForMessage = rules.map((r) => ({ id: r.id, text: r.text }));

    const request = {
      message: body.message || '',
      annotations: Array.isArray(body.annotations) ? body.annotations : [],
      selection: Array.isArray(body.selection) ? body.selection : [],
    };

    const MAX_ATTEMPTS = 3;
    const attempts = [];
    let structured = null;
    let problems = [];
    let ok = false;
    let lastCallFailed = false;
    let currentMessage = JSON.stringify({ primitives: compact, currentPlan, request, rules: rulesForMessage });

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const attemptStart = Date.now();
      let attemptProblems;
      let attemptStructured = null;
      lastCallFailed = false;
      try {
        attemptStructured = await runClaudePlanner(currentMessage);
        attemptProblems = validatePlanShape(attemptStructured, byType, rules);
      } catch (err) {
        attemptProblems = [`planner call failed: ${err.message}`];
        lastCallFailed = true;
      }
      const attemptOk = attemptProblems.length === 0;
      attempts.push({ ms: Date.now() - attemptStart, ok: attemptOk, problems: attemptProblems });
      problems = attemptProblems;

      if (attemptOk) {
        structured = attemptStructured;
        ok = true;
        break;
      }
      if (attemptStructured) structured = attemptStructured; // keep best-effort reply/summary for logging

      if (i < MAX_ATTEMPTS - 1) {
        currentMessage = JSON.stringify({
          primitives: compact,
          currentPlan,
          request,
          rules: rulesForMessage,
          problemsFromPreviousAttempt: attemptProblems,
        });
      }
    }

    const replyForLog = structured && typeof structured.reply === 'string' ? structured.reply : '';
    const summaryForLog = structured && typeof structured.summary === 'string' ? structured.summary : '';

    if (!ok) {
      appendLog(id, {
        at: nowIso(),
        version: null,
        ok: false,
        ms: Date.now() - startedAt,
        request,
        reply: replyForLog,
        summary: summaryForLog,
        problems,
        attempts,
      });
      if (lastCallFailed) {
        throw new HttpError(502, `Planner call failed: ${problems[problems.length - 1] || 'unknown error'}`);
      }
      throw new HttpError(422, 'Planner output failed validation', { problems });
    }

    const plan = {
      id,
      title: structured.title || '',
      version: nextVersion,
      status: 'draft',
      createdAt: nowIso(),
      summary: structured.summary || '',
      reply: structured.reply || '',
      assumptions: Array.isArray(structured.assumptions) ? structured.assumptions : [],
      nodes: (structured.nodes || []).map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        props: n.props || {},
        attachments: Array.isArray(n.attachments) ? n.attachments : [],
        notes: Array.isArray(n.notes) ? n.notes : [],
        subflow: n.subflow || null,
      })),
      edges: (structured.edges || []).map((e) => ({
        from: e.from,
        to: e.to,
        label: e.label || '',
      })),
    };

    writePlanVersion(id, plan);

    const ms = Date.now() - startedAt;
    appendLog(id, {
      at: nowIso(),
      version: plan.version,
      ok: true,
      ms,
      request,
      reply: plan.reply,
      summary: plan.summary,
      problems: [],
      attempts,
    });
    console.log(`[propose] plan=${id} version=${plan.version} attempts=${attempts.length} ms=${ms}`);

    return plan;
  } finally {
    proposeLocks.delete(id);
  }
}

// ---------------------------------------------------------------------------
// Log: plans/<id>/log.jsonl
// ---------------------------------------------------------------------------

function readLog(id) {
  const file = path.join(planDir(id), 'log.jsonl');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // skip malformed line
    }
  }
  return out;
}

async function approvePlan(id) {
  const latest = readLatestPlan(id);
  if (!latest) {
    throw new HttpError(404, `No plan found with id ${id}`);
  }
  const plan = {
    ...latest.plan,
    version: latest.version + 1,
    status: 'approved',
    createdAt: nowIso(),
    summary: 'Approved.',
  };
  writePlanVersion(id, plan);
  return plan;
}

// ---------------------------------------------------------------------------
// SSE: /api/plans/:id/events
// ---------------------------------------------------------------------------

function handleEvents(req, res, id) {
  const dir = planDir(id);
  ensureDir(dir);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  let lastVersion = listVersionNumbers(id).at(-1) ?? 0;
  let debounceTimer = null;
  let closed = false;

  const checkAndEmit = () => {
    if (closed) return;
    const versions = listVersionNumbers(id);
    const current = versions.at(-1) ?? 0;
    if (current !== lastVersion) {
      lastVersion = current;
      res.write(`event: version\ndata: ${JSON.stringify({ version: current })}\n\n`);
    }
  };

  let watcher;
  try {
    watcher = fs.watch(dir, { persistent: true }, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkAndEmit, 150);
    });
  } catch (err) {
    // Directory disappeared or platform doesn't support watching it — keep
    // the connection alive via heartbeats only.
    watcher = null;
  }

  const heartbeat = setInterval(() => {
    if (!closed) res.write(': heartbeat\n\n');
  }, 20000);

  req.on('close', () => {
    closed = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    clearInterval(heartbeat);
    if (watcher) watcher.close();
  });
}

// ---------------------------------------------------------------------------
// Static file serving (app/)
// ---------------------------------------------------------------------------

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  rel = rel.split('?')[0];

  // Resolve safely, rejecting any traversal outside APP_DIR.
  const target = path.normalize(path.join(APP_DIR, decodeURIComponent(rel)));
  const appDirWithSep = APP_DIR.endsWith(path.sep) ? APP_DIR : APP_DIR + path.sep;
  if (!target.startsWith(appDirWithSep) && target !== APP_DIR) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const type = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    const MAX = 5 * 1024 * 1024; // 5MB is plenty for annotations
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX) {
        reject(new HttpError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new HttpError(400, `Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // GET /api/primitives
    if (method === 'GET' && pathname === '/api/primitives') {
      const { primitives, aliasMap } = loadPrimitives();
      const rules = loadRules();
      sendJson(res, 200, { primitives, aliasMap, rules });
      return;
    }

    // GET /api/plans
    if (method === 'GET' && pathname === '/api/plans') {
      const ids = listPlanIds();
      const list = [];
      for (const id of ids) {
        const latest = readLatestPlan(id);
        if (!latest) continue;
        list.push({
          id,
          title: latest.plan.title,
          version: latest.version,
          status: latest.plan.status,
        });
      }
      sendJson(res, 200, list);
      return;
    }

    // GET /api/plans/:id/versions
    let m = /^\/api\/plans\/([^/]+)\/versions$/.exec(pathname);
    if (method === 'GET' && m) {
      const id = decodeURIComponent(m[1]);
      const versions = listVersionNumbers(id);
      const out = versions.map((v) => {
        const plan = readPlanVersion(id, v);
        return plan
          ? { version: plan.version, status: plan.status, summary: plan.summary, createdAt: plan.createdAt }
          : { version: v, status: null, summary: null, createdAt: null };
      });
      sendJson(res, 200, out);
      return;
    }

    // GET /api/plans/:id/v/:n
    m = /^\/api\/plans\/([^/]+)\/v\/(\d+)$/.exec(pathname);
    if (method === 'GET' && m) {
      const id = decodeURIComponent(m[1]);
      const n = Number(m[2]);
      const plan = readPlanVersion(id, n);
      if (!plan) {
        sendJson(res, 404, { error: `No version ${n} for plan ${id}` });
        return;
      }
      sendJson(res, 200, plan);
      return;
    }

    // GET /api/plans/:id/log
    m = /^\/api\/plans\/([^/]+)\/log$/.exec(pathname);
    if (method === 'GET' && m) {
      const id = decodeURIComponent(m[1]);
      sendJson(res, 200, readLog(id));
      return;
    }

    // GET /api/plans/:id/events  (SSE)
    m = /^\/api\/plans\/([^/]+)\/events$/.exec(pathname);
    if (method === 'GET' && m) {
      const id = decodeURIComponent(m[1]);
      handleEvents(req, res, id);
      return;
    }

    // POST /api/plans/:id/propose
    m = /^\/api\/plans\/([^/]+)\/propose$/.exec(pathname);
    if (method === 'POST' && m) {
      const id = decodeURIComponent(m[1]);
      const body = await readBody(req);
      const plan = await proposePlan(id, body);
      sendJson(res, 200, plan);
      return;
    }

    // POST /api/plans/:id/approve
    m = /^\/api\/plans\/([^/]+)\/approve$/.exec(pathname);
    if (method === 'POST' && m) {
      const id = decodeURIComponent(m[1]);
      const plan = await approvePlan(id);
      sendJson(res, 200, plan);
      return;
    }

    // GET /api/plans/:id  (latest)
    m = /^\/api\/plans\/([^/]+)$/.exec(pathname);
    if (method === 'GET' && m) {
      const id = decodeURIComponent(m[1]);
      const latest = readLatestPlan(id);
      if (!latest) {
        sendJson(res, 404, { error: `No plan found with id ${id}` });
        return;
      }
      sendJson(res, 200, latest.plan);
      return;
    }

    // Static files (and /)
    if (method === 'GET' && pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    if (method === 'GET') {
      serveStatic(req, res, pathname);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message, ...(err.extra || {}) });
    } else {
      console.error('Unhandled error:', err);
      sendJson(res, 500, { error: err.message || 'Internal server error' });
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Uplynk Architect server listening on http://${HOST}:${PORT}`);
  console.log(`  repo root:   ${REPO_ROOT}`);
  console.log(`  primitives:  ${PRIMITIVES_DIR}`);
  console.log(`  plans:       ${PLANS_DIR}`);
  console.log(`  prompt:      ${PROMPT_PATH}`);
  console.log(`  model:       ${MODEL}`);
});
