// The maintainer's rulings of 2026-10-29 on the access rules (WIRE_01 Run 4, D-067 proposed): app state
// is closed to the agent's reads and the ledger to its writes in any board folder, `.envrc` and `.npmrc`
// are secrets (345); the agent does not see or touch git: `.git` in any folder is refused both ways and
// so is every git command, however it is spelled (346). On a real board folder (access-fixture.ts).
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Decision, Facts } from '../src/index.ts';
import { claudeDenyRules, kiroAccess, policy, readOnlyCommand, rememberedHead } from '../src/index.ts';
import * as words from '../src/words/agent-access.ts';
import { accessFixture } from './access-fixture.ts';

const fx = accessFixture();
after(() => fx.remove());
const read = (p: string): Facts => ({ kind: 'read', path: p });
const write = (p: string): Facts => ({ kind: 'write', op: 'edit', path: p });
const command = (c: string): Facts => ({ kind: 'command', command: c, risks: [], paths: [] });
const decide = (f: Facts): Decision => policy(f, fx.folder);
const refused = (d: Decision) => 'refuse' in d;

test('345: app state unread and the ledger unwritten in any board folder; .envrc and .npmrc are secrets', () => {
  for (const p of ['.visionboard/app-state/s.json', 'sub/.visionboard/app-state/a/b.json']) {
    assert.ok(refused(decide(read(p))), p);
    assert.ok(refused(decide(write(p))), p);
  }
  assert.deepEqual(decide(read('sub/.visionboard/ledger.jsonl')), { allow: true });
  assert.deepEqual(decide(write('sub/.visionboard/ledger.jsonl')), { refuse: words.theLedger });
  for (const p of ['.envrc', '.npmrc', 'apps/web/.npmrc', 'apps/web/.envrc']) {
    assert.deepEqual(decide(read(p)), { refuse: words.secretsFiles }, p);
    assert.deepEqual(decide(write(p)), { refuse: words.secretsFiles }, p);
  }
  assert.ok(refused(decide(command('cat .npmrc'))));
});

test('346: .git in any folder is refused both ways, inside the board\'s pictures and apps too', () => {
  for (const p of ['.git', '.git/HEAD', '.git/config', 'sub/.git/hooks/pre-commit', '.visionboard/apps/calc/.git/config', '.visionboard/images/.git/x']) {
    assert.deepEqual(decide(read(p)), { refuse: words.gitFolder }, `read ${p}`);
    assert.deepEqual(decide(write(p)), { refuse: words.gitFolder }, `write ${p}`);
  }
  assert.ok(refused(decide(command('cat .git/config'))));
  assert.ok(refused(decide(command('ls -la .git'))));
  assert.deepEqual(decide(read('.gitignore')), { allow: true }, '.gitignore is a file of the folder');
});

test('346: every git command is refused, read-only ones too, however it is spelled', () => {
  for (const c of ['git status', 'git log --oneline', 'git diff', 'git show HEAD:src/x.ts', 'git commit -m x', 'git -C src log',
    'cd src && git log', 'env A=1 git log', 'FOO=1 git status', '/usr/bin/git log', 'ls | git log', 'g\\it log', '"git" log',
    'sh -c "git log"', 'bash -c \'cd src; git push\'', 'x & git log', 'echo `git log`', 'cat $(git ls-files)']) {
    assert.deepEqual(decide(command(c)), { refuse: words.gitIsThePersons }, c);
  }
  assert.equal(readOnlyCommand('git status'), null, 'git is off the read-only allow-list');
  assert.equal(rememberedHead('git commit -m x'), null);
  for (const c of ['ls .github', 'cat .gitignore', 'grep -n digit src/x.ts', 'npm install simple-git']) assert.ok(!refused(decide(command(c))), c);
});

test('the second lines follow the table: Claude Code and Kiro refuse .git both ways and git commands', () => {
  const claude = claudeDenyRules('/w');
  for (const r of ['Read(//w/**/.git/**)', 'Edit(//w/**/.git/**)', 'Read(//w/**/.npmrc)', 'Read(//w/**/.visionboard/app-state/**)', 'Edit(//w/**/.visionboard/ledger.jsonl)', 'Bash(git *)', 'Bash(git)']) {
    assert.ok(claude.includes(r), r);
  }
  const kiro = kiroAccess();
  const has = (r: object) => kiro.rules.some((x) => JSON.stringify(x) === JSON.stringify(r));
  assert.ok(has({ capability: 'fs_read', match: ['**/.git/**'], effect: 'deny' }));
  assert.ok(has({ capability: 'shell', match: ['git', 'git *'], effect: 'deny' }));
  assert.ok((kiro.toolsSettings.read!.deniedPaths as string[]).includes('**/.git/**'));
  assert.deepEqual(kiro.toolsSettings.shell, { autoAllowReadonly: false, deniedCommands: ['git(\\s.*)?'] });
});
