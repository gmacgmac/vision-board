// What the server reads from openapi.json (api.md 1, 53): each operation's path and query
// parameters with their schemas and defaults, and its request body schema. The route table
// (operations.generated.ts) says where an operation lives; this says what its inputs may hold.
// Server only: it uses ajv through schema.ts, which never reaches the page (api.md 12).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { OperationId } from '../../../packages/format/src/index.ts';
import { OPERATIONS } from '../../../packages/format/src/index.ts';
import type { SchemaProblem } from './schema.ts';
import { compileSchema, schemaProblems } from './schema.ts';

export const OPENAPI_FILE = fileURLToPath(new URL('../../../packages/format/schema/openapi.json', import.meta.url));

type Rec = Record<string, any>;

/** One path or query parameter: its schema `$id`, JSON type and default. */
export interface ParamSpec {
  name: string;
  in: 'path' | 'query';
  schema: string;
  type: string;
  default?: unknown;
  description: string;
}

/** Who may call an operation, from its `security` (api.md 20-22, 41, 102, 152): `person` needs the person
 * cookie, `agent` a Bearer secret, `agent-or-person` either one, `optional-agent` takes a Bearer secret to
 * scope a read, `run` a chat session's run token, and `none` takes no credentials. */
export type Security = 'none' | 'person' | 'agent' | 'agent-or-person' | 'optional-agent' | 'run';

export interface OperationSpec {
  params: ParamSpec[];
  /** The `$id` of the JSON request body's schema, when the operation takes one. */
  body?: string;
  security: Security;
  /** `x-agent`: an operation agents get (api.md 41). */
  agent: boolean;
  /** The request body's worked example (`example`, or the first of `examples`), when it has one. */
  example?: unknown;
}

/** The kind of caller an operation's `security` list allows. */
function securityOf(list: Rec[] | undefined): Security {
  const names = (list ?? []).map((req) => Object.keys(req).join(','));
  if (names.includes('personCookie')) return names.includes('agentSecret') ? 'agent-or-person' : 'person';
  if (names.includes('runToken')) return 'run';
  if (!names.includes('agentSecret')) return 'none';
  return names.includes('') ? 'optional-agent' : 'agent';
}

const doc: Rec = JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf8'));

/** Follow a `#/...` reference inside openapi.json. */
const local = (x: Rec): Rec => {
  if (typeof x.$ref !== 'string' || !x.$ref.startsWith('#/')) return x;
  return x.$ref.slice(2).split('/').reduce((node: Rec, part: string) => node[part], doc);
};

function paramSpec(p: Rec): ParamSpec {
  const schema = String(p.schema.$ref);
  const s = compileSchema(schema).schema as Rec;
  return {
    name: p.name, in: p.in, schema, type: String(s.type ?? 'string'), description: String(p.description ?? ''),
    ...('default' in s && { default: s.default }),
  };
}

function operationSpec(id: OperationId): OperationSpec {
  const { method, path } = OPERATIONS[id];
  const op: Rec = doc.paths[path][method.toLowerCase()];
  // Header parameters (`VB-Project`) are read by their own module (caller-folder.ts), not here.
  const params = ((op.parameters ?? []) as Rec[]).map(local).filter((p) => p.in !== 'header').map(paramSpec);
  const ref = op.requestBody?.content?.['application/json']?.schema;
  const media: Rec | undefined = op.requestBody?.content?.['application/json'];
  const example = media?.example ?? Object.values<Rec>(media?.examples ?? {})[0]?.value;
  return {
    params, ...(ref && { body: String(local(ref).$ref) }), ...(example !== undefined && { example }),
    security: securityOf(op.security ?? doc.security), agent: op['x-agent'] === true,
  };
}

/** Every operation's inputs, read once at startup. */
export const SPECS: Readonly<Record<OperationId, OperationSpec>> = Object.fromEntries(
  (Object.keys(OPERATIONS) as OperationId[]).map((id) => [id, operationSpec(id)]),
) as Record<OperationId, OperationSpec>;

/** A raw query or path string as the parameter's JSON type; left as text when it does not fit,
 * so the schema reports it. */
export function coerce(type: string, raw: string): unknown {
  if (type === 'integer' || type === 'number') return /^-?(0|[1-9]\d*)(\.\d+)?$/.test(raw) ? Number(raw) : raw;
  if (type === 'boolean') return raw === 'true' ? true : raw === 'false' ? false : raw;
  return raw;
}

/** Problems with one parameter value, worded without a field name ("must be at most 500"). */
export function paramProblems(p: ParamSpec, value: unknown): string[] {
  return schemaProblems(p.schema, value).map((x) => x.detail.replace(/^`[^`]*` /, ''));
}

/** Problems with a request body against the operation's request schema. */
export function bodyProblems(id: OperationId, body: unknown): SchemaProblem[] {
  const schema = SPECS[id].body;
  if (!schema) throw new Error(`${id} takes no request body`);
  return schemaProblems(schema, body);
}
