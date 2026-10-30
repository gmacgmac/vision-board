// The access policy on paths (agent-access RULES_01): every row of the rules table for a read and a
// write, decided on the file a path reaches: `..`, symlinks (to a refused file, outside, a folder,
// dangling, a loop), case, a second name (a hard link), files not made yet, absolute paths, `~`, and
// the board's folder itself a symlink. On a real temporary folder, through the real file system.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import type { Decision, PolicyFacts } from '../src/index.ts';
import { ACCESS_RULES, OUTSIDE_RULE, policy, resolveIn } from '../src/index.ts';
import * as words from '../src/words/agent-access.ts';
import { accessFixture } from './access-fixture.ts';

const fx = accessFixture();
after(() => fx.remove());

const read = (p: string, recursive?: boolean): PolicyFacts => ({ kind: 'read', path: p, ...(recursive && { recursive }) });
const write = (p: string): PolicyFacts => ({ kind: 'write', op: 'edit', path: p });
const decide = (facts: PolicyFacts, folder = fx.folder) => policy(facts, folder);
const ALLOW: Decision = { allow: true };
const ASK_IN: Decision = { ask: true, scopes: ['once', 'session', 'folder'] };
const ASK_OUT: Decision = { ask: true, scopes: ['once', 'session'] };
const ONCE: Decision = { ask: true, scopes: ['once'] };
const refuse = (why: string): Decision => ({ refuse: why });

