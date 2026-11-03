// The access rules in both layouts of the board's data folder (D-084 decisions 1 and 6, ACCESS_01): today's
// (`.visionboard/<file>`) and the ledger folders' (`.visionboard/<ledger>/<file>`), at the project's root and in a
// nested project (`sub/`). Per ledger: the ledger, `agents.json`, `lock`, `images/`, `apps/`, `app-state/`,
// `.gitignore`. Repo-wide, at `.visionboard/` only: `chat-sessions.json`, `permissions.json`, `attachments/`. A ledger
// is never named like a data folder (`images`, `apps`, …: refused by name, D-084 decision 1), so that is no case here.
// Each test tries to reach a secret the way an agent could. On a real board folder (access-fixture.ts).
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { symlinkSync } from 'node:fs';
import path from 'node:path';
import type { Decision, Facts } from '../src/index.ts';
import { policy } from '../src/index.ts';
import * as words from '../src/words/agent-access.ts';
import { accessFixture } from './access-fixture.ts';

/** Each per-ledger file, by a path inside a data folder, and what a read and a write of it get at the project's root. */
const PER_LEDGER: [string, Decision, Decision][] = [
  ['agents.json', { refuse: words.boardSecrets }, { refuse: words.boardSecrets }],
  ['ledger.jsonl', { allow: true }, { refuse: words.theLedger }],
  ['lock', { allow: true }, { refuse: words.boardFiles }],
  ['app-state/s.json', { refuse: words.appState }, { refuse: words.appState }],
  ['images/a.png', { allow: true }, { allow: true }],
  ['apps/calc/app.json', { allow: true }, { allow: true }],
  ['.gitignore', { allow: true }, { refuse: words.boardFiles }],
];
/** Today's layout, then two ledgers' folders. */
const LAYOUTS = ['.visionboard/', '.visionboard/main/', '.visionboard/ui/'];
const NESTED = LAYOUTS.map((l) => `sub/${l}`);
const SECRETS = ['agents.json', 'app-state/s.json'];

const made = [...LAYOUTS, ...NESTED].flatMap((l) => PER_LEDGER.map(([f]) => `${l}${f}`))
  .concat(['.visionboard/main/attachments/x.pdf', '.visionboard/main/permissions.json', '.visionboard/main/chat-sessions.json']);
const fx = accessFixture(made);
symlinkSync('../agents.json', path.join(fx.folder, '.visionboard/main/images/sneaky')); // a ledger's pictures, to its keys
symlinkSync('.visionboard/main', path.join(fx.folder, 'ledger-link'));                   // a link to a ledger's folder
after(() => fx.remove());

const read = (p: string, recursive?: boolean): Facts => ({ kind: 'read', path: p, ...(recursive && { recursive }) });
const write = (p: string): Facts => ({ kind: 'write', op: 'edit', path: p });
const command = (c: string): Facts => ({ kind: 'command', command: c, risks: [], paths: [] });
const decide = (f: Facts, cwd?: string): Decision => policy(f, fx.folder, cwd === undefined ? {} : { cwd: path.join(fx.folder, cwd) });
const refused = (d: Decision) => 'refuse' in d;

test('D-084: every per-ledger file is decided alike in today\'s layout and in any ledger\'s folder', () => {
  for (const layout of LAYOUTS) {
    for (const [file, r, w] of PER_LEDGER) {
      assert.deepEqual(decide(read(`${layout}${file}`)), r, `read ${layout}${file}`);
      assert.deepEqual(decide(write(`${layout}${file}`)), w, `write ${layout}${file}`);
    }
  }
});

test('D-084: in a nested project too, a ledger\'s keys and app state are closed and its ledger unwritten; the rest as today', () => {
  for (const layout of NESTED) {
    for (const file of SECRETS) {
      assert.ok(refused(decide(read(`${layout}${file}`))), `read ${layout}${file}`);
      assert.ok(refused(decide(write(`${layout}${file}`))), `write ${layout}${file}`);
    }
    assert.deepEqual(decide(read(`${layout}ledger.jsonl`)), { allow: true }, layout);
    assert.deepEqual(decide(write(`${layout}ledger.jsonl`)), { refuse: words.theLedger }, layout);
    for (const [file] of PER_LEDGER) {
      for (const f of [read, write]) assert.deepEqual(decide(f(`${layout}${file}`)), decide(f(`sub/.visionboard/${file}`)), `${layout}${file}`);
    }
  }
});

