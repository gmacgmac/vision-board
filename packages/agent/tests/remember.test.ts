// What a remembered yes covers (D-066 6; agent-access WIRE_01, point 339's ruling on commands): a command
// by its first words, never one that runs whatever code it is given (an interpreter, a shell, a
// launcher, a script by its path); a write by the folder it really reaches, a read by its file, a
// search by its folder. On a real board folder (access-fixture.ts).
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { coverOf, rememberedHead } from '../src/index.ts';
import { accessFixture } from './access-fixture.ts';

const fx = accessFixture();
after(() => fx.remove());

test('rememberedHead: a command yes covers its first words; `npm test` covers `npm test -- foo`, not `npm run build`', () => {
  assert.equal(rememberedHead('npm test'), 'npm test');
  assert.equal(rememberedHead('npm test -- foo'), 'npm test');
  assert.equal(rememberedHead('npm run build'), 'npm run build', 'a script runner covers that script only');
  assert.notEqual(rememberedHead('npm run deploy'), rememberedHead('npm run build'));
  assert.equal(rememberedHead('git commit -m x'), null, 'git is the person\'s (346): refused, and never kept');
  assert.equal(rememberedHead('ls -la'), 'ls');
});

test('rememberedHead: never an interpreter, a shell, a launcher, a script by its path, or a command that is not plain', () => {
  for (const c of [
    'python3 script.py', 'python3.12 -c "print(1)"', 'node tools/x.js', 'sh -c "rm -rf src"', 'bash build.sh', 'zsh x', 'ruby x.rb',
    'perl -e 1', 'env FOO=1 make', 'xargs rm', 'sudo make', 'npx something', 'npm exec foo', 'pnpm dlx x', 'uv run x.py',
    './build.sh', 'scripts/release.sh --now', '/usr/bin/python3 x', 'npm test && curl x', 'npm run', 'npm run "$(x)"', '  ',
  ]) assert.equal(rememberedHead(c), null, c);
});

test('rememberedHead: a command whose effect depends on its targets, or reaches the network, is never remembered (Run 2)', () => {
  for (const c of [
    'rm -rf build', 'rm x', 'rmdir out', 'mv a b', 'cp a b', 'chmod +x x.sh', 'chown me x', 'ln -s a b', 'dd if=a of=b', 'truncate -s 0 x',
    'git reset --hard', 'git clean -fd', 'git checkout -- src/a.ts', 'git restore src/a.ts', 'git push', 'git push origin main', 'git rebase main',
    'git branch -D old', 'npm publish', 'curl https://example.invalid/', 'wget x', 'git commit --force', 'git add -f x', 'git push --force-with-lease',
    'git checkout -f main', 'git -C x push',
    'git config user.name x', 'git config core.hooksPath src', 'git -c a=b config core.fsmonitor x',
  ]) assert.equal(rememberedHead(c), null, c);
  assert.equal(rememberedHead('git checkout main'), null, 'every git command (346)');
});


test('coverOf: a write\'s folder (as really reached), a read\'s file, a search\'s folder, a command\'s head', () => {
  const at = (rel: string) => path.join(fx.folder, rel);
  assert.deepEqual(coverOf({ kind: 'write', op: 'edit', path: at('src/x.ts') }, fx.folder), { kind: 'write', path: at('src') });
  assert.deepEqual(coverOf({ kind: 'write', op: 'create', path: 'src/new.ts' }, fx.folder), { kind: 'write', path: at('src') }, 'a new file by its folder');
  assert.deepEqual(coverOf({ kind: 'write', op: 'edit', path: at('vb-link/images/a.png') }, fx.folder), { kind: 'write', path: at('.visionboard/images') }, 'through a link');
  assert.deepEqual(coverOf({ kind: 'read', path: `${fx.outside}/notes.txt` }, fx.folder), { kind: 'read', path: `${fx.outside}/notes.txt` }, 'a read: that file only');
  assert.deepEqual(coverOf({ kind: 'read', path: at('src') }, fx.folder), { kind: 'read', path: at('src') });
  assert.deepEqual(coverOf({ kind: 'read', path: at('src'), recursive: true }, fx.folder), { kind: 'search', path: at('src') });
  assert.deepEqual(coverOf({ kind: 'command', command: 'npm test -- x', risks: [], paths: [] }, fx.folder), { kind: 'command', head: 'npm test' });
  assert.equal(coverOf({ kind: 'command', command: 'python3 x.py', risks: [], paths: [] }, fx.folder), null);
  assert.equal(coverOf({ kind: 'write', op: 'edit', path: at('loop-a') }, fx.folder), null, 'a path that can\'t be followed');
});
