// The TypeScript types written from the schemas (gen-types.mjs): objects, unions and long enums get a
// name, short leaves are written in place, an OpenAPI component that only points at a file names the
// file once, rules (if/then) add no type, a schema that says nothing is any JSON value, and each
// operation's input and output come out of its parameters, body and success answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indent, operationTypes, typeWriter, wrap } from './gen-types.mjs';

const ID = 'https://x.invalid/thing.schema.json';
const schemas = new Map([[ID, { $id: ID, type: 'object', required: ['id'], properties: {
  id: { $ref: '#/$defs/id' }, mode: { $ref: '#/$defs/mode' }, kids: { type: 'array', items: { $ref: ID } }, any: { description: 'Anything.' },
}, allOf: [{ $ref: '#/$defs/rules' }], $defs: {
  id: { type: 'string', pattern: '^[a-z]+$' }, mode: { enum: ['a', 'b', 'c', 'd'] }, rules: { if: { required: ['id'] }, then: { required: ['mode'] } },
} }]]);
const doc = {
  paths: { '/api/things/{id}': { put: {
    operationId: 'put_thing', parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }, { name: 'dry', in: 'query', schema: { type: 'boolean' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/thing' } } } },
    responses: { 200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/thing' } } } }, 201: { content: { 'application/json': { schema: { type: 'object', properties: { made: { const: true } } } } } }, 400: { $ref: '#/components/responses/bad' } },
  } } },
  components: { schemas: { thing: { $ref: ID } }, responses: { bad: { description: 'Bad.' } } },
};

test('a named schema, a leaf in place, a long enum named, rules adding nothing, any JSON value, and a recursive list', () => {
  const w = typeWriter(doc, schemas);
  assert.equal(w.ts({ $ref: '#/components/schemas/thing' }, doc), 'Thing');
  const [thing, mode] = w.declarations();
  assert.equal(thing.name, 'Thing', 'the component that only points at the file names the file once');
  assert.equal(thing.text, '{\nid: string;\nmode?: ThingMode;\nkids?: Thing[];\nany?: JsonValue;\n}');
  assert.deepEqual([mode.name, mode.text], ['ThingMode', '"a" | "b" | "c" | "d"']);
  assert.equal(w.declarations().length, 2, 'the rules got no name');
});

test('each operation: path and query by name, body, and its success answers as one union', () => {
  const { rows } = operationTypes(doc, schemas);
  assert.deepEqual(rows, [{ operationId: 'put_thing', input: '{\nid: string;\ndry?: boolean;\nbody: Thing;\n}', output: 'Thing | {\nmade?: true;\n}' }]);
});

test('wrap: parentheses only around a top-level union or intersection; indent lays out by braces', () => {
  assert.deepEqual([wrap('A | B'), wrap('{ a: A | B }'), wrap('"x|y"'), wrap('A[]')], ['(A | B)', '{ a: A | B }', '"x|y"', 'A[]']);
  assert.equal(indent('{\na: {\nb: 1;\n};\n}'), '{\n  a: {\n    b: 1;\n  };\n}');
});