test('D-084: the repo-wide files are the person\'s at .visionboard/; in a ledger\'s folder they get no looser answer', () => {
  for (const p of ['.visionboard/chat-sessions.json', 'sub/.visionboard/chat-sessions.json', '.visionboard/main/chat-sessions.json', 'sub/.visionboard/ui/chat-sessions.json']) {
    assert.deepEqual(decide(read(p)), { refuse: words.boardSecrets }, `read ${p}: closed wherever it sits`);
    assert.deepEqual(decide(write(p)), { refuse: words.boardSecrets }, `write ${p}`);
  }
  assert.deepEqual(decide(write('.visionboard/permissions.json')), { refuse: words.permissionsFile });
  assert.deepEqual(decide(write('.visionboard/main/permissions.json')), { refuse: words.boardFiles });
  assert.deepEqual(decide(write('.visionboard/attachments/2026-10-30/1-a.pdf')), { refuse: words.theirAttachments });
  assert.deepEqual(decide(command('python3 read.py .visionboard/attachments/2026-10-30/1-a.pdf')), { ask: true, scopes: ['once'] }, 'the row\'s own unknownCommand');
  assert.ok(refused(decide(command('python3 read.py .visionboard/main/attachments/x.pdf'))), 'not in a ledger\'s folder');
  for (const p of ['.visionboard/attachments/images/x.png', '.visionboard/attachments/apps/calc/app.json']) {
    assert.deepEqual(decide(write(p)), { refuse: words.theirAttachments }, `${p}: an attached file is never a ledger's picture`);
  }
});

test('D-084: a ledger\'s pictures and apps are written freely; .git and secrets inside them stay closed', () => {
  for (const layout of ['.visionboard/', '.visionboard/main/', '.visionboard/ui/']) {
    assert.deepEqual(decide(write(`${layout}images/new.svg`)), { allow: true }, layout);
    assert.deepEqual(decide(write(`${layout}apps/calc/new.js`)), { allow: true }, layout);
    for (const p of ['apps/calc/.git/config', 'images/.git/x']) {
      assert.deepEqual(decide(read(`${layout}${p}`)), { refuse: words.gitFolder }, `${layout}${p}`);
      assert.deepEqual(decide(write(`${layout}${p}`)), { refuse: words.gitFolder }, `${layout}${p}`);
    }
    assert.deepEqual(decide(read(`${layout}images/.env`)), { refuse: words.secretsFiles });
    assert.deepEqual(decide(write(`${layout}apps/calc/.npmrc`)), { refuse: words.secretsFiles });
  }
});

test('D-084: a ledger\'s keys are not reached by another route: case, `..`, a link, a search, the shell\'s folder', () => {
  assert.deepEqual(decide(read('.VisionBoard/Main/Agents.json')), { refuse: words.boardSecrets }, 'another case');
  assert.deepEqual(decide(read('.visionboard/main/images/../agents.json')), { refuse: words.boardSecrets });
  assert.deepEqual(decide(write('.visionboard/main/images/sneaky')), { refuse: words.boardSecrets }, 'its pictures, by a link to its keys');
  assert.deepEqual(decide(read('ledger-link/agents.json')), { refuse: words.boardSecrets }, 'a link to the ledger\'s folder');
  assert.deepEqual(decide(read('ledger-link/app-state/s.json')), { refuse: words.appState });
  for (const where of ['.visionboard', '.visionboard/main', 'sub/.visionboard/ui', 'sub']) assert.ok(refused(decide(read(where, true))), `a search of ${where}`);
  assert.deepEqual(decide(read('.visionboard/ui/images', true)), { allow: true }, 'a search of pictures only');
  assert.ok(refused(decide(command('cat agents.json'), '.visionboard/main')), 'from the ledger\'s folder');
  assert.ok(refused(decide(command('cat ../main/agents.json'), '.visionboard/ui')), 'from another ledger\'s');
  assert.ok(refused(decide(command('echo x >> ledger.jsonl'), 'sub/.visionboard/main')));
});

