// `npm run worktree`: the name and argument checks, the port pick and the plan, with git, files and
// ports faked, so no real worktree is made.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PORT_FIRST, PORT_LAST, makeWorktree, nameProblem, parseArgs, pickPort, portIsBusy } from './worktree.mjs';
import { createServer } from 'node:net';

const MAIN = '/repo';

/** A fake environment; `branches` exist, `folders` exist, `busy` ports are taken. */
function fake({ branches = [], folders = [`${MAIN}/node_modules`], busy = [], current = 'feat/now' } = {}) {
  const calls = [];
  return {
    calls,
    cwd: `${MAIN}/.claude/worktrees/other`,
    git: (...a) => {
      calls.push(a);
      if (a[0] === 'rev-parse' && a[1] === '--git-common-dir') return `${MAIN}/.git\n`;
      if (a[0] === 'rev-parse') { if (branches.includes(a[3].replace('refs/heads/', ''))) return 'sha\n'; throw new Error('no such branch'); }
      if (a[0] === 'branch') return `${current}\n`;
      return '';
    },
    exists: (p) => folders.includes(p),
    link: (target, file) => calls.push(['link', target, file]),
    isBusy: async (port) => busy.includes(port),
  };
}

test('a name must be kebab-case', () => {
  for (const ok of ['tidy', 'worktree-script', 'a1-b2']) assert.equal(nameProblem(ok), undefined, ok);
  for (const bad of ['', undefined, 'Tidy', 'two words', 'a_b', '-a', 'a-', 'a--b', '../x', 'a/b']) assert.match(nameProblem(bad), /kebab-case/, String(bad));
});

test('the arguments are a name and an optional --base branch', () => {
  assert.deepEqual(parseArgs(['tidy']), { name: 'tidy', base: undefined });
  assert.deepEqual(parseArgs(['tidy', '--base', 'main']), { name: 'tidy', base: 'main' });
  for (const bad of [[], ['tidy', '--base'], ['tidy', 'extra'], ['tidy', '--base', 'a', 'b']]) assert.match(parseArgs(bad).error, /^Usage:/);
});

test('the port is the first of 6010, 6110, … with it and the next 9 free', async () => {
  assert.equal(await pickPort(async () => false), PORT_FIRST);
  assert.equal(await pickPort(async (p) => p === 6010), 6110);
  assert.equal(await pickPort(async (p) => p === 6019), 6110, 'the 10th port of the run counts');
  assert.equal(await pickPort(async (p) => p === 6020), 6010, 'the 11th does not');
  assert.equal(await pickPort(async (p) => p >= 6010 && p < 7910), 7910);
  assert.equal(await pickPort(async () => true), undefined);
  assert.ok(PORT_LAST < 8000 && ![4466].includes(PORT_FIRST));
});

test('a port with something listening is busy, a free one is not', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  assert.equal(await portIsBusy(port), true);
  await new Promise((r) => server.close(r));
  assert.equal(await portIsBusy(port), false);
});

test('it adds the worktree under the main checkout, from the current branch, and links node_modules', async () => {
  const env = fake();
  const r = await makeWorktree({ name: 'tidy' }, env);
  assert.deepEqual(r.lines, [`${MAIN}/.claude/worktrees/tidy`, 'feat/tidy', 'VB_TEST_PORT=6010']);
  assert.deepEqual(env.calls.find((c) => c[0] === 'worktree'), ['worktree', 'add', `${MAIN}/.claude/worktrees/tidy`, '-b', 'feat/tidy', 'feat/now']);
  assert.deepEqual(env.calls.at(-1), ['link', `${MAIN}/node_modules`, `${MAIN}/.claude/worktrees/tidy/node_modules`]);
});

test('--base names the branch to start from, and a busy port moves the pick on', async () => {
  const env = fake({ busy: [6012] });
  const r = await makeWorktree({ name: 'tidy', base: 'main' }, env);
  assert.equal(r.lines[2], 'VB_TEST_PORT=6110');
  assert.equal(env.calls.find((c) => c[0] === 'worktree').at(-1), 'main');
});

test('it refuses, in one line and without touching git, a bad name, an existing folder or branch, no node_modules, a detached head', async () => {
  const added = (env) => env.calls.some((c) => c[0] === 'worktree' || c[0] === 'link');
  for (const [args, env, pattern] of [
    [{ name: 'Bad Name' }, fake(), /kebab-case/],
    [{ name: 'tidy' }, fake({ folders: [`${MAIN}/node_modules`, `${MAIN}/.claude/worktrees/tidy`] }), /folder .* already exists/],
    [{ name: 'tidy' }, fake({ branches: ['feat/tidy'] }), /branch feat\/tidy already exists/],
    [{ name: 'tidy' }, fake({ folders: [] }), /no node_modules/],
    [{ name: 'tidy' }, fake({ current: '' }), /detached/],
  ]) {
    const r = await makeWorktree(args, env);
    assert.match(r.error, pattern);
    assert.ok(!r.error.includes('\n'));
    assert.equal(added(env), false);
  }
});
