// Feature flags (rule 12, components.md § Feature flags): one definition, defaults, overrides,
// and unknown names refused rather than silently read as off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLAGS, flagOn, parseFlags } from '../src/index.ts';
import type { FlagName } from '../src/index.ts';

test('every flag has a boolean default and a description', () => {
  assert.ok(Object.keys(FLAGS).length > 0);
  for (const [name, f] of Object.entries(FLAGS)) {
    assert.equal(typeof f.default, 'boolean', name);
    assert.ok(f.description.trim().length > 0, name);
  }
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

test('toolbarMenu is on by default (maintainer, 2026-10-09), and -toolbarMenu turns it off', () => {
  assert.equal(flagOn('toolbarMenu'), true);
  assert.equal(flagOn('toolbarMenu', parseFlags('-toolbarMenu').overrides), false);
});

test('openFolder is on by default (maintainer, 2026-10-09, U12), and -openFolder turns it off', () => {
  assert.equal(flagOn('openFolder'), true);
  assert.equal(flagOn('openFolder', parseFlags('-openFolder').overrides), false);
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