test('D-084: a command naming a ledger\'s keys or app state is refused, spelled out or as a pattern', () => {
  for (const c of ['cat .visionboard/main/agents.json', 'cat sub/.visionboard/ui/agents.json', 'cat .visionboard/*/agents.json',
    'cat .visionboard/main/*', 'cat .visionboard/main/agen*', 'cat .visionboard/m?in/agents.json', 'cat .visionboard/[m]ain/agents.json',
    'cat sub/.visionboard/ui/app-state/*', 'cat .visionboard/main/app-st*/s.json', 'cat .visionboard/*/*', 'head -c 99 .visionboard/ui/agents.json',
    'python3 read.py .visionboard/main/agents.json', 'cat $HOME/p/.visionboard/main/agents.json', 'cat .visionboard/main/chat-sessions.json',
    'echo x > .visionboard/main/ledger.jsonl', 'sed -i s/a/b/ sub/.visionboard/main/ledger.jsonl', 'cp x .visionboard/main/lock',
    'rm -rf .visionboard/main', 'rm .visionboard/ui/.gitignore']) {
    assert.ok(refused(decide(command(c))), c);
  }
  assert.deepEqual(decide(command('cat .visionboard/main/agents.json')), { refuse: words.commandNames('.visionboard/main/agents.json', words.boardSecrets) });
  // A pattern is refused for what it could name, not because `.visionboard/**` closes writes: in a nested project
  // nothing else would refuse it, and the reason is the keys'.
  for (const c of ['sub/.visionboard/main/agen*', 'sub/.visionboard/main/*', 'sub/.visionboard/*/agents.jso?', '.visionboard/main/*', '.visionboard/ui/agen*']) {
    assert.deepEqual(decide(command(`cat ${c}`)), { refuse: words.commandNames(c, words.boardSecrets) }, c);
  }
  for (const c of ['sub/.visionboard/main/app-st*/s.json', 'sub/.visionboard/app-st*/s.json']) {
    assert.deepEqual(decide(command(`cat ${c}`)), { refuse: words.commandNames(c, words.appState) }, `${c}: today's layout too`);
  }
  assert.deepEqual(decide(command('cat .visionboard/main/ledger.jsonl')), { allow: true }, 'the ledger is read');
  assert.deepEqual(decide(command('ls .visionboard/main/images')), { allow: true });
});

test('the open ledger only, while it may be written (FIX_01 F2): its pictures and apps go; another ledger\'s, or a read-only one, never; unknown asks the board', () => {
  const at = (folder: string, writable?: boolean) => ({ ledger: { folder, ...(writable !== undefined && { writable }) } });
  const on = (f: Facts, folder: string, writable?: boolean) => policy(f, fx.folder, at(folder, writable));
  assert.deepEqual(on(write('.visionboard/main/images/new.png'), '.visionboard/main', true), { allow: true });
  assert.deepEqual(on(write('.visionboard/main/apps/calc/new.js'), '.visionboard/main', true), { allow: true });
  assert.deepEqual(on(write('.visionboard/images/new.png'), '.visionboard', true), { allow: true }, 'today\'s layout open');
  for (const p of ['.visionboard/ui/images/new.png', '.visionboard/ui/apps/calc/new.js', '.visionboard/images/new.png']) {
    assert.deepEqual(on(write(p), '.visionboard/main', true), { refuse: words.boardFiles }, `${p}: not the open ledger's`);
  }
  assert.deepEqual(on(write('.visionboard/main/images/new.png'), '.visionboard', true), { refuse: words.boardFiles }, 'a ledger folder with today\'s layout open');
  for (const p of ['.visionboard/main/images/new.png', '.visionboard/main/apps/calc/new.js']) {
    assert.deepEqual(on(write(p), '.visionboard/main', false), { refuse: words.ledgerReadOnly }, `${p}: read-only`);
    assert.ok('ask' in on(write(p), '.visionboard/main'), `${p}: the hook can't tell, so the board is asked`);
  }
  assert.ok(refused(on(command('cp x.png .visionboard/ui/images/x.png'), '.visionboard/main', true)), 'a command into another ledger');
  assert.ok(refused(on(command('rm .visionboard/main/images/new.png'), '.visionboard/main', false)), 'a command while read-only');
  assert.deepEqual(on(read('.visionboard/ui/images/new.png'), '.visionboard/main', false), { allow: true }, 'reads are as before');
  assert.deepEqual(on(write('.visionboard/main/images/.env'), '.visionboard/main', true), { refuse: words.secretsFiles });
});
