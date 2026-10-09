// Shared by the API tests: openapi.json as data, ajv set up to compile its schemas, and
// `checkAnswer`, which holds a real response (status, headers, body) to the spec for its
// operation (api.md 54). Tests only; ajv never reaches the page (api.md 12).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv/dist/2020.js';
import { SCHEMA_BASE, allSchemaFiles } from '../server/schema.ts';

export type Rec = Record<string, any>;
export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
export const doc: Rec = JSON.parse(read('packages/format/schema/openapi.json'));
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'];

export interface Op { id: string; method: string; path: string; op: Rec }
export const ops: Op[] = Object.entries<Rec>(doc.paths).flatMap(([route, item]) =>
  METHODS.filter((m) => item[m]).map((m) => ({ id: item[m].operationId, method: m.toUpperCase(), path: route, op: item[m] })));

/** Follow a `#/...` pointer inside the document. */
export function pointer(ref: string): unknown {
  let node: any = doc;
  for (const part of ref.slice(2).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    node = node?.[part];
    if (node === undefined) return undefined;
  }
  return node;
}

/** A response, or the component a `$ref` names. */
export const deref = (x: Rec): Rec => (x.$ref ? (pointer(x.$ref) as Rec) : x);

/** The schemas as ajv can compile them: `#/components/schemas/x` points into one synthetic
 * document, and OpenAPI's `discriminator` (documentation here; ledger-event.schema.json carries
 * ajv's) is dropped because ajv needs `properties` on each branch of a `oneOf` of references. */
export const COMPONENTS_ID = `${SCHEMA_BASE}openapi-components`;
export function forAjv(node: any): any {
  if (Array.isArray(node)) return node.map(forAjv);
  if (!node || typeof node !== 'object') return node;
  const out: Rec = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'discriminator') continue;
    out[k] = k === '$ref' && typeof v === 'string' && v.startsWith('#/components/schemas/')
      ? `${COMPONENTS_ID}#/$defs/${v.slice('#/components/schemas/'.length)}` : forAjv(v);
  }
  return out;
}
export const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true, discriminator: true });
for (const { schema } of allSchemaFiles()) ajv.addSchema(schema);
ajv.addSchema({ $id: COMPONENTS_ID, $defs: forAjv(doc.components.schemas) });
const compiled = new Map<string, ValidateFunction>();
export function compileInline(schema: Rec): ValidateFunction {
  const key = JSON.stringify(schema);
  if (!compiled.has(key)) compiled.set(key, ajv.compile(forAjv(schema)));
  return compiled.get(key)!;
}

/** One real answer: what `fetch` returned, with the body parsed by its media type. */
export interface Answer { status: number; headers: Headers; media: string; body: unknown }

/** The answer fits the spec for operation `id`: its status is one the operation declares, every
 * required header is sent, the media type is one it declares, and the body fits that media
 * type's schema (api.md 54). Server-sent events are checked by media type only. */
export function checkAnswer(id: string, a: Answer): void {
  const o = ops.find((x) => x.id === id);
  assert.ok(o, `no operation ${id}`);
  const declared = o.op.responses[String(a.status)];
  assert.ok(declared, `${id} answered ${a.status}, which the spec does not declare`);
  const r = deref(declared);
  for (const [name, h] of Object.entries<Rec>(r.headers ?? {})) {
    if (deref(h).required) assert.ok(a.headers.has(name), `${id} ${a.status}: header ${name} is required`);
  }
  const media = r.content?.[a.media];
  assert.ok(media, `${id} ${a.status}: media type ${a.media} is not declared (${Object.keys(r.content ?? {}).join(', ')})`);
  if (a.media === 'text/event-stream') return;
  const validate = compileInline(media.schema ?? media.itemSchema);
  assert.ok(validate(a.body), `${id} ${a.status} ${a.media}: ${JSON.stringify(validate.errors?.slice(0, 3))}`);
}
