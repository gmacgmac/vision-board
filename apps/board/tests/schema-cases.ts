// Ledger lines for the schema tests (schema.test.ts): a valid v8 line for every event type and
// action, and broken lines that each break one rule of api.md 5-11, 14-18, 62-65, 66-70, 71-76, 81 and 87.
type Rec = Record<string, any>;

export const AT = '2026-10-05T09:00:00.000Z';
export const AGENT = { v: 8, seq: 1, at: AT, by: 'agent', agent: 'a-abcd1234' };
export const PERSON = { v: 8, seq: 1, at: AT, by: 'person' };
/** A note on, or a place for, a whole container (api.md 71): `board` + `region` in place of `n`. */
export const CONTAINER = { board: 'b', region: 'plan' };
/** A note on a group of cards (api.md 62): `nodes` in place of `n` and `ver`. */
export const GROUP = { nodes: [1, 2], text: 'The same question on both.' };
/** A move of a group of cards (api.md 66): `nodes` in place of `n`, and the container. */
export const GROUP_MOVE = { nodes: [1, 2], region: 'later' };
export const VALID: Record<string, Rec> = {
  board: { ...AGENT, type: 'board', board: 'b', title: 'Pricing', summary: 'From chat.', key: 'board-1' },
  region: { ...AGENT, type: 'region', board: 'b', region: { id: 'plan', title: 'Plan', mode: 'lanes', lanes: ['Now', 'Later'] } },
  node: {
    ...AGENT, type: 'node', board: 'b', n: 1, ver: 1, key: 'q-1',
    node: { region: 'plan', kind: 'question', title: 'Keep it?', body: 'Why.', item: true, lane: 'Now', tags: ['t'], emphasis: true, size: 'm' },
  },
  link: { ...AGENT, type: 'link', from: 1, to: 2, label: 'shapes', key: 'l-1' },
  unlink: { ...AGENT, type: 'unlink', from: 1, to: 2 },
  reply: { ...AGENT, type: 'reply', n: 1, text: 'Done.', to: 8, key: 'r-1' },
  propose: { ...AGENT, type: 'propose', n: 1, ver: 1, action: 'drop', reason: 'Client said no.', source: 'email', key: 'p-1' },
  park: {
    ...AGENT, type: 'park', n: 1, key: 'k-1',
    bundle: { situation: 'S', background: 'B', assessment: 'A', recommendation: 'R', sources: ['chat'] },
  },
  join: { ...AGENT, type: 'join', label: 'Pricing chat' },
  'grant-request': { ...AGENT, type: 'grant-request', board: 'b', region: 'plan', reason: 'I wrote these.', key: 'g-1' },
  seen: { ...PERSON, type: 'seen', n: 1, ver: 1 },
  act: { ...PERSON, type: 'act', action: 'ack', n: 1, ver: 1 },
};
export const ACTS: Record<string, Rec> = {
  ack: { n: 1, ver: 1 }, drop: { n: 1, ver: 1, proposal: 4 }, comment: { n: 1, ver: 1, text: 'Why?' },
  context: { n: 1, ver: 1 }, later: { n: 1, ver: 1 }, reopen: { n: 1, ver: 1 }, pin: { n: 1, x: 10, y: -2.5 },
  unpin: { n: 1 }, mode: { board: 'b', region: 'plan', mode: 'grid' }, grant: { request: 5 },
  deny: { request: 5, text: 'Not this one.' }, revoke: { holder: 'a-abcd1234', board: 'b', region: 'plan' },
  size: { n: 1, size: 'auto' }, send: { board: 'b' },
  'note-edit': { n: 1, note: 7, text: 'Why per seat, not per use?', kind: 'context' }, 'note-remove': { n: 1, note: 7 },
  move: { n: 1, ver: 1, region: 'plan' },
};
export const act = (action: string, extra: Rec = {}) => ({ ...PERSON, type: 'act', action, ...ACTS[action], ...extra });

/** A copy of `e` with `path` ("node.title") set to `value`, or removed when `value` is DROP. */
export const DROP = Symbol('drop');
export function patch(e: Rec, at: string, value: unknown): Rec {
  const copy = structuredClone(e);
  const keys = at.split('.');
  const last = keys.pop()!;
  const parent = keys.reduce((o, k) => o[k], copy);
  if (value === DROP) delete parent[last];
  else parent[last] = value;
  return copy;
}
export const long = (n: number) => 'x'.repeat(n);
export const V = VALID as Record<string, Rec>;

