// The OpenAPI document and the API body schemas (api.md 1-5, 38-44, 52-55): the document is valid
// OpenAPI 3.2, every operation is in api.md's table and nothing else is, every error is a
// problem, every reference resolves, every example fits its schema, and the route table is current.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import { SCHEMA_BASE, compileSchema, schemaFiles } from '../server/schema.ts';
import type { Rec } from './openapi-ajv.ts';
import { COMPONENTS_ID, ajv, compileInline, deref, doc, ops, pointer, read } from './openapi-ajv.ts';

const API = `${SCHEMA_BASE}schema/api/`;
const apiMd = read('docs/specification/api.md');

// ---- walking the document ----

/** Every `$ref` string in the document (the examples hold data, not references). */
function refsOf(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((x) => refsOf(x, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref') out.push(String(v));
      else if (!['example', 'examples', 'dataValue'].includes(k)) refsOf(v, out);
    }
  }
  return out;
}

/** Every media type object (`content` entry) with the kind of place it is in. */
function mediaTypes(): { where: string; role: 'request' | 'success' | 'error'; type: string; media: Rec }[] {
  const out: ReturnType<typeof mediaTypes> = [];
  for (const { id, op } of ops) {
    for (const [type, media] of Object.entries<Rec>(op.requestBody?.content ?? {})) out.push({ where: `${id} request`, role: 'request', type, media });
    for (const [status, r] of Object.entries<Rec>(op.responses)) {
      for (const [type, media] of Object.entries<Rec>(deref(r).content ?? {}))
        out.push({ where: `${id} ${status}`, role: status.startsWith('2') ? 'success' : 'error', type, media });
    }
  }
  return out;
}

// ---- 1. The document is valid OpenAPI 3.2 ----
/** The official schema with ajv's blind spot patched (standards brief 7): `$dynamicRef: "#meta"` becomes a plain `$ref`. */
function patchedOas(): Rec {
  const patch = (node: any): any => {
    if (Array.isArray(node)) return node.map(patch);
    if (!node || typeof node !== 'object') return node;
    return Object.fromEntries(Object.entries(node).map(([k, v]) =>
      (k === '$dynamicRef' && v === '#meta' ? ['$ref', '#/$defs/schema'] : [k, patch(v)])));
  };
  return patch(JSON.parse(read('packages/format/schema/vendor/oas-3.2-schema-2026-08-30.json')));
}
const oas = new Ajv2020({ allowMatchingProperties: true, strictTypes: false, strictTuples: false, allErrors: true });
for (const format of ['uri-reference', 'email', 'media-range']) oas.addFormat(format, true);
const validateOas = oas.compile(patchedOas());

test('openapi.json validates against the vendored OpenAPI 3.2 schema', () => {
  assert.equal(doc.openapi, '3.2.0');
  assert.equal(doc.info.version, '1.16.0');
  assert.deepEqual(doc.servers.map((s: Rec) => s.url), ['http://127.0.0.1:4466']);
  assert.ok(validateOas(doc), JSON.stringify(validateOas.errors?.slice(0, 5)));
});

test('the OpenAPI check can fail: a misspelt field, a wrong type and a missing version are refused', () => {
  const broken = (change: (d: Rec) => void) => {
    const copy = structuredClone(doc);
    change(copy);
    return validateOas(copy);
  };
  assert.equal(broken((d) => { d.info.version = 1; }), false);
  assert.equal(broken((d) => { delete d.info.title; }), false);
  assert.equal(broken((d) => { d.paths['/api/ledger'].get.responses['200'].content['application/jsonl'].itemSchemaa = {}; }), false);
  assert.equal(broken((d) => { d.components.securitySchemes.agentSecret.type = 'bearer'; }), false);
});

test('security schemes: a Bearer secret, the vb_person cookie and a Bearer run token', () => {
  assert.deepEqual([doc.components.securitySchemes.agentSecret.type, doc.components.securitySchemes.agentSecret.scheme], ['http', 'bearer']);
  const cookie = doc.components.securitySchemes.personCookie;
  assert.deepEqual([cookie.type, cookie.in, cookie.name], ['apiKey', 'cookie', 'vb_person']);
  assert.deepEqual([doc.components.securitySchemes.runToken.type, doc.components.securitySchemes.runToken.scheme], ['http', 'bearer']);
});

// ---- 2. Our own checks (api.md 50, 52) ----

test('operationIds are unique snake_case names an MCP client accepts', () => {
  const ids = ops.map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z][a-z0-9_]{0,39}$/, id);
});

test('x-agent is a boolean on every operation and true exactly for the agent rows of api.md (not person, page or gate)', () => {
  for (const { id, op } of ops) assert.equal(typeof op['x-agent'], 'boolean', id);
  for (const row of tableRows()) {
    const o = ops.find((x) => x.id === row.id);
    assert.equal(o?.op['x-agent'], !['person', 'page', 'gate'].includes(row.who), row.id);
  }
});

