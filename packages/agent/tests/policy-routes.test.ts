// VERIFY_01's findings on the policy, closed in WIRE_01 Run 3: a command naming a path outside the folder
// is offered `once` only, so no kept yes covers a path outside (F2); a search of a folder that holds the
// board's folder walks the board's folder and is refused when anything under it is (F3); a command's
// words are resolved from the shell's working folder (the hook's `cwd`) and judged against the board's
// folder (F4). On a real board folder (access-fixture.ts).
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import type { Facts } from '../src/index.ts';
import { decide, policy } from '../src/index.ts';
import * as words from '../src/words/agent-access.ts';
import { accessFixture } from './access-fixture.ts';

const fx = accessFixture();
after(() => fx.remove());
const command = (c: string): Facts => ({ kind: 'command', command: c, risks: [], paths: [] });
const at = (rel: string) => path.join(fx.folder, rel);
const parent = path.dirname(fx.folder);

test('F2: a command naming a path outside the folder is offered once only; inside, it may still be kept', () => {
  for (const c of [`cat ${fx.outside}/notes.txt`, `grep -r TODO ${fx.outside}`, `sed -i s/a/b/ ${fx.outside}/notes.txt`, 'cat ../outside/notes.txt']) {
    assert.deepEqual(policy(command(c), fx.folder), { ask: true, scopes: ['once'] }, c);
  }
  assert.deepEqual(policy(command('sed -i s/a/b/ src/x.ts'), fx.folder), { ask: true, scopes: ['once', 'session', 'folder'] });
});

test('F3: a search of a folder holding the board\'s folder walks the board\'s folder and is refused', () => {
  for (const c of ['grep -r SECRET ..', `rg x ${parent}`, 'rg x /', `grep -rn KEY ${parent}`]) {
    const d = policy(command(c), fx.folder);
    assert.ok('refuse' in d && /^Searching /.test(d.refuse), `${c}: ${JSON.stringify(d)}`);
  }
  const grep = policy({ kind: 'read', path: parent, recursive: true }, fx.folder);
  assert.ok('refuse' in grep && /^Searching /.test(grep.refuse), 'Grep (or Kiro\'s search) of the parent');
  assert.deepEqual(policy(command(`grep -r x ${fx.outside}`), fx.folder), { ask: true, scopes: ['once'] }, 'an outside folder that holds no board folder is asked, once');
});

test('F4: a command\'s words are resolved from the shell\'s working folder, judged against the board\'s folder', () => {
  const vb = at('.visionboard');
  for (const c of ['cat agents.json', 'grep -h "" agents.json', 'head -c 999 chat-sessions.json']) {
    assert.ok('refuse' in policy(command(c), fx.folder, { cwd: vb }), c);
  }
  assert.deepEqual(policy(command('cat x.ts'), fx.folder, { cwd: at('src') }), { allow: true });
  assert.deepEqual(policy(command('cat notes.txt'), fx.folder, { cwd: fx.outside }), { ask: true, scopes: ['once'] });
});

test('F4: the gate passes the hook\'s cwd for a command, so a `cd` the CLI kept does not move the rules', async () => {
  const hook = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'cat agents.json' }, cwd: at('.visionboard') });
  const out = await decide(hook, async () => ({ approved: true, status: 'approved' }), () => false, { folder: fx.folder });
  assert.deepEqual([out.hookSpecificOutput.permissionDecision, out.hookSpecificOutput.permissionDecisionReason],
    ['deny', words.commandNames('agents.json', words.boardSecrets)]);
});
