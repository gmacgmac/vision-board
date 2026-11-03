// Feature flags (rule 12, components.md § Feature flags): one definition, defaults, overrides,
// and unknown names refused rather than silently read as off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { FLAG_DESCRIPTIONS, FLAGS, flagOn, parseFlags } from '../src/index.ts';
import type { FlagName } from '../src/index.ts';

const ROOT = path.resolve(import.meta.dirname, '../../..');

test('every flag has a boolean default and a description, and no description names a flag that is not one', () => {
  assert.ok(Object.keys(FLAGS).length > 0);
  for (const [name, f] of Object.entries(FLAGS)) {
    assert.equal(typeof f.default, 'boolean', name);
    assert.ok(FLAG_DESCRIPTIONS[name as FlagName]?.trim().length > 0, name);
  }
  assert.deepEqual(Object.keys(FLAG_DESCRIPTIONS).sort(), Object.keys(FLAGS).sort());
});

/** Every source file under `dir` (repo-relative), recursively. */
const sources = (dir: string): string[] => readdirSync(path.join(ROOT, dir), { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.(?:ts|svelte|js|mjs)$/.test(f)).map((f) => path.join(dir, f));

test('the descriptions stay out of the board page: FLAGS holds defaults only, and no page code names FLAG_DESCRIPTIONS', () => {
  for (const [name, f] of Object.entries(FLAGS)) assert.deepEqual(Object.keys(f), ['default'], name);
  // The page is apps/board/src (the gallery is a page of its own) and the packages it imports (performance.md § Budgets).
  const page = [
    ...sources('apps/board/src').filter((f) => !f.startsWith('apps/board/src/gallery/')),
    ...readdirSync(path.join(ROOT, 'packages')).flatMap((m) => sources(`packages/${m}/src`)),
  ].filter((f) => f !== 'packages/format/src/flags.ts');
  assert.deepEqual(page.filter((f) => /\bFLAG_DESCRIPTIONS\b/.test(readFileSync(path.join(ROOT, f), 'utf8'))), []);
});

test('nodeSize is on by default (maintainer, 2026-10-05), and -nodeSize turns it off', () => {
  assert.equal(FLAGS.nodeSize.default, true);
  assert.equal(flagOn('nodeSize'), true);
  assert.equal(flagOn('nodeSize', {}), true);
  assert.equal(flagOn('nodeSize', parseFlags('-nodeSize').overrides), false);
});

test('agentAccess is on by default, and -agentAccess turns it off', () => {
  assert.equal(flagOn('agentAccess'), true);
  assert.equal(flagOn('agentAccess', parseFlags('-agentAccess').overrides), false);
});

test('adaptiveHeader is on by default (maintainer, 2026-10-31), and -adaptiveHeader turns it off', () => {
  assert.equal(flagOn('adaptiveHeader'), true);
  assert.equal(flagOn('adaptiveHeader', parseFlags('-adaptiveHeader').overrides), false);
});

test('toolbarMenu is on by default (maintainer, 2026-10-09), and -toolbarMenu turns it off', () => {
  assert.equal(flagOn('toolbarMenu'), true);
  assert.equal(flagOn('toolbarMenu', parseFlags('-toolbarMenu').overrides), false);
});

test('openFolder is on by default (maintainer, 2026-10-09, U12), and -openFolder turns it off', () => {
  assert.equal(flagOn('openFolder'), true);
  assert.equal(flagOn('openFolder', parseFlags('-openFolder').overrides), false);
});

test('currentFolder is on by default (maintainer, 2026-10-26, current-folder task), and -currentFolder turns it off', () => {
  assert.equal(flagOn('currentFolder'), true);
  assert.equal(flagOn('currentFolder', parseFlags('-currentFolder').overrides), false);
});

test('everyNode is on by default (maintainer, 2026-10-10, every-node FE_01), and -everyNode turns it off', () => {
  assert.equal(flagOn('everyNode'), true);
  assert.equal(flagOn('everyNode', parseFlags('-everyNode').overrides), false);
});

test('an override wins over the default, either way', () => {
  assert.equal(flagOn('nodeSize', { nodeSize: true }), true);
  assert.equal(flagOn('nodeSize', { nodeSize: false }), false);
});

test('asking for an unknown flag throws, so a typo cannot read as off', () => {
  assert.throws(() => flagOn('nodeSise' as FlagName), /unknown feature flag "nodeSise"/);
});

test('parseFlags: a comma list of names turns them on; a leading minus turns one off', () => {
  assert.deepEqual(parseFlags('nodeSize'), { overrides: { nodeSize: true }, refused: [] });
  assert.deepEqual(parseFlags(' nodeSize , '), { overrides: { nodeSize: true }, refused: [] });
  assert.deepEqual(parseFlags('-nodeSize'), { overrides: { nodeSize: false }, refused: [] });
  assert.deepEqual(parseFlags('nodeSize,-nodeSize'), { overrides: { nodeSize: false }, refused: [] });
});

test('parseFlags: nothing given is no overrides', () => {
  assert.deepEqual(parseFlags(null), { overrides: {}, refused: [] });
  assert.deepEqual(parseFlags(undefined), { overrides: {}, refused: [] });
  assert.deepEqual(parseFlags(''), { overrides: {}, refused: [] });
});

test('parseFlags: unknown names are refused, not applied', () => {
  const got = parseFlags('nodeSize,bogus,-other,constructor,__proto__');
  assert.deepEqual(got.overrides, { nodeSize: true });
  assert.deepEqual(got.refused, ['bogus', 'other', 'constructor', '__proto__']);
  assert.equal(Object.getPrototypeOf(got.overrides), Object.prototype);
});

test('appCards is on by default (app-cards ruling 13), and -appCards turns it off', () => {
  assert.equal(flagOn('appCards'), true);
  assert.equal(flagOn('appCards', parseFlags('-appCards').overrides), false);
});

test('cardImages is on by default (app-cards orchestrator decision 5, D-048), and -cardImages turns it off', () => {
  assert.equal(flagOn('cardImages'), true);
  assert.equal(flagOn('cardImages', parseFlags('-cardImages').overrides), false);
});

test('toolRail is on by default (maintainer, 2026-10-25, container tool rail), and -toolRail turns it off', () => {
  assert.equal(flagOn('toolRail'), true);
  assert.equal(flagOn('toolRail', parseFlags('-toolRail').overrides), false);
});
