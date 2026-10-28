// The access policy on shell commands (agent-access RULES_01): a command that only reads (the allow-list,
// joined only by `|`, plain words) is a read of every path it names; any other is asked; any command
// naming a refused path, by any route the shell would take to it, is refused. On a real temporary folder.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Decision } from '../src/index.ts';
import { commandHead, policy, readOnlyCommand, shellWords } from '../src/index.ts';
import * as words from '../src/words/agent-access.ts';
import { accessFixture } from './access-fixture.ts';

const fx = accessFixture();
after(() => fx.remove());

const run = (command: string, strict = false) => policy({ kind: 'command', command, risks: [], paths: [] }, fx.folder, { strict });
const ALLOW: Decision = { allow: true };
const ASK_IN: Decision = { ask: true, scopes: ['once', 'session', 'folder'] };
const ASK_OUT: Decision = { ask: true, scopes: ['once', 'session'] };
const refused = (d: Decision) => 'refuse' in d;

test('commands that only read the folder go ahead', () => {
  for (const c of ['ls', 'pwd', 'cat src/x.ts', 'git log --oneline', 'git diff HEAD~1', 'grep -rn foo src | head',
    'git status', 'git branch', 'git branch -a -v', 'git show HEAD:src/x.ts', 'find . -name "*.ts"', 'tree src', 'wc -l src/x.ts',
    'head -n 5 src/x.ts | tail -n 2', 'rg foo src clean', 'grep foo src/x.ts', 'cat \'src/x.ts\'', 'stat .visionboard/ledger.jsonl',
    'cat .visionboard/ledger.jsonl', 'git rev-parse HEAD', 'ls -la .git', 'rg --files']) {
    assert.deepEqual(run(c), ALLOW, c);
  }
});

test('commands naming a refused path are refused, by any route to it', () => {
  const cases: [string, string][] = [
    ['cat .env', words.secretsFiles],
    ['cat .visionboard/agents.json', words.boardSecrets],
    ['echo x > .visionboard/ledger.jsonl', words.theLedger],
    ['rm .git/hooks/x', words.gitFolder],
    ['cat notes', words.secretsFiles],                        // a symlink to .env
    ['cat .e*', words.secretsFiles],                          // a glob that reaches .env
    ['cat .visionboard/*', words.boardSecrets],
    ['cat .en\'\'v', words.secretsFiles],                     // quotes the shell removes
    ['cat .\\env', words.secretsFiles],
    ['cat $\'\\x2eenv\'', words.secretsFiles],              // bash's and zsh's $'...'
    ['cat $\'\\056env\'', words.secretsFiles],
    ['cat "$HOME/proj/.env"', words.secretsFiles],            // a variable we can't resolve
    ['cat ${PWD}/.env', words.secretsFiles],
    ['cat ~/proj/.env', words.secretsFiles],
    ['cat $(echo .env)', words.secretsFiles],
    ['git show HEAD:.env', words.secretsFiles],
    ['grep -f.env src/x.ts', words.secretsFiles],             // a flag's value joined to it
    ['grep --file=.env src/x.ts', words.secretsFiles],
    ['cd src && cat ../.env', words.secretsFiles],
    ['cat .ENV', words.secretsFiles],
    ['sed -i s/a/b/ .visionboard/ledger.jsonl', words.theLedger],
    ['rm -rf .visionboard', words.boardFiles],
    ['ln -s ../../.git/hooks/pre-commit .visionboard/images/p', words.gitFolder],
    ['cat up/../agents.json', words.boardSecrets],
  ];
  for (const [c, why] of cases) {
    const d = run(c);
    assert.ok(refused(d), `${c}: ${JSON.stringify(d)}`);
    assert.ok((d as { refuse: string }).refuse.endsWith(why), `${c}: ${JSON.stringify(d)}`);
  }
  assert.deepEqual(run('cat .env'), { refuse: words.commandNames('.env', words.secretsFiles) });
});

