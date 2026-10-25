// The MCP schema flattener and tool generator (api.md 47-49), on small documents: refs inlined
// and the stripped keys gone, allOf folded with the tighter bound, two patterns kept, if/then
// dropped but its fields still known, closures moved to additionalProperties, no output schema,
// and a merged input named twice refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatten, merge } from './mcp-schema.mjs';
import { toolsOf } from './gen-mcp.mjs';

const ID = 'https://x.invalid/common.json';
const schemas = new Map([[ID, { $id: ID, $schema: 'https://json-schema.org/draft/2020-12/schema', $defs: {
  text: { type: 'string', pattern: '\\S' },
  label: { $ref: `${ID}#/$defs/text`, maxLength: 80, description: 'A label.' },
  agent: { type: 'string', pattern: '^a-[a-z0-9]{8}$' },
  core: { type: 'object', required: ['label'], properties: { label: { $ref: `${ID}#/$defs/label` } } },
  sent: { type: 'object', properties: { key: { $ref: `${ID}#/$defs/text`, maxLength: 64 } }, allOf: [{ $ref: `${ID}#/$defs/core` }], unevaluatedProperties: false, 'x-note': 1, discriminator: { propertyName: 'type' } },
} }]]);
const ref = (name) => ({ $ref: `${ID}#/$defs/${name}` });

test('refs are inlined; $id, $schema, $defs, discriminator and x- keys are gone; allOf is folded and closed', () => {
  assert.deepEqual(flatten(ref('sent'), {}, schemas), {
    type: 'object', required: ['label'],
    properties: { label: { type: 'string', pattern: '\\S', maxLength: 80, description: 'A label.' }, key: { type: 'string', pattern: '\\S', maxLength: 64 } },
    additionalProperties: false,
  });
});

test('merge: bounds take the tighter value, required adds up, a later annotation wins, const subsumes enum', () => {
  assert.deepEqual(merge({ maxLength: 80, minimum: 1, required: ['a'], description: 'x' }, { maxLength: 40, minimum: 3, required: ['b'], description: 'y' }),
    { maxLength: 40, minimum: 3, required: ['a', 'b'], description: 'y' });
  assert.deepEqual(merge({ enum: ['person', 'agent'] }, { const: 'agent' }), { const: 'agent' });
  assert.throws(() => merge({ type: 'string' }, { type: 'integer' }), /cannot fold "type"/);
});

test('two patterns on one string are both kept, the second in a leaf allOf', () => {
  assert.deepEqual(flatten({ allOf: [ref('text'), ref('agent')] }, {}, schemas), { type: 'string', pattern: '\\S', allOf: [{ pattern: '^a-[a-z0-9]{8}$' }] });
});

test('if/then is dropped (looser), but a field only `then` names stays a known field of a closed object', () => {
  const s = { type: 'object', properties: { v: { enum: [2, 3] } }, if: { properties: { v: { const: 3 } } }, then: { required: ['agent'], properties: { agent: ref('agent') } }, unevaluatedProperties: false };
  assert.deepEqual(flatten(s, {}, schemas), { type: 'object', properties: { v: { enum: [2, 3] }, agent: {} }, additionalProperties: false });
});

const opDoc = (op, route = '/api/things/{thing}', method = 'post') => ({
  info: { version: '9.9.9' },
  paths: { [route]: { [method]: { operationId: 'make_thing', summary: 'Make a thing', description: 'Makes a thing.', 'x-agent': true, responses: { 201: { content: { 'application/json': { schema: ref('core') } } } }, ...op } } },
});
const thing = { name: 'thing', in: 'path', required: true, schema: ref('text'), description: 'Which thing.' };

test('a tool: path, query and body merged into one closed object; secret where agentSecret is named; hints for a write', () => {
  const { apiVersion, tools, routes } = toolsOf(opDoc({
    parameters: [thing, { name: 'dry', in: 'query', schema: { type: 'boolean' } }],
    requestBody: { content: { 'application/json': { schema: ref('sent') } } },
    security: [{ agentSecret: [] }],
  }), new Map([...schemas, ['https://vision-board.invalid/schema/api/common.schema.json', { $defs: { secret: { type: 'string', pattern: '^[A-Za-z0-9_-]{43}$' } } }]]));
  assert.equal(apiVersion, '9.9.9');
  assert.deepEqual(Object.keys(tools[0].inputSchema.properties), ['thing', 'dry', 'label', 'key', 'secret']);
  assert.deepEqual(tools[0].inputSchema.required, ['thing', 'label']);
  assert.equal(tools[0].inputSchema.additionalProperties, false);
  assert.equal(tools[0].inputSchema.properties.thing.description, 'Which thing.');
  assert.deepEqual(routes.make_thing, { path: ['thing'], query: ['dry'], body: ['label', 'key'], secret: true });
  assert.match(tools[0].description, /^Makes a thing\. Over MCP the secret is the `secret` argument/);
  assert.deepEqual(tools[0].annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false });
  assert.equal('outputSchema' in tools[0], false, 'no output schema in the tool list');
});

test('an input named in both the path and the body is refused', () => {
  const doc = opDoc({ parameters: [{ ...thing, name: 'label' }], requestBody: { content: { 'application/json': { schema: ref('core') } } } }, '/api/things/{label}');
  assert.throws(() => toolsOf(doc, schemas), /input "label" is named twice/);
});

test('a read is read-only and takes no secret when its security names none', () => {
  const { tools, routes } = toolsOf(opDoc({ parameters: [thing] }, '/api/things/{thing}', 'get'), schemas);
  assert.deepEqual(tools[0].annotations, { readOnlyHint: true, openWorldHint: false });
  assert.equal(routes.make_thing.secret, false);
});

test('$comment (where the schemas point at our own docs) never reaches a tool schema, at any depth', () => {
  const s = { type: 'object', description: 'A thing.', $comment: 'Was: api.md 1', properties: { a: { type: 'string', description: 'An a.', $comment: 'D-001' }, b: { type: 'array', items: { type: 'object', $comment: 'rule 3', properties: {} } } } };
  assert.ok(!JSON.stringify(flatten(s, {}, new Map())).includes('$comment'));
  assert.equal(flatten(s, {}, new Map()).properties.a.description, 'An a.');
});
