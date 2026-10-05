// The MCP tool list (api.md 45-50): one tool per x-agent operation of openapi.json, written to
// packages/mcp/src/tools.generated.json by scripts/gen-api.mjs. Each tool's input is the
// operation's path, query and body inputs merged into one plain object (plus `secret` where the
// operation takes the agent secret), its output the success response, both flattened by
// mcp-schema.mjs. `routes` says where each input goes back to, so the server can rebuild the call.
import { flatten, objectRoot } from './mcp-schema.mjs';
import { METHODS, lookup, resolveParam } from './openapi-refs.mjs';

const SECRET_REF = 'https://vision-board.invalid/schema/api/common.schema.json#/$defs/secret';
const SECRET_SAYS = 'Here the Bearer secret is the `secret` argument, the one `join` gave you; leave it out only when this MCP server was started with `VB_AGENT_SECRET`.';
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** True when the operation accepts the agent's Bearer secret (required or optional). */
const takesSecret = (op) => (op.security ?? []).some((r) => 'agentSecret' in r);

/** The success response's JSON schema: the lowest 2xx status that has one. */
function successSchema(op) {
  const status = Object.keys(op.responses ?? {}).filter((s) => /^2\d\d$/.test(s)).sort()[0];
  const schema = status && op.responses[status].content?.['application/json']?.schema;
  if (!schema) throw new Error(`${op.operationId}: no JSON success response`);
  return schema;
}

/** Annotations (api.md 49): hints only; the grant check in the server is the control. */
function annotationsOf(method) {
  if (method === 'get') return { readOnlyHint: true, openWorldHint: false };
  return { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
}

/** The merged input: path, then query, then the body's top-level properties, then `secret`. */
function inputOf(op, doc, schemas) {
  const properties = {};
  const required = [];
  const route = { path: [], query: [], body: [], secret: takesSecret(op) };
  const add = (name, where, schema, isRequired) => {
    if (name in properties) throw new Error(`${op.operationId}: input "${name}" is named twice once merged`);
    properties[name] = schema;
    if (isRequired) required.push(name);
    if (where) route[where].push(name);
  };
  for (const where of ['path', 'query']) {
    for (const p of (op.parameters ?? []).map((x) => resolveParam(doc, x)).filter((x) => x.in === where)) {
      const schema = flatten(p.schema ?? {}, doc, schemas);
      add(p.name, where, p.description ? { ...schema, description: p.description } : schema, where === 'path' || p.required === true);
    }
  }
  const body = op.requestBody?.content?.['application/json']?.schema;
  if (body) {
    const flat = flatten(body, doc, schemas);
    if (!isObj(flat.properties)) throw new Error(`${op.operationId}: the body must be an object with properties`);
    for (const [name, schema] of Object.entries(flat.properties)) add(name, 'body', schema, (flat.required ?? []).includes(name));
  }
  if (route.secret) {
    const { schema, doc: home } = lookup(SECRET_REF, doc, schemas);
    add('secret', undefined, { ...flatten(schema, home, schemas), description: 'Your agent secret from join.' }, false);
  }
  const input = { type: 'object', properties, ...(required.length && { required }), additionalProperties: false };
  return { input, route };
}

/** The operation's description, plus how MCP carries the secret (api.md 22): tools that take it
 * say so; `join` says which tools take it. */
function describe(op, secretTools) {
  const base = (op.description ?? op.summary ?? '').trim();
  if (takesSecret(op)) return `${base} ${SECRET_SAYS}`;
  if (op.operationId === 'join') {
    return `${base} Here you send the secret as the \`secret\` argument of ${secretTools.map((t) => `\`${t}\``).join(', ')}, or set \`VB_AGENT_SECRET\` when one identity serves every chat that shares this MCP configuration.`;
  }
  return base;
}

/** Every x-agent operation as an MCP tool, in document order, and how to call it back. */
export function toolsOf(doc, schemas) {
  const ops = Object.values(doc.paths ?? {}).flatMap((item) => METHODS.filter((m) => item[m]?.['x-agent'] === true).map((m) => ({ method: m, op: item[m] })));
  const secretTools = ops.filter(({ op }) => takesSecret(op)).map(({ op }) => op.operationId);
  const tools = [];
  const routes = {};
  for (const { method, op } of ops) {
    const { input, route } = inputOf(op, doc, schemas);
    tools.push({
      name: op.operationId,
      title: op.summary ?? op.operationId,
      description: describe(op, secretTools),
      inputSchema: input,
      outputSchema: objectRoot(flatten(successSchema(op), doc, schemas)),
      annotations: annotationsOf(method),
    });
    routes[op.operationId] = route;
  }
  return { apiVersion: doc.info?.version ?? '0.0.0', tools, routes };
}

/** The text of tools.generated.json: stable key order, two-space indent, a closing newline. */
export function renderTools(doc, schemas) {
  const note = 'GENERATED by scripts/gen-api.mjs from packages/format/schema/openapi.json. Do not edit; run `npm run gen`.';
  return `${JSON.stringify({ note, ...toolsOf(doc, schemas) }, null, 2)}\n`;
}
