// Argument parsing: types from the generated table, the three ways to write a flag, and every way
// a command line can be wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, assemble, parseArgs } from '../src/index.ts';

const command = (name: string) => COMMANDS.find((c) => c.name === name) ?? assert.fail(`no command ${name}`);
const parse = (name: string, ...argv: string[]) => parseArgs(command(name), argv);
const values = (name: string, ...argv: string[]) => {
  const r = parse(name, ...argv);
  return r.ok ? r.value.values : assert.fail(r.message);
};
const message = (name: string, ...argv: string[]) => {
  const r = parse(name, ...argv);
  return r.ok ? assert.fail('expected a parse failure') : r.message;
};

test('numbers and booleans are typed from the table', () => {
  assert.deepEqual(values('show-node', '--board', 'roadmap', '--n', '3', '--linked'), { board: 'roadmap', n: 3, linked: true });
  assert.deepEqual(values('check-responses', '--board', 'b', '--after', '12', '--wait', '60'), { board: 'b', after: 12, wait: 60 });
});

test('a flag can be written --name value, --name=value, or (a boolean) --no-name', () => {
  assert.deepEqual(values('show-node', '--n=3', '--board=roadmap', '--linked=false'), { n: 3, board: 'roadmap', linked: false });
  assert.deepEqual(values('show-node', '--board', 'r', '--n', '1', '--linked', 'false'), { board: 'r', n: 1, linked: false });
  assert.deepEqual(values('show-node', '--board', 'r', '--n', '1', '--no-linked'), { board: 'r', n: 1, linked: false });
});

test('a boolean switch does not swallow the flag after it', () => {
  assert.deepEqual(values('show-node', '--linked', '--board', 'r', '--n', '2'), { linked: true, board: 'r', n: 2 });
});

test('a json input takes JSON text', () => {
  assert.deepEqual(values('write-board', '--items', '[{"type":"board"}]'), { items: [{ type: 'board' }] });
  assert.match(message('write-board', '--items', '[oops'), /--items must be JSON text/);
});

test('global flags are read beside the inputs', () => {
  const r = parse('list-boards', '--server', 'http://x:1', '--secret', 's3', '--text', '--json-body', '-');
  assert.ok(r.ok);
  assert.deepEqual([r.value.server, r.value.secret, r.value.text, r.value.jsonBody, r.value.help], ['http://x:1', 's3', true, '-', false]);
  const h = parse('list-boards', '-h');
  assert.ok(h.ok && h.value.help);
});

test('a wrong type, an unknown flag, a missing value, a stray word and a repeat are refused in plain words', () => {
  assert.match(message('show-node', '--n', 'three'), /--n must be a whole number, not "three"/);
  assert.match(message('show-node', '--linked=maybe'), /--linked must be true or false/);
  assert.match(message('show-node', '--colour', 'red'), /Unknown flag --colour/);
  assert.match(message('show-node', '--board'), /--board needs a value/);
  assert.match(message('show-node', '--board', '--n', '1'), /--board needs a value/);
  assert.match(message('show-node', 'roadmap'), /Unexpected argument "roadmap"/);
  assert.match(message('show-node', '--board', 'a', '--board', 'b'), /--board is given twice/);
  assert.match(message('show-node', '--no-board'), /Unknown flag --no-board/);
});

test('assemble: path and query inputs go by name, body inputs under body', () => {
  const parsed = parse('write-board', '--board', 'pricing', '--items', '[]');
  assert.ok(parsed.ok);
  assert.deepEqual(assemble(command('write-board'), parsed.value), { ok: true, input: { board: 'pricing', body: { items: [] } } });
  const read = parse('list-boards');
  assert.ok(read.ok);
  assert.deepEqual(assemble(command('list-boards'), read.value), { ok: true, input: {} });
});

test('assemble: a missing required input is named; a --json-body supplies body inputs and flags win', () => {
  const none = parse('show-node', '--board', 'r');
  assert.ok(none.ok);
  assert.deepEqual(assemble(command('show-node'), none.value), { ok: false, message: 'show-node needs --n.' });

  const grant = parse('request-grant', '--reason', 'from the flag');
  assert.ok(grant.ok);
  const refused = assemble(command('request-grant'), grant.value);
  assert.equal(refused.ok, false);
  const fromFile = { board: 'roadmap', region: 'review', reason: 'from the file' };
  assert.deepEqual(assemble(command('request-grant'), grant.value, fromFile),
    { ok: true, input: { body: { board: 'roadmap', region: 'review', reason: 'from the flag' } } });
});