test('every description starts with a sentence that says what it does and stays under 2,048 characters', () => {
  for (const { id, op } of ops) {
    assert.equal(typeof op.summary, 'string', `${id} summary`);
    assert.match(op.description, /^[A-Z][^.!?]*[.!?](\s|$)/, `${id} first sentence`);
    assert.ok(op.description.length < 2048, `${id}: ${op.description.length} characters`);
  }
});

test('the agent-facing descriptions tell the agent what to do (api.md 22, 25, 43)', () => {
  const text = (id: string) => ops.find((o) => o.id === id)!.op.description as string;
  assert.match(text('join'), /durable notes/);
  assert.match(text('join'), /join again/);
  assert.match(text('request_grant'), /check_responses/);
  assert.match(text('write_board'), /key/);
  assert.match(text('check_responses'), /head/);
});

test('every 4xx and 5xx response is application/problem+json with the problem schema', () => {
  let seen = 0;
  for (const { id, op } of ops) {
    for (const [status, r] of Object.entries<Rec>(op.responses)) {
      if (!/^[45]/.test(status)) continue;
      const media = deref(r).content;
      assert.deepEqual(Object.keys(media), ['application/problem+json'], `${id} ${status}`);
      const ref = media['application/problem+json'].schema;
      assert.equal(deref(ref).$ref, `${API}problem.schema.json`, `${id} ${status}`);
      seen++;
    }
  }
  assert.ok(seen > 40);
});

test('a 401 sends WWW-Authenticate and a 405 sends Allow', () => {
  assert.equal(deref({ $ref: '#/components/responses/notAuthenticated' }).headers['WWW-Authenticate'].example, 'Bearer realm="vision-board"');
  assert.ok(deref({ $ref: '#/components/responses/methodNotAllowed' }).headers.Allow);
  for (const { id, op } of ops) {
    if (op.responses['401']) assert.equal(op.responses['401'].$ref, '#/components/responses/notAuthenticated', id);
    if (op.responses['405']) assert.equal(op.responses['405'].$ref, '#/components/responses/methodNotAllowed', id);
  }
});

test('every agent operation takes the VB-Project header and may answer 409 wrong-folder; no other does (api.md 114)', () => {
  for (const { id, op } of ops) {
    const header = (op.parameters ?? []).some((p: Rec) => p.$ref === '#/components/parameters/projectHeader');
    assert.equal(header, op['x-agent'], `${id} header`);
    assert.equal(op.responses['409']?.$ref === '#/components/responses/wrongFolder', op['x-agent'], `${id} 409`);
  }
  assert.deepEqual([doc.components.parameters.projectHeader.in, doc.components.parameters.projectHeader.name], ['header', 'VB-Project']);
});

test('reads are limited as api.md says: after, limit (100, 500), wait (0-60), linked', () => {
  const params = (id: string) => (ops.find((o) => o.id === id)!.op.parameters as Rec[]).map((p) => deref(p));
  const valid = (name: string, value: unknown, id = 'check_responses') => {
    const p = params(id).find((x) => x.name === name)!;
    return compileInline(p.schema)(value);
  };
  assert.ok(valid('limit', 500) && !valid('limit', 501) && !valid('limit', 0));
  assert.ok(valid('wait', 60) && valid('wait', 0) && !valid('wait', 61) && !valid('wait', -1));
  assert.ok(valid('after', 0) && !valid('after', -1));
  assert.ok(valid('linked', true, 'show_node') && !valid('linked', 'yes', 'show_node'));
  assert.equal(schemaDefault('limit'), 100);
  assert.equal(schemaDefault('after'), 0);
});

/** The `default` of a shared parameter schema in api/common.schema.json. */
function schemaDefault(name: string): unknown {
  const common = schemaFiles().find((f) => f.schema.$id === `${API}common.schema.json`)!.schema as Rec;
  return common.$defs[name].default;
}

// ---- 3. Every reference resolves and every schema compiles ----
test('every $ref resolves, and every schema it reaches compiles', () => {
  const refs = refsOf(doc);
  assert.ok(refs.length > 100);
  for (const ref of refs) {
    if (ref.startsWith('#/')) assert.notEqual(pointer(ref), undefined, ref);
    else {
      assert.ok(ref.startsWith(SCHEMA_BASE), ref);
      compileSchema(ref);
    }
  }
  for (const name of Object.keys(doc.components.schemas)) ajv.getSchema(`${COMPONENTS_ID}#/$defs/${name}`) ?? assert.fail(name);
  for (const [where, schema] of inlineSchemas()) compileInline(schema as Rec) ?? assert.fail(where);
});