/** Each row of the table, by a path it covers: [path, read, write]. */
const ROWS: [string, Decision, Decision][] = [
  ['src/x.ts', ALLOW, ASK_IN],
  ['.env', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['apps/web/.env', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['.env.local', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['.env.example', ALLOW, ASK_IN],
  ['apps/web/.env.example', ALLOW, ASK_IN],
  ['.env.example.local', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['.visionboard/agents.json', refuse(words.boardSecrets), refuse(words.boardSecrets)],
  ['.visionboard/chat-sessions.json', refuse(words.boardSecrets), refuse(words.boardSecrets)],
  ['sub/.visionboard/agents.json', refuse(words.boardSecrets), refuse(words.boardSecrets)],
  ['a/b/.visionboard/chat-sessions.json', refuse(words.boardSecrets), refuse(words.boardSecrets)],
  ['sub/.visionboard/ledger.jsonl', ALLOW, refuse(words.theLedger)],
  ['.envrc', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['apps/web/.npmrc', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['.visionboard/ledger.jsonl', ALLOW, refuse(words.theLedger)],
  ['.visionboard/lock', ALLOW, refuse(words.boardFiles)],
  ['.visionboard/app-state/s.json', refuse(words.appState), refuse(words.appState)],
  ['.visionboard/permissions.json', ALLOW, refuse(words.permissionsFile)],
  ['.visionboard/other.json', ALLOW, refuse(words.boardFiles)],
  ['.visionboard', ALLOW, refuse(words.boardFiles)],
  ['.visionboard/images/a.png', ALLOW, ALLOW],
  ['.visionboard/apps/calc/app.json', ALLOW, ALLOW],
  ['.visionboard/images/.env', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['.visionboard/attachments/2026-10-30/1-a.pdf', ALLOW, refuse(words.theirAttachments)],
  ['.visionboard/attachments/2026-10-30/new.txt', ALLOW, refuse(words.theirAttachments)],
  ['.visionboard/attachments', ALLOW, refuse(words.theirAttachments)],
  ['.visionboard/attachments/.env', refuse(words.secretsFiles), refuse(words.secretsFiles)],
  ['.git/HEAD', refuse(words.gitFolder), refuse(words.gitFolder)],
  ['.git/hooks/x', refuse(words.gitFolder), refuse(words.gitFolder)],
  ['.git', refuse(words.gitFolder), refuse(words.gitFolder)],
  ['sub/.git/hooks/x', refuse(words.gitFolder), refuse(words.gitFolder)],
  ['../outside/notes.txt', ASK_OUT, ASK_OUT],
];

test('every row of the table, for a read and a write', () => {
  assert.equal(ACCESS_RULES.length, 17, 'a new row needs its line in ROWS');
  for (const [p, r, w] of ROWS) {
    assert.deepEqual(decide(read(p)), r, `read ${p}`);
    assert.deepEqual(decide(write(p)), w, `write ${p}`);
  }
  assert.equal(OUTSIDE_RULE.why, words.filesOutsideTheFolder);
});

test('`..` is followed to the file it reaches, through the folders that are really there', () => {
  assert.deepEqual(decide(write('.visionboard/images/../ledger.jsonl')), refuse(words.theLedger));
  assert.deepEqual(decide(read('src/../.env')), refuse(words.secretsFiles));
  // `up` is a link to .visionboard/images, so `up/..` is .visionboard (as the kernel reads it), not the folder.
  assert.deepEqual(decide(read('up/../agents.json')), refuse(words.boardSecrets));
  assert.deepEqual(decide(read('../Board/.env')), refuse(words.secretsFiles), 'out and back in');
});

test('a symlink is decided by the file it points to', () => {
  assert.deepEqual(decide(read('notes')), refuse(words.secretsFiles), 'inside, to a refused file');
  assert.deepEqual(decide(read('out-link')), ASK_OUT, 'inside, to a file outside');
  assert.deepEqual(decide(write('vb-link/ledger.jsonl')), refuse(words.theLedger), 'a symlinked folder');
  assert.deepEqual(decide(read('vb-link/agents.json')), refuse(words.boardSecrets));
  assert.deepEqual(decide(write('.visionboard/images/sneaky')), refuse(words.boardSecrets), 'an allowed folder, to a refused file');
  assert.deepEqual(decide(write('.visionboard/images/hooky')), refuse(words.gitFolder), 'dangling: decided by where it would create');
  assert.deepEqual(decide(read('loop-a')), refuse(words.cannotFollow), 'a loop');
});

test(`case: .ENV is refused on any disk (this one ${fx.ignoresCase ? 'ignores' : 'keeps'} case: found by looking up .ENV beside .env)`, () => {
  assert.deepEqual(decide(read('.ENV')), refuse(words.secretsFiles));
  assert.deepEqual(decide(write('.VisionBoard/Ledger.jsonl')), refuse(words.theLedger));
  assert.deepEqual(decide(write('.GIT/hooks/new')), refuse(words.gitFolder));
  // A wrong-case path to a file that is there resolves to its real name where the disk ignores case.
  const r = resolveIn(fx.folder, '.VISIONBOARD/IMAGES/a.png');
  if (fx.ignoresCase) assert.equal(r.rel, '.visionboard/images/a.png');
  assert.deepEqual(decide(write('.VISIONBOARD/images/a.png')), fx.ignoresCase ? ALLOW : refuse(words.boardFiles));
});

test('a file not made yet is decided by its nearest existing folder', () => {
  assert.deepEqual(decide(write('src/new/deep/file.ts')), ASK_IN);
  assert.deepEqual(decide(write('.visionboard/images/new/pic.png')), ALLOW);
  assert.deepEqual(decide(write('.git/new-file')), refuse(words.gitFolder));
  assert.deepEqual(decide(write('new/../.env')), refuse(words.secretsFiles));
  assert.equal(resolveIn(fx.folder, 'src/new/file.ts').stat, undefined);
});

test('absolute paths: inside by the folder\'s real path or through its link; outside asked once or for the session', () => {
  assert.deepEqual(decide(read(path.join(fx.folder, 'src/x.ts'))), ALLOW);
  assert.deepEqual(decide(read(path.join(fx.folderLink, '.env'))), refuse(words.secretsFiles));
  assert.deepEqual(decide(read(path.join(fx.outside, 'notes.txt'))), ASK_OUT);
  assert.deepEqual(decide(write(path.join(fx.outside, 'new.txt'))), ASK_OUT);
  assert.deepEqual(decide(read(path.join(fx.outside, '.env'))), ASK_OUT, 'a .env outside is outside: asked');
  assert.deepEqual(decide(read('/')), ASK_OUT);
});

test('`~` is a name like any other: never expanded here', () => {
  assert.equal(resolveIn(fx.folder, '~/x').rel, '~/x');
  assert.deepEqual(decide(read('~/x')), ALLOW);
  assert.deepEqual(decide(read('~/.env')), refuse(words.secretsFiles));
});

test('the board\'s folder itself a symlink: the same answers', () => {
  for (const [p, r, w] of ROWS) {
    assert.deepEqual(decide(read(p), fx.folderLink), r, `read ${p}`);
    assert.deepEqual(decide(write(p), fx.folderLink), w, `write ${p}`);
  }
  assert.deepEqual(decide(read(path.join(fx.folder, '.visionboard/agents.json')), fx.folderLink), refuse(words.boardSecrets));
});

test('a file with a second name (a hard link) is never allowed unasked, and asked only once', () => {
  assert.deepEqual(decide(read('clean-hard.txt')), ONCE);
  assert.deepEqual(decide(write('clean-hard.txt')), ONCE);
});

test('a search reads everything under a folder: allowed only when nothing under it is refused', () => {
  assert.deepEqual(decide(read('clean', true)), ALLOW);
  assert.deepEqual(decide(read('src', true)), ALLOW);
  assert.deepEqual(decide(read('apps', true)), refuse(words.searchReaches('apps', 'apps/web/.env')));
  assert.equal('refuse' in decide(read('.', true)), true, 'the folder holds .env and the bots\' keys');
  const images = decide(read('.visionboard/images', true));
  assert.ok('refuse' in images && /would read \.visionboard\/images\/(sneaky|hooky),/.test(images.refuse), 'through `sneaky` (to agents.json) or `hooky` (into .git)');
  assert.deepEqual(decide(read('src', false)), ALLOW, 'a folder\'s names are not its files');
});

test('strict (agentAccessRules off): nothing is allowed unasked and nothing kept for the folder; refusals hold', () => {
  const strict = (f: PolicyFacts) => policy(f, fx.folder, { strict: true });
  assert.deepEqual(strict(read('src/x.ts')), ASK_OUT);
  assert.deepEqual(strict(write('.visionboard/images/a.png')), ASK_OUT);
  assert.deepEqual(strict(write('src/x.ts')), ASK_OUT);
  assert.deepEqual(strict(read('.env')), refuse(words.secretsFiles));
  assert.deepEqual(strict(write('.visionboard/ledger.jsonl')), refuse(words.theLedger));
});

test('no path, or no folder: refused', () => {
  assert.deepEqual(decide(read('')), refuse(words.noPath));
  assert.deepEqual(decide(read('src/x.ts'), path.join(fx.outside, 'missing')), refuse(words.noFolder));
  assert.deepEqual(decide(read('a\u0000b')), refuse(words.cannotFollow));
});

test('the reader is injected: a host can answer for its own disk', () => {
  const calls: string[] = [];
  const reader = {
    realpath: (p: string) => { calls.push(`realpath ${p}`); if (p === '/w') return '/w'; throw Object.assign(new Error('missing'), { code: 'ENOENT' }); },
    lstat: (p: string) => { calls.push(`lstat ${p}`); return undefined; },
    readlink: () => { throw new Error('not a link'); },
    readdir: () => [],
  };
  assert.deepEqual(policy(read('a/.env'), '/w', { reader }), refuse(words.secretsFiles));
  assert.ok(calls.length > 0, 'every look at the disk goes through the reader');
});