export const BROKEN: [string, Rec][] = [
  ['unknown key on the line', patch(V.node!, 'bogus', 1)],
  ['unknown key in node', patch(V.node!, 'node.bogus', 1)],
  ['unknown key in region', patch(V.region!, 'region.bogus', 1)],
  ['unknown key in bundle', patch(V.park!, 'bundle.bogus', 1)],
  ['unknown key on an act', act('ack', { title: 'smuggled' })],
  ['unknown key on a join', patch(V.join!, 'board', 'b')],
  ['a key on a seen (person events carry none)', patch(V.seen!, 'key', 'k')],
  ['a coordinate key in node', patch(V.node!, 'node.x', 10)],
  ['missing v', patch(V.board!, 'v', DROP)],
  ['missing seq', patch(V.board!, 'seq', DROP)],
  ['missing at', patch(V.board!, 'at', DROP)],
  ['missing by', patch(V.board!, 'by', DROP)],
  ['missing type', patch(V.board!, 'type', DROP)],
  ['board without board', patch(V.board!, 'board', DROP)],
  ['board without title', patch(V.board!, 'title', DROP)],
  ['region without mode', patch(V.region!, 'region.mode', DROP)],
  ['node without kind', patch(V.node!, 'node.kind', DROP)],
  ['node without title', patch(V.node!, 'node.title', DROP)],
  ['node without n', patch(V.node!, 'n', DROP)],
  ['node without ver', patch(V.node!, 'ver', DROP)],
  ['link without from', patch(V.link!, 'from', DROP)],
  ['reply without text', patch(V.reply!, 'text', DROP)],
  ['propose without reason', patch(V.propose!, 'reason', DROP)],
  ['park without bundle.assessment', patch(V.park!, 'bundle.assessment', DROP)],
  ['join without label', patch(V.join!, 'label', DROP)],
  ['join without its agent id', patch(V.join!, 'agent', DROP)],
  ['grant-request without reason', patch(V['grant-request']!, 'reason', DROP)],
  ['grant-request without board', patch(V['grant-request']!, 'board', DROP)],
  ['timestamp with a space', patch(V.board!, 'at', '2026-10-05 09:00:00Z')],
  ['timestamp without a zone', patch(V.board!, 'at', '2026-10-05T09:00:00')],
  ['timestamp as a date only', patch(V.board!, 'at', '2026-10-05')],
  ['unknown format v9', patch(V.board!, 'v', 9)],
  ['v3 line with a free-form agent', patch(V.board!, 'agent', 'kiro')],
  ['v2 line with a blank agent', patch(patch(V.board!, 'v', 2), 'agent', '  ')],
  ['blank title', patch(V.board!, 'title', '   ')],
  ['bad board id', patch(V.board!, 'board', 'Bad_Id')],
  ['node title over 200', patch(V.node!, 'node.title', long(201))],
  ['node title of 201 emoji (code points, not UTF-16)', patch(V.node!, 'node.title', '😀'.repeat(201))],
  ['board title over 200', patch(V.board!, 'title', long(201))],
  ['region title over 80', patch(V.region!, 'region.title', long(81))],
  ['node body over 8000', patch(V.node!, 'node.body', long(8001))],
  ['reply text over 4000', patch(V.reply!, 'text', long(4001))],
  ['propose reason over 4000', patch(V.propose!, 'reason', long(4001))],
  ['summary over 2000', patch(V.board!, 'summary', long(2001))],
  ['link label over 80', patch(V.link!, 'label', long(81))],
  ['agent label over 80', patch(V.join!, 'label', long(81))],
  ['13 tags', patch(V.node!, 'node.tags', Array(13).fill('t'))],
  ['tag over 40', patch(V.node!, 'node.tags', [long(41)])],
  ['13 lanes', patch(V.region!, 'region.lanes', Array(13).fill('l'))],
  ['lane over 40', patch(V.region!, 'region.lanes', [long(41)])],
  ['columns 0', patch(V.region!, 'region.columns', 0)],
  ['columns 13', patch(V.region!, 'region.columns', 13)],
  ['21 sources', patch(V.park!, 'bundle.sources', Array(21).fill('s'))],
  ['source over 500', patch(V.park!, 'bundle.sources', [long(501)])],
  ['key over 64', patch(V.node!, 'key', long(65))],
  ['lanes mode without lanes', patch(V.region!, 'region.lanes', DROP)],
  ['lanes mode with no lanes', patch(V.region!, 'region.lanes', [])],
  ['region centre as a node id string', patch(V.region!, 'region.center', '7')],
  ['node size xl', patch(V.node!, 'node.size', 'xl')],
  ['unknown node kind', patch(V.node!, 'node.kind', 'idea')],
  ['n of 0', patch(V.reply!, 'n', 0)],
  ['n as a fraction', patch(V.reply!, 'n', 1.5)],
  ['unknown event type', patch(V.board!, 'type', 'vote')],
  ['unknown action', act('ack', { action: 'approve' })],
  ['propose with a non-decision action', patch(V.propose!, 'action', 'later')],
  ['ack without ver', act('ack', { ver: undefined })],
  ['comment without text', act('comment', { text: undefined })],
  ['pin without y', act('pin', { y: undefined })],
  ['mode without region', act('mode', { region: undefined })],
  ['grant without request', act('grant', { request: undefined })],
  ['grant naming a node', act('grant', { n: 1 })],
  ['deny naming a node', act('deny', { n: 1 })],
  ['revoke without holder', act('revoke', { holder: undefined })],
  ['revoke without board', act('revoke', { board: undefined })],
  ['revoke with a free-form holder', act('revoke', { holder: 'kiro' })],
  ['revoke naming a node', act('revoke', { n: 1 })],
  ['size without size', act('size', { size: undefined })],
  ['size without n', act('size', { n: undefined })],
  ['size xl', act('size', { size: 'xl' })],
  ['send without board', act('send', { board: undefined })],
  ['send naming a node', act('send', { n: 1 })],
  ['note-edit without note', act('note-edit', { note: undefined })],
  ['note-edit without text', act('note-edit', { text: undefined })],
  ['note-edit with blank text', act('note-edit', { text: '  ' })],
  ['note-edit without n', act('note-edit', { n: undefined })],
  ['note-edit with kind ack', act('note-edit', { kind: 'ack' })],
  ['note-remove without note', act('note-remove', { note: undefined })],
  ['note-remove with note 0', act('note-remove', { note: 0 })],
  ['group comment with n as well', act('comment', { ...GROUP, ver: undefined })],
  ['group comment with ver as well', act('comment', { ...GROUP, n: undefined })],
  ['group comment naming one node', act('comment', { ...GROUP, nodes: [1], n: undefined, ver: undefined })],
  ['group comment naming a node twice', act('comment', { ...GROUP, nodes: [1, 1], n: undefined, ver: undefined })],
  ['group comment naming node 0', act('comment', { ...GROUP, nodes: [0, 1], n: undefined, ver: undefined })],
  ['group comment with nodes not a list', act('comment', { ...GROUP, nodes: 1, n: undefined, ver: undefined })],
  ['group comment over 500 nodes', act('comment', {
    ...GROUP, nodes: Array.from({ length: 501 }, (_, i) => i + 1), n: undefined, ver: undefined,
  })],
  ['group context without words', act('context', { nodes: [1, 2], n: undefined, ver: undefined })],
  ['nodes on an ack', act('ack', { nodes: [1, 2], n: undefined, ver: undefined })],
  ['nodes on a note-edit', act('note-edit', { nodes: [1, 2] })],
  ['move without region', act('move', { region: undefined })],
  ['move without n or nodes', act('move', { n: undefined, ver: undefined })],
  ['move with a bad region id', act('move', { region: 'Plan A' })],
  ['group move with n as well', act('move', { ...GROUP_MOVE, ver: undefined })],
  ['group move with ver as well', act('move', { ...GROUP_MOVE, n: undefined })],
  ['group move naming one node', act('move', { ...GROUP_MOVE, nodes: [1], n: undefined, ver: undefined })],
  ['group move without region', act('move', { nodes: [1, 2], n: undefined, ver: undefined, region: undefined })],
  ['container note without board', act('comment', { region: 'plan', n: undefined, ver: undefined })],
  ['container note with n as well', act('comment', { ...CONTAINER, ver: undefined })],
  ['container note with ver as well', act('comment', { ...CONTAINER, n: undefined })],
  ['container note with nodes as well', act('comment', { ...CONTAINER, ...GROUP, n: undefined, ver: undefined })],
  ['container context without words', act('context', { ...CONTAINER, n: undefined, ver: undefined })],
  ['container place without x', act('pin', { ...CONTAINER, n: undefined, x: undefined })],
  ['container place with n as well', act('pin', CONTAINER)],
  ['container unpin without board', act('unpin', { region: 'plan', n: undefined })],
  ['container note-edit with n as well', act('note-edit', CONTAINER)],
  ['container note-remove without note', act('note-remove', { ...CONTAINER, n: undefined, note: undefined })],
  ['container place with a bad region id', act('pin', { board: 'b', region: 'Plan A', n: undefined })],
  ['join written by a person', { ...V.join!, by: 'person' }],
  ['grant-request written by a person', { ...V['grant-request']!, by: 'person' }],
  ['node written by a person', { ...V.node!, by: 'person' }],
  ['seen written by an agent', { ...V.seen!, by: 'agent', agent: 'a-abcd1234' }],
  ['grant-request for a bad region id', patch(V['grant-request']!, 'region', '-x')],
  ['seen with neither a node nor a board', { ...PERSON, type: 'seen' }],
  ['seen with n and no ver', patch(V.seen!, 'ver', DROP)],
  ['seen with a board and no head', { ...PERSON, type: 'seen', board: 'b' }],
  ['seen with a head and no board', { ...PERSON, type: 'seen', head: 3 }],
  ['seen with both a node and a board', { ...V.seen!, board: 'b', head: 3 }],
  ['seen with a node and a head', { ...V.seen!, head: 3 }],
  ['seen with a head of 0', { ...PERSON, type: 'seen', board: 'b', head: 0 }],
  ['seen with a bad board id', { ...PERSON, type: 'seen', board: 'Plan A', head: 3 }],
  ['a line that is not an object', [] as unknown as Rec],
];
