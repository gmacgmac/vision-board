// The person's allows of app code (ledger v17, api.md 150-151, D-047 ruling 7): the fold keeps one
// allowed hash per app (an allow sets it, a newer hash replaces it, a stop takes it away, and a
// card's retire leaves it), the registry says only the person allows or stops an app and asks
// first, the act rules refuse what would change nothing, and an allow touches no board: it moves no
// head, is no answer and reaches no agent's check_responses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { APP_ACTIONS } from '#format';
import type { LedgerState } from '../src/index.ts';
import { ACTIONS, appCards, appOf, passesLock, REFERENCES, responsesAfter, scopeOf, validateAct } from '../src/index.ts';
import { isAnswer } from '../src/registry.ts';
import { A, scene } from './ledger-v3.ts';

const OLD = 'a'.repeat(64);
const NEW = 'b'.repeat(64);
const AT = '2026-10-17T09:00:00Z';
const asAct = (s: LedgerState, e: object): ActEvent => ({ v: 17, seq: s.seq + 1, at: AT, by: 'person', type: 'act', ...e }) as ActEvent;

/** The scene (boards `b` and `b2`) with an app card for `calculator` on `b` (ledger number 5). */
function withApp() {
  const l = scene();
  l.v = 17;
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'app', title: 'Calculator', app: { id: 'calculator', w: 360, h: 440 } } });
  return l;
}

test('the fold: an allow keeps the hash, a newer hash replaces it, a stop takes it away', () => {
  const l = withApp();
  assert.deepEqual([...l.state().appAllowed], []);
  l.act({ action: 'app-allow', app: 'calculator', hash: OLD });
  assert.deepEqual([...l.state().appAllowed], [['calculator', OLD]]);
  l.act({ action: 'app-allow', app: 'calculator', hash: NEW });
  l.act({ action: 'app-allow', app: 'converter', hash: OLD });
  assert.deepEqual([...l.state().appAllowed], [['calculator', NEW], ['converter', OLD]]);
  l.act({ action: 'app-revoke', app: 'calculator' });
  assert.deepEqual([...l.state().appAllowed], [['converter', OLD]]);
});

test('the fold: retiring the app card keeps the app\'s allow; the allow is on the app, not the card', () => {
  const l = withApp();
  l.act({ action: 'app-allow', app: 'calculator', hash: OLD });
  l.agent(A, { type: 'retire', board: 'b', cards: [5] });
  const s = l.state();
  assert.equal(s.appAllowed.get('calculator'), OLD);
  assert.deepEqual(appCards(s, 'calculator'), [], 'no app card left');
});

test('an allow and a stop touch no board: no head, no date, no answer, not in check_responses', () => {
  const l = withApp();
  const before = l.state();
  l.act({ action: 'app-allow', app: 'calculator', hash: OLD });
  l.act({ action: 'app-revoke', app: 'calculator' });
  const s = l.state();
  assert.deepEqual([s.heads, s.dates, s.seen, s.unsent], [before.heads, before.dates, before.seen, before.unsent]);
  for (const e of s.acts.slice(-2)) assert.deepEqual(scopeOf(s, e), { cards: [] });
  assert.deepEqual(responsesAfter(s, 'b', before.seq), []);
  for (const action of APP_ACTIONS) assert.equal(isAnswer(action), false, action);
  for (const action of APP_ACTIONS) assert.equal(passesLock({ type: 'act', action }), true, `${action} is on no board, so no lock holds it`);
});

test('the registry: only the person allows or stops an app, and the page asks first', () => {
  assert.deepEqual([...APP_ACTIONS].sort(), ['app-allow', 'app-revoke']);
  assert.deepEqual([ACTIONS['app-allow'].label, ACTIONS['app-revoke'].label], ['Allow app', 'Stop app']);
  for (const action of APP_ACTIONS) {
    const def = ACTIONS[action];
    assert.deepEqual([def.by, def.needsConfirmation, def.onItem], ['person', true, false], action);
  }
});

test('validateAct: allow a version not yet allowed, stop one that is; never an agent', () => {
  const l = withApp();
  let s = l.state();
  assert.deepEqual(validateAct(asAct(s, { action: 'app-allow', app: 'calculator', hash: OLD }), s, 'b'), []);
  assert.deepEqual(validateAct(asAct(s, { action: 'app-revoke', app: 'calculator' }), s, 'b'),
    ['app: "calculator" isn\'t allowed, so there is nothing to stop']);
  l.act({ action: 'app-allow', app: 'calculator', hash: OLD });
  s = l.state();
  assert.deepEqual(validateAct(asAct(s, { action: 'app-allow', app: 'calculator', hash: OLD }), s, 'b'),
    ['hash: this version of "calculator" is already allowed']);
  assert.deepEqual(validateAct(asAct(s, { action: 'app-allow', app: 'calculator', hash: NEW }), s, 'b2'), [], 'any board the card is on');
  assert.deepEqual(validateAct(asAct(s, { action: 'app-revoke', app: 'calculator' }), s, 'b'), []);
  const agent = { ...asAct(s, { action: 'app-allow', app: 'calculator', hash: NEW }), by: 'agent', agent: A } as ActEvent;
  assert.match(validateAct(agent, s, 'b')[0]!, /only the person can do this/);
});

test('validateAct: an app card takes no size; its panel size is the agent\'s', () => {
  const s = withApp().state();
  assert.deepEqual(validateAct(asAct(s, { action: 'size', id: 5, size: 'l' }), s, 'b'),
    ['size: an app card is as big as its panel, which the agent sets']);
  assert.deepEqual(validateAct(asAct(s, { action: 'comment', id: 5, ver: 1, text: 'Nice.' }), s, 'b'), [], 'a note goes');
  assert.deepEqual(validateAct(asAct(s, { action: 'later', id: 5, ver: 1 }), s, 'b'), [], 'Later goes');
  assert.deepEqual(validateAct(asAct(s, { action: 'ack', id: 5, ver: 1 }), s, 'b'), ['ack: an app doesn\'t offer this']);
});

test('the app row: an app\'s live cards, and the app a card names', () => {
  const l = withApp();
  l.agent(A, { type: 'node', board: 'b2', n: 6, ver: 1, node: { region: 'x', kind: 'app', title: 'Calculator again', app: { id: 'calculator' } } });
  const s = l.state();
  assert.deepEqual(REFERENCES.app.lookup(s, 'calculator'), [5, 6]);
  assert.deepEqual(appCards(s, 'nothing'), []);
  assert.deepEqual([appOf(s, 5), appOf(s, 6), appOf(s, 1), appOf(s, 99)], ['calculator', 'calculator', undefined, undefined]);
});
