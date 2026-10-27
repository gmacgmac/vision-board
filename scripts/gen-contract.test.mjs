// The contract values generated from the one source (gen-contract.mjs): the problem codes come from
// problem.schema.json and its pattern must list the same codes; a path parameter needs words; the
// folder header and the default server come from openapi.json. The server and the client import
// the one table (no copy left to drift).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROBLEMS as GENERATED, PROBLEM_BASE } from '#format';
import { PROBLEM_ID, constantsOf, pathWordsOf, problemsOf } from './gen-contract.mjs';
import { SPEC, loadSchemas } from './gen-api.mjs';

const real = loadSchemas();
const withProblem = (problem) => new Map([[PROBLEM_ID, problem]]);
const problemSchema = (codes, listed = Object.keys(codes)) => ({
  $defs: { code: { pattern: `^https://x\\.invalid/problems/(${listed.join('|')})$` }, codes: { properties: codes } },
});

test('the problem table and its base come from problem.schema.json, as the server and the client read them', () => {
  const { base, problems } = problemsOf(real);
  assert.equal(base, PROBLEM_BASE);
  assert.deepEqual(problems, JSON.parse(JSON.stringify(GENERATED)));
  assert.deepEqual(problems['locked'], { status: 423, title: 'Locked' });
});

test('a code the pattern lists but the table lacks (or the reverse) fails the generator', () => {
  const codes = { 'bad-request': { const: 400, title: 'Bad request' } };
  assert.deepEqual(problemsOf(withProblem(problemSchema(codes))), { base: 'https://x.invalid/problems/', problems: { 'bad-request': { status: 400, title: 'Bad request' } } });
  assert.throws(() => problemsOf(withProblem(problemSchema(codes, ['bad-request', 'gone']))), /lists \[bad-request,gone\]/);
  assert.throws(() => problemsOf(withProblem(problemSchema({ odd: { title: 'Odd' } }))), /status const and a title/);
});

test('every path parameter has words; a new one fails until it has', () => {
  const doc = JSON.parse(readFileSync(SPEC, 'utf8'));
  assert.equal(pathWordsOf(doc).board, 'board id');
  assert.throws(() => pathWordsOf({ paths: { '/api/x/{thing}': { get: { parameters: [{ name: 'thing', in: 'path' }] } } } }), /no words.*thing/);
});

test('the folder header, the default server and the route prefix come from openapi.json', () => {
  const doc = JSON.parse(readFileSync(SPEC, 'utf8'));
  assert.deepEqual(constantsOf(doc), { header: 'VB-Project', server: 'http://127.0.0.1:4466', port: 4466, prefix: '/api/' });
  assert.throws(() => constantsOf({ ...doc, servers: [{ url: 'https://example.com' }] }), /servers\[0\]/);
  assert.throws(() => constantsOf({ ...doc, paths: { '/other': {} } }), /every path starts with \/api\//);
});
