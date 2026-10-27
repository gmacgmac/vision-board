// API table generator (api.md 1, 4, 51, 53, 55): reads packages/format/schema/openapi.json and
// writes packages/format/src/operations.generated.ts (the one route table the server, client, MCP
// tools and vb read instead of openapi.json, with the problem codes, gen-contract.mjs),
// packages/format/src/api-types.generated.ts (each operation's input and output type, gen-types.mjs), packages/cli/src/commands.generated.ts (one `vb`
// command per x-agent operation, with its inputs), packages/format/src/tools.generated.json (the tool
// table: what a declared tool needs, per x-agent operation, gen-tools.mjs) and
// packages/mcp/src/tools.generated.json (the MCP tool list made from that table, gen-mcp.mjs) and docs/specification/api-reference.md (the
// human-readable reference, from gen-reference.mjs). Run: npm run gen. `--check` exits 1 if a
// file would change.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTools } from './gen-mcp.mjs';
import { renderToolTable, toolTable } from './gen-tools.mjs';
import { METHODS, resolveParam } from './openapi-refs.mjs';
import { inputType, inputsOf, shape } from './schema-shape.mjs';
import { renderReference } from './gen-reference.mjs';
import { renderCardFields, renderContract } from './gen-contract.mjs';
import { renderTypes } from './gen-types.mjs';
import { CHAT_SCHEMA_DIR } from '#chat/files';
import { OPENAPI_FILE, SCHEMA_DIR as FORMAT_SCHEMA_DIR } from '#format/files';

export { inputType, inputsOf, shape };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SPEC = OPENAPI_FILE;
export const OUT = path.join(ROOT, 'packages/format/src/operations.generated.ts');
export const SCHEMA_DIR = path.resolve(FORMAT_SCHEMA_DIR);
/** The format's schemas and the chat package's own contract (api.md 98), which the spec references by `$id`. */
export const SCHEMA_DIRS = [SCHEMA_DIR, path.resolve(CHAT_SCHEMA_DIR)];
export const COMMANDS_OUT = path.join(ROOT, 'packages/cli/src/commands.generated.ts');
export const TOOLS_OUT = path.join(ROOT, 'packages/mcp/src/tools.generated.json');
export const TYPES_OUT = path.join(ROOT, 'packages/format/src/api-types.generated.ts');
export const TOOL_TABLE_OUT = path.join(ROOT, 'packages/format/src/tools.generated.json');
export const REFERENCE_OUT = path.join(ROOT, 'docs/specification/api-reference.md');
const SCHEME_AUTH = { agentSecret: 'agent', personCookie: 'person', runToken: 'run' };

/** Who a call needs to be: `none` when any caller may; `optional-agent` when anyone may, and an
 * agent's secret, when sent, scopes the answer (an empty requirement beside `agentSecret`);
 * `agent-or-person` when an agent's secret or the person's cookie will do (list_apps, D-047). */
export function authOf(operationId, security) {
  if (!Array.isArray(security) || security.length === 0) return 'none';
  if (security.some((r) => Object.keys(r).length === 0)) {
    const rest = security.filter((r) => Object.keys(r).length > 0);
    if (rest.length === 0) return 'none';
    if (rest.length === 1 && Object.keys(rest[0]).join() === 'agentSecret') return 'optional-agent';
    throw new Error(`${operationId}: an optional requirement may only offer agentSecret`);
  }
  const schemes = new Set(security.flatMap((r) => Object.keys(r)));
  if (schemes.size === 2 && schemes.has('agentSecret') && schemes.has('personCookie') && security.every((r) => Object.keys(r).length === 1)) return 'agent-or-person';
  if (schemes.size !== 1) throw new Error(`${operationId}: security must name one scheme`);
  const auth = SCHEME_AUTH[[...schemes][0]];
  if (!auth) throw new Error(`${operationId}: unknown security scheme ${[...schemes][0]}`);
  return auth;
}

