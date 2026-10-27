// The generated command table: it covers exactly the agent operations, its names and path inputs
// agree with the route table, and nothing in it clashes with a global flag. (That the file is
// current is checked by `npm run gen -- --check` and scripts/gen-api.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONS } from '#format';
import { COMMANDS, GLOBAL_NAMES } from '../src/index.ts';

const agentOps = Object.values(OPERATIONS).filter((o) => o.xAgent);

test('one command per x-agent operation, named with hyphens, no others', () => {
  assert.deepEqual(COMMANDS.map((c) => c.operationId).sort(), agentOps.map((o) => o.operationId).sort());
  for (const c of COMMANDS) assert.equal(c.name, c.operationId.replaceAll('_', '-'));
});

test('path inputs are the route table\'s path parameters, in order; a body is sent exactly when the method is not GET', () => {
  for (const c of COMMANDS) {
    const op = OPERATIONS[c.operationId];
    assert.deepEqual(c.inputs.filter((i) => i.in === 'path').map((i) => i.name), [...op.pathParams], c.name);
    assert.equal(c.takesBody, op.method !== 'GET', c.name);
    assert.ok(c.inputs.filter((i) => i.in === 'path').every((i) => i.required), c.name);
    assert.ok(c.inputs.filter((i) => i.in === 'body').length === 0 || c.takesBody, c.name);
  }
});

test('every command has a summary and a description, every input a known type', () => {
  for (const c of COMMANDS) {
    assert.ok(c.summary && c.description, c.name);
    for (const i of c.inputs) assert.ok(['string', 'integer', 'number', 'boolean', 'json'].includes(i.type), `${c.name} --${i.name}`);
  }
});

test('no input is named like a global flag, or twice', () => {
  for (const c of COMMANDS) {
    const names = c.inputs.map((i) => i.name.replaceAll('_', '-'));
    assert.equal(new Set(names).size, names.length, c.name);
    for (const n of names) assert.ok(!GLOBAL_NAMES.includes(n), `${c.name} --${n} clashes with a global flag`);
  }
});

test('the inputs the README and the agent docs rely on exist with the right type', () => {
  const input = (cmd: string, name: string) => COMMANDS.find((c) => c.name === cmd)?.inputs.find((i) => i.name === name);
  assert.equal(input('check-responses', 'wait')?.type, 'integer');
  assert.equal(input('show-node', 'n')?.type, 'integer');
  assert.equal(input('show-node', 'linked')?.type, 'boolean');
  assert.deepEqual([input('join', 'label')?.in, input('join', 'label')?.required], ['body', true]);
  assert.deepEqual([input('write-board', 'items')?.type, input('write-board', 'items')?.required], ['json', true]);
});

test('vb list-apps (D-047 ruling 12) takes no input; no command calls an app tool', () => {
  const c = COMMANDS.find((x) => x.name === 'list-apps');
  assert.deepEqual([c?.operationId, c?.takesBody, c?.inputs.length], ['list_apps', false, 0]);
  assert.equal(COMMANDS.some((x) => x.operationId === 'call_app_tool'), false);
});
