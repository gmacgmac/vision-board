// The ledger v3 fold (api.md 13-19, 29): agents, sizes, Send, retry keys, the agent's size
// suggestion in the View, and the registry entries for people and agents.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTION_IDS, boardView, validateView } from '../../format/src/index.ts';
import {
  ACTIONS, AGENT_ACTION_IDS, AGENT_ACTIONS, BOARD_ACTION_IDS, BOARD_ACTIONS, boardState, replyText,
} from '../src/index.ts';
import { A, B, C, scene } from './ledger-v3.ts';

test('registry: every person action is by the person; the decisions need confirmation', () => {
  const decisions = new Set(['ack', 'drop', 'later', 'grant', 'deny', 'revoke', 'archive', 'app-allow', 'app-revoke']);
  assert.deepEqual(Object.keys(ACTIONS), [...ACTION_IDS]);
  for (const id of ACTION_IDS) {
    assert.equal(ACTIONS[id].by, 'person', id);
    assert.equal(ACTIONS[id].needsConfirmation, decisions.has(id), id);
  }
  assert.deepEqual([ACTIONS.grant.label, ACTIONS.deny.label, ACTIONS.revoke.label, ACTIONS.size.label, ACTIONS.send.label],
    ['Allow', 'Refuse', 'Remove access', 'Card size', 'Send to agent']);
  for (const id of ['grant', 'deny', 'revoke', 'size', 'send'] as const) assert.equal(ACTIONS[id].key, undefined, id);
});

test('registry: agent actions are records, by the agent, with their inputs named', () => {
  assert.deepEqual(Object.keys(AGENT_ACTIONS), [...AGENT_ACTION_IDS]);
  assert.deepEqual([...AGENT_ACTION_IDS], ['reply', 'propose', 'park', 'request_grant']);
  for (const id of AGENT_ACTION_IDS) {
    const def = AGENT_ACTIONS[id];
    assert.equal(def.by, 'agent', id);
    assert.equal(def.needsConfirmation, false, id);
    assert.ok(def.label && Object.keys(def.inputs).length > 0, id);
    assert.ok(!(ACTION_IDS as readonly string[]).includes(id), `${id} is not an act`);
  }
  assert.deepEqual(AGENT_ACTIONS.request_grant.inputs, { board: 'required', region: 'required', reason: 'required' });
});

test('registry: board actions are the person\'s, unconfirmed, with put_board\'s body as their inputs (api.md 90)', () => {
  assert.deepEqual(Object.keys(BOARD_ACTIONS), [...BOARD_ACTION_IDS]);
  const core = JSON.parse(fs.readFileSync(new URL('../../format/schema/events/board.schema.json', import.meta.url), 'utf8')).$defs.core;
  const inputs = Object.fromEntries(Object.keys(core.properties).map((k) => [k, core.required.includes(k) ? 'required' : 'optional']));
  for (const id of BOARD_ACTION_IDS) {
    const def = BOARD_ACTIONS[id];
    assert.deepEqual([def.by, def.needsConfirmation, def.inputs], ['person', false, inputs], id);
    assert.ok(!(ACTION_IDS as readonly string[]).includes(id), `${id} is not an act`);
  }
});

test('agents: id to the label it joined with', () => {
  const s = scene().state();
  assert.deepEqual([...s.agents], [[A, 'Pricing chat'], [B, 'Review chat'], [C, 'Spare chat']]);
});

test('sizes: the person\'s pick per board; auto deletes it', () => {
  const l = scene();
  l.act({ action: 'size', n: 1, size: 'l' });
  l.act({ action: 'size', n: 2, size: 's' });
  l.act({ action: 'size', n: 4, size: 'm' });
  l.act({ action: 'size', n: 2, size: 'auto' });
  const s = l.state();
  assert.deepEqual([...boardState(s, 'b').sizes], [['1', 'l']]);
  assert.deepEqual([...boardState(s, 'b2').sizes], [['1', 'm']], 'card 4 is board b2\'s card 1 (api.md 125)');
  assert.equal(s.items.has(1), false, 'a size is not an item response');
});

test('lastSend: the seq of the latest Send, per board', () => {
  const l = scene();
  l.act({ action: 'send', board: 'b' });
  const second = l.act({ action: 'send', board: 'b' });
  const other = l.act({ action: 'send', board: 'b2' });
  assert.deepEqual([...l.state().lastSend], [['b', second], ['b2', other]]);
});

test('keys: agent to key to the seq that carried it, across the project', () => {
  const l = scene();
  const n = l.agent(A, { type: 'node', board: 'b2', n: 5, ver: 1, key: 'k-node', node: { region: 'x', kind: 'note', title: 'N' } });
  const r = l.agent(B, { type: 'reply', n: 2, text: 'Done.', key: 'k-node' });
  const keys = l.state().keys;
  assert.deepEqual([...keys.get(A)!], [['board-b', 4], ['k-node', n]]);
  assert.deepEqual([...keys.get(B)!], [['k-node', r]]);
  assert.equal(keys.has(C), false);
});

test('the agent\'s size suggestion passes through boardView; validateView checks it', () => {
  const l = scene();
  l.node(A, 1, 2, { region: 'r', size: 'l' });
  const view = boardView(l.state(), 'b');
  assert.equal(view.nodes.find((x) => x.id === '1')!.size, 'l');
  assert.equal(view.nodes.find((x) => x.id === '2')!.size, undefined);
  assert.deepEqual(validateView(view), []);
  const bad = { ...view, nodes: view.nodes.map((x) => (x.id === '1' ? { ...x, size: 'xl' } : x)) };
  assert.deepEqual(validateView(bad), ['nodes[0].size: one of s, m, l']);
});

test('replyText leaves out send, size, grant, deny and revoke', () => {
  const l = scene();
  const req = l.request(C, 'r');
  l.act({ action: 'ack', n: 1, ver: 1 });
  l.act({ action: 'size', n: 2, size: 'l' });
  l.act({ action: 'grant', request: req });
  l.act({ action: 'deny', request: l.request(C, 'q') });
  l.act({ action: 'revoke', holder: C, board: 'b', region: 'r' });
  l.act({ action: 'send', board: 'b' });
  const s = l.state();
  const text = replyText(boardView(s, 'b'), boardState(s, 'b')).split('\n');
  assert.deepEqual(text.slice(1), ['1 (question): ✓', 'Still open: 2, 3']);
});