/** The operations of an OpenAPI document, in document order. */
export function operationsOf(doc) {
  const out = [];
  for (const [route, item] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS.filter((m) => item[m])) {
      const op = item[method];
      const id = op.operationId;
      if (typeof id !== 'string') throw new Error(`${method.toUpperCase()} ${route}: no operationId`);
      const pathParams = [...route.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
      const declared = (op.parameters ?? []).map((p) => resolveParam(doc, p)).filter((p) => p.in === 'path').map((p) => p.name);
      if (declared.join() !== pathParams.join()) throw new Error(`${id}: path parameters [${declared}] do not match ${route}`);
      if (typeof op['x-agent'] !== 'boolean') throw new Error(`${id}: x-agent must be true or false`);
      out.push({ operationId: id, method: method.toUpperCase(), path: route, pathParams, xAgent: op['x-agent'], auth: authOf(id, op.security) });
    }
  }
  return out;
}

const q = (s) => `'${s}'`;

/** The text of operations.generated.ts for a document (and, from `schemas`, the problem table). */
export function render(doc, schemas = loadSchemas()) {
  const rows = operationsOf(doc).map((o) => [
    `  ${o.operationId}: {`,
    `    operationId: ${q(o.operationId)}, method: ${q(o.method)}, path: ${q(o.path)},`,
    `    pathParams: [${o.pathParams.map(q).join(', ')}], xAgent: ${o.xAgent}, auth: ${q(o.auth)},`,
    '  },',
  ].join('\n'));
  return [
    '// GENERATED by scripts/gen-api.mjs from packages/format/schema/openapi.json. Do not edit; run `npm run gen`.',
    '// The route table: every operation\'s id, method, path and path parameters, whether agents get it,',
    '// and which credential it needs; the problem codes; and each operation\'s input and output types',
    '// (api-types.generated.ts). Callers read this, never openapi.json, so the page bundle stays small.',
    '',
    "export type { OperationInput, OperationOutput, OperationTypes, PointerError, ProblemDocument } from './api-types.generated.ts';",
    '',
    "export type OperationAuth = 'none' | 'optional-agent' | 'agent' | 'person' | 'agent-or-person' | 'run';",
    '',
    'export interface OperationInfo {',
    '  readonly operationId: string;',
    "  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';",
    '  /** The path template, such as `/api/boards/{board}`. */',
    '  readonly path: string;',
    '  /** The `{names}` in the path, in order. */',
    '  readonly pathParams: readonly string[];',
    '  /** True when MCP and `vb` get this operation. */',
    '  readonly xAgent: boolean;',
    '  /** `agent`: Bearer secret. `person`: the page cookie. `agent-or-person`: either. `run`: a chat session\'s run token.',
    '   * `none`: no credentials needed. `optional-agent`: none needed; an agent\'s Bearer secret, when sent, scopes the answer. */',
    '  readonly auth: OperationAuth;',
    '}',
    '',
    'export const OPERATIONS = {',
    ...rows,
    '} as const satisfies Record<string, OperationInfo>;',
    '',
    'export type OperationId = keyof typeof OPERATIONS;',
    '',
    ...renderContract(doc, schemas),
    '',
    ...renderCardFields(schemas),
    '',
  ].join('\n');
}

/** Every JSON Schema under `dirs` (the vendored OpenAPI schema aside), by `$id`. */
export function loadSchemas(dirs = SCHEMA_DIRS, out = new Map()) {
  for (const dir of [dirs].flat()) for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'vendor') loadSchemas(file, out);
    } else if (entry.name.endsWith('.schema.json')) {
      const schema = JSON.parse(readFileSync(file, 'utf8'));
      if (schema.$id) out.set(schema.$id, schema);
    }
  }
  return out;
}