/** Every Schema Object sitting in a parameter, header or media type (component schemas are compiled above). */
function inlineSchemas(): [string, Rec][] {
  const out: [string, Rec][] = [];
  const visit = (node: any, where: string) => {
    if (Array.isArray(node)) node.forEach((x, i) => visit(x, `${where}/${i}`));
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (['example', 'examples'].includes(k)) continue;
        if ((k === 'schema' || k === 'itemSchema') && v && typeof v === 'object') out.push([`${where}/${k}`, v as Rec]);
        else visit(v, `${where}/${k}`);
      }
    }
  };
  visit(doc.paths, '#/paths');
  visit(doc.components.parameters, '#/components/parameters');
  visit(doc.components.responses, '#/components/responses');
  return out;
}

// ---- 4. Every example fits its schema ----

test('every example validates against its schema, and every request and success response has one', () => {
  let checked = 0;
  for (const { where, role, type, media } of mediaTypes()) {
    const schema = media.schema ?? media.itemSchema;
    assert.ok(schema, `${where} ${type}: no schema`);
    const validate = compileInline(schema);
    const values: unknown[] = [];
    if ('example' in media) values.push(media.example);
    for (const e of Object.values<Rec>(media.examples ?? {})) if ('dataValue' in e) values.push(e.dataValue);
    if (role !== 'error') assert.ok(values.length > 0, `${where} ${type}: no example`);
    for (const value of values) {
      assert.ok(validate(value), `${where} ${type}: ${JSON.stringify(validate.errors?.slice(0, 3))}`);
      checked++;
    }
  }
  assert.ok(checked >= 30, `${checked} examples`);
});

test('the serialized examples say the same as the data: jsonl lines and the server-sent event', () => {
  const ledger = doc.paths['/api/ledger'].get.responses['200'].content['application/jsonl'].examples.lines;
  assert.deepEqual(ledger.serializedValue.trim().split('\n').map((l: string) => JSON.parse(l)), ledger.dataValue);
  const streams = ['/api/boards/{board}/events', '/api/events', '/api/chats/{session}/events'].map((p) => doc.paths[p].get.responses['200'].content['text/event-stream']);
  for (const sse of streams.flatMap((s) => Object.values<Rec>(s.examples))) {
    const fields = Object.fromEntries(sse.serializedValue.trim().split('\n').map((l: string) => l.split(': ')));
    assert.deepEqual(fields, sse.dataValue);
  }
});

// ---- 5. The document and api.md say the same (api.md 52, 56) ----

/** The rows of api.md's Operations table. */
function tableRows(): { id: string; method: string; path: string; who: string }[] {
  const section = apiMd.split(/^## Operations$/m)[1]!.split(/^## /m)[0]!;
  const rows = [...section.matchAll(/^\| `(\w+)` \| `([A-Z]+) (\S+)` \| (\w+) \|/gm)]
    .map((m) => ({ id: m[1]!, method: m[2]!, path: m[3]!, who: m[4]! }));
  assert.ok(rows.length >= 13, 'the operations table was not found in api.md');
  return rows;
}

test('every operation in api.md is in openapi.json, with its method and path, and nothing else is', () => {
  const rows = tableRows();
  assert.deepEqual(ops.map((o) => `${o.id} ${o.method} ${o.path}`).sort(), rows.map((r) => `${r.id} ${r.method} ${r.path}`).sort());
});

test('the problem codes are the codes of api.md 40', () => {
  const section = apiMd.split(/^## Errors$/m)[1]!.split(/^## /m)[0]!;
  const codes = [...section.matchAll(/^\| `([a-z-]+)` \| (\d{3}) \|/gm)].map((m) => m[1]!);
  assert.equal(codes.length, 13);
  const problem = schemaFiles().find((f) => f.schema.$id === `${API}problem.schema.json`)!.schema as Rec;
  const inPattern = /\(([^)]+)\)\$$/.exec(problem.$defs.code.pattern)![1]!.split('|');
  assert.deepEqual([...inPattern].sort(), [...codes].sort());
});

test('each event has a component named after its type, and ledgerEvent is the discriminated union of them', () => {
  const types = (doc.components.schemas.ledgerEvent.oneOf as Rec[]).map((o) => String(o.$ref).split('/').pop());
  assert.equal(doc.components.schemas.ledgerEvent.discriminator.propertyName, 'type');
  assert.equal(types.length, 13);
  for (const t of types) assert.equal(doc.components.schemas[t!].$ref, `${SCHEMA_BASE}schema/ledger/12/events/${t}.schema.json#/$defs/stored`);
  assert.equal(types.length, Object.keys(doc.components.schemas).filter((k) => doc.components.schemas[k].$ref?.endsWith('#/$defs/stored')).length);
});
