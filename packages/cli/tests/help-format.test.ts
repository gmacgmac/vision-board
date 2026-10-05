// Help and the generic `--text` formatter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, commandHelp, formatText, overview } from '../src/index.ts';

test('the overview lists every command with its summary, and the global flags', () => {
  const text = overview();
  for (const c of COMMANDS) assert.ok(text.includes(c.name) && text.includes(c.summary), c.name);
  for (const flag of ['--server', '--secret', '--json-body', '--text', '--help']) assert.ok(text.includes(flag), flag);
});

test('a command\'s help is written from the table: usage, each input with its kind, the description', () => {
  const show = COMMANDS.find((c) => c.name === 'show-node')!;
  const text = commandHelp(show);
  assert.match(text, /^vb show-node: Read one node with its history/);
  assert.match(text, /Usage: vb show-node --board <string> --n <integer> \[--linked\] \[--text\]/);
  assert.match(text, /--n <integer>\s+required, path\. The node number\./);
  assert.match(text, /--linked\s+optional, query\./);
  assert.ok(!text.includes('--json-body <file|->]'), 'a GET takes no body');
  for (const c of COMMANDS) for (const i of c.inputs) assert.ok(commandHelp(c).includes(`--${i.name}`), `${c.name} --${i.name}`);
});

test('a command with a body says the body can come whole', () => {
  const text = commandHelp(COMMANDS.find((c) => c.name === 'write-board')!);
  assert.match(text, /Usage: vb write-board --board <string> --items <json> \[--json-body <file\|->\]/);
  assert.match(text, /body field \(or in --json-body\)/);
  assert.ok(text.split('\n').every((l) => l.length <= 140), 'lines stay readable');
});

test('formatText: key: value lines, nested paths, lists indexed', () => {
  assert.equal(formatText({ head: 51, boards: [{ board: 'roadmap', title: 'Plan' }, { board: 'pricing', title: 'Prices' }] }),
    'head: 51\nboards[0].board: roadmap\nboards[0].title: Plan\nboards[1].board: pricing\nboards[1].title: Prices');
});

test('formatText: empty containers, null, booleans, a bare value, and text with a line break', () => {
  assert.equal(formatText({ a: [], b: {}, c: null, d: false, e: 'x\ny' }), 'a: []\nb: {}\nc: null\nd: false\ne: "x\\ny"');
  assert.equal(formatText('plain'), 'plain');
  assert.equal(formatText(7), '7');
  assert.equal(formatText([]), '[]');
  assert.equal(formatText([1, [2]]), '[0]: 1\n[1][0]: 2');
});