test('a search that would read a refused file is refused, even when it names none', () => {
  for (const c of ['rg foo', 'grep -r foo', 'grep -rn foo .', 'grep -rn foo apps', 'rg -e foo', 'grep -r -e foo src', 'rg foo -g "*.ts"']) {
    assert.ok(refused(run(c)), c);
  }
  assert.deepEqual(run('grep -rn foo apps'), { refuse: words.searchReaches('apps', 'apps/web/.env') });
});

test('anything else is asked; outside the folder only once or for the session', () => {
  for (const c of ['npm test', 'git commit -m x', 'find . -delete', 'sed -i s/a/b/ src/x.ts', 'cat src/x.ts; rm src/x.ts',
    'cat src/x.ts && echo', 'ls | xargs rm', 'cat `ls`', 'git -c core.pager=sh log', 'git branch -D x', 'find . -exec rm {} \\;',
    'tree -o out src', 'git diff --output=out', 'cat src/*.ts', 'cat src/x.ts &', 'PAGER=x git log', 'rg --pre sh foo src',
    'cat src/x.ts\nrm src/x.ts', 'cat "unterminated']) {
    assert.deepEqual(run(c), ASK_IN, c);
  }
  assert.deepEqual(run('cat ~/x'), ASK_IN, '~ is the shell\'s: asked, as a command we can\'t read plainly');
  for (const c of ['cat ../outside/notes.txt', `cat ${fx.outside}/notes.txt`, 'cat out-link', 'npm test --prefix /tmp']) {
    assert.deepEqual(run(c), ASK_OUT, c);
  }
});

test('a hard-linked file or a search too big to check is asked once', () => {
  assert.deepEqual(run('cat clean-hard.txt'), { ask: true, scopes: ['once'] });
});

test('strict (agentAccessRules off): a read-only command is asked; refusals hold', () => {
  assert.deepEqual(run('cat src/x.ts', true), ASK_OUT);
  assert.ok(refused(run('cat .env', true)));
});

test('shellWords: quotes, escapes and what makes a command not plain', () => {
  assert.deepEqual(shellWords('grep -rn "a b" src | head').segments.map((s) => s.map((w) => w.text)), [['grep', '-rn', 'a b', 'src'], ['head']]);
  assert.equal(shellWords('cat a\\ b').segments[0]![1]!.text, 'a b');
  assert.equal(shellWords('cat \'$x\'').plain, true, 'single quotes are literal');
  for (const c of ['cat "$x"', 'cat `x`', 'a; b', 'a && b', 'a || b', 'a > b', 'a < b', 'a & b', 'cat *.ts', 'cat ~/x', 'cat {a,b}', '=ls', 'a\nb', 'a |& b', '# x']) {
    assert.equal(shellWords(c).plain, false, c);
  }
  assert.equal(shellWords('cat "*.ts"').segments[0]![1]!.glob, false);
  assert.equal(shellWords('cat *.ts').segments[0]![1]!.glob, true);
});

test('readOnlyCommand: the reads and the searches of an allow-listed command; null otherwise', () => {
  assert.deepEqual(readOnlyCommand('grep -rn foo src | head'), { reads: ['foo', 'src'], searches: ['src'] });
  assert.deepEqual(readOnlyCommand('rg foo'), { reads: ['foo'], searches: ['.'] });
  assert.deepEqual(readOnlyCommand('git show HEAD:src/x.ts'), { reads: ['HEAD:src/x.ts'], searches: [] });
  for (const c of ['npm test', 'find . -fprint x', 'file -C x', 'git --git-dir=x log', 'tree -R', 'wc --files0-from=x', 'rg --hostname-bin=x foo']) {
    assert.equal(readOnlyCommand(c), null, c);
  }
});

test('commandHead: the first words a remembered yes may cover; none for a command that is not plain', () => {
  assert.equal(commandHead('npm test'), 'npm test');
  assert.equal(commandHead('git commit -m x'), 'git commit');
  assert.equal(commandHead('ls -la'), 'ls');
  assert.equal(commandHead('python3 script.py'), 'python3');
  assert.equal(commandHead('npm test && curl x'), null);
  assert.equal(commandHead('  '), null);
});