/** One `vb` command per x-agent operation (api.md 51), in document order. */
export function commandsOf(doc, schemas) {
  const out = [];
  for (const [route, item] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS.filter((m) => item[m] && item[m]['x-agent'] === true)) {
      const op = item[method];
      out.push({
        name: op.operationId.replaceAll('_', '-'), operationId: op.operationId, summary: op.summary ?? '',
        description: op.description ?? '', takesBody: method !== 'get', inputs: inputsOf(op.operationId, op, doc, schemas),
      });
    }
  }
  return out;
}

/** The text of commands.generated.ts for a document. */
export function renderCommands(doc, schemas) {
  const row = (c) => [
    '  {',
    `    name: ${JSON.stringify(c.name)}, operationId: ${JSON.stringify(c.operationId)}, takesBody: ${c.takesBody},`,
    `    summary: ${JSON.stringify(c.summary)},`,
    `    description: ${JSON.stringify(c.description)},`,
    ...(c.inputs.length ? ['    inputs: [', ...c.inputs.map((i) => `      ${JSON.stringify(i)},`), '    ],'] : ['    inputs: [],']),
    '  },',
  ].join('\n');
  return [
    '// GENERATED by scripts/gen-api.mjs from packages/format/schema/openapi.json. Do not edit; run `npm run gen`.',
    '// The `vb` command table: one command per x-agent operation, with its summary and its inputs',
    '// (path, query, and the top-level properties of a JSON body). The CLI reads this, never openapi.json.',
    '',
    "import type { OperationId } from '#format';",
    '',
    "export type CommandInputType = 'string' | 'integer' | 'number' | 'boolean' | 'json';",
    '',
    'export interface CommandInput {',
    '  /** The flag name: `--<name>`, and the key the client receives. */',
    '  readonly name: string;',
    "  readonly in: 'path' | 'query' | 'body';",
    '  /** `json` is any array or object: the flag takes a JSON text. */',
    '  readonly type: CommandInputType;',
    '  readonly required: boolean;',
    '  readonly description: string;',
    '}',
    '',
    'export interface CommandInfo {',
    "  /** The command word: the operationId with hyphens (`show-node`). */",
    '  readonly name: string;',
    '  readonly operationId: OperationId;',
    '  readonly summary: string;',
    '  readonly description: string;',
    '  /** True when the request has a JSON body (`--json-body` may give it whole). */',
    '  readonly takesBody: boolean;',
    '  readonly inputs: readonly CommandInput[];',
    '}',
    '',
    'export const COMMANDS: readonly CommandInfo[] = [',
    ...commandsOf(doc, schemas).map(row),
    '];',
    '',
  ].join('\n');
}

/** Every generated file: where it goes and what it should say. */
function targets() {
  const doc = JSON.parse(readFileSync(SPEC, 'utf8'));
  const schemas = loadSchemas();
  const table = toolTable(doc, schemas);
  return [
    { file: OUT, text: render(doc, schemas) },
    { file: TYPES_OUT, text: renderTypes(doc, schemas) },
    { file: COMMANDS_OUT, text: renderCommands(doc, schemas) },
    { file: TOOL_TABLE_OUT, text: renderToolTable(table) },
    { file: TOOLS_OUT, text: renderTools(table, doc, schemas) },
    { file: REFERENCE_OUT, text: renderReference(doc, schemas, operationsOf(doc)) },
  ];
}

function main(argv) {
  const files = targets();
  if (argv.includes('--check')) {
    const stale = files.filter((f) => !existsSync(f.file) || readFileSync(f.file, 'utf8') !== f.text);
    for (const f of stale) console.error(`gen-api: ${path.relative(ROOT, f.file)} is out of date. Run: npm run gen`);
    if (stale.length) return 1;
    console.log('gen-api: generated files are current');
    return 0;
  }
  for (const f of files) {
    mkdirSync(path.dirname(f.file), { recursive: true });
    writeFileSync(f.file, f.text);
    console.log(`gen-api: wrote ${path.relative(ROOT, f.file)}`);
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
