// The skill's one source, two builds (node-overhaul T_05): the standalone build on disk is exactly what the source
// builds (never hand-edited), every difference is used, every reference ships in some build, and a build ships only
// the references its text names. What each build may say is held by apps/board/tests/plugin-skill.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDS, SKILL_FILE, buildSkill, differences, fill, stale, unused } from './build.mjs';

test('the standalone skill on disk is the build of its source: edit source/, then npm run build:skill', () => {
  assert.deepEqual(stale(), [], 'out of date or not built: npm run build:skill');
});

test('every slot of differences.md fills a place, and every reference ships in some build', () => {
  assert.deepEqual(unused(), []);
});

test('each build is its skill and the references its text names, and nothing else', () => {
  for (const b of BUILDS) {
    const files = buildSkill(b);
    const [skill, ...refs] = Object.keys(files);
    assert.equal(skill, SKILL_FILE[b]);
    const named = new Set(Object.values(files).flatMap((t) => [...t.matchAll(/`references\/([a-z-]+)\.md`/g)].map((m) => `references/${m[1]}.md`)));
    assert.deepEqual(refs.sort(), [...named].sort(), `${b}: the references it names`);
    for (const [f, t] of Object.entries(files)) assert.doesNotMatch(t, /\{\{|<!-- slot/, `${b} ${f}: a slot left unfilled`);
  }
  assert.ok('references/apps.md' in buildSkill('standalone') && !('references/apps.md' in buildSkill('plugin')), 'apps are the standalone host\'s');
});

test('a block per build for every slot; an empty one takes its line with it', () => {
  const slots = differences('intro\n<!-- slot a: standalone -->\nA\n<!-- slot a: plugin -->\n\n<!-- slot b: standalone -->\nB1\n<!-- slot b: plugin -->\nB2\n');
  assert.deepEqual(slots, { a: { standalone: 'A', plugin: '' }, b: { standalone: 'B1', plugin: 'B2' } });
  assert.equal(fill('x\n{{a}}\ny {{b}}.\n', slots, 'plugin', 't').text, 'x\ny B2.\n');
  assert.equal(fill('x\n{{a}}\ny {{b}}.\n', slots, 'standalone', 't').text, 'x\nA\ny B1.\n');
  assert.throws(() => differences('<!-- slot a: standalone -->\nA\n'), /no plugin block/);
  assert.throws(() => fill('{{c}}\n', slots, 'plugin', 't'), /no blocks/);
});
