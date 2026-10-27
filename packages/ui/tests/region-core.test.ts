import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mode, Region, View, ViewNode } from '#format';
import { MODES } from '#format';
import type { BoardState, ItemStatus } from '#actions';
import type { RegionNoteStage } from '../src/index.ts';
import {
  agentChoiceText, commentLabel, MODE_HINT, retiredMarker, MODE_LABEL, NOTE_STAGE_TEXT, noteBadge, noteStage, PUT_BACK_NONE_HINT, REGION_COLOUR_DEFAULT,
  RESET_NONE_HINT, regionColour, regionHolders, regionNote, regionState, WIDTHS_LABEL, widthsTip,
} from '../src/index.ts';

const region: Region = { id: 'r', title: 'R', mode: 'grid' };
const node = (f: Partial<ViewNode>): ViewNode => ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });
const view = (nodes: ViewNode[]): View =>
  ({ format: 1, session: 's', title: 'B', version: 1, regions: [region], nodes, links: [] });
const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set(), ...f });
const deciding = (...entries: [string, ItemStatus][]): BoardState =>
  board({ items: new Map(entries.map(([id, status]) => [id, { status, notes: [] }])) });
const drawn = (...ids: string[]): ReadonlySet<string> => new Set(ids);

test('MODE_LABEL names every mode', () => {
  for (const m of MODES) assert.ok(MODE_LABEL[m].length > 0, m);
  assert.deepEqual(Object.keys(MODE_LABEL), [...MODES]);
});

test('MODE_HINT holds mockup 05\'s one-liner for every mode, in mode order', () => {
  assert.deepEqual(Object.keys(MODE_HINT), [...MODES]);
  assert.deepEqual(MODE_HINT, {
    grid: 'A numbered set to work through in order',
    flow: 'Connected steps and where they branch',
    lanes: 'Several flows side by side, one per lane',
    radial: 'One subject, everything related around it',
    column: 'One card under another, in card order',
    row: 'One card beside another, in card order',
  });
});

test('the popover foot names the agent\'s layout; the disabled Reset places hint says why', () => {
  assert.equal(agentChoiceText('grid'), 'The agent chose Grid for this container.');
  assert.equal(agentChoiceText('radial'), 'The agent chose Radial for this container.');
  assert.equal(RESET_NONE_HINT, 'No cards moved');
});

test('regionState carries the mode it is given', () => {
  for (const mode of MODES as readonly Mode[])
    assert.equal(regionState({ id: 'r', mode }, view([node({})]), board(), drawn('1')).mode, mode);
});

test('the count reads answered over items, counting ✓ and ✗ only (D-045)', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3 }), node({ id: '4', n: 4 })]);
  const s = deciding(['1', 'acknowledged'], ['2', 'dropped'], ['3', 'later']);
  assert.equal(regionState(region, v, s, drawn('1', '2', '3', '4')).countLabel, '2 of 4 answered');
});

// Review polish round 2 ruling 1: the line shows "2/4"; the words stay its name and its tooltip.
test('the count shows "2/4"; "2 of 4 answered" is its name and tooltip', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3 }), node({ id: '4', n: 4 })]);
  const st = regionState(region, v, deciding(['1', 'acknowledged'], ['2', 'dropped']), drawn('1', '2', '3', '4'));
  assert.deepEqual([st.countText, st.countLabel], ['2/4', '2 of 4 answered']);
  const none = regionState(region, view([node({ id: 't', kind: 'topic' })]), board(), drawn('t'));
  assert.deepEqual([none.countText, none.countLabel], ['', '']);
});

test('the count ignores nodes that are not items, and is empty when there are no items', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: 't', kind: 'topic' })]);
  assert.equal(regionState(region, v, board(), drawn('1', 't')).countLabel, '0 of 1 answered');
  assert.equal(regionState(region, view([node({ id: 't', kind: 'topic' })]), board(), drawn('t')).countText, '');
});

// every-node ruling 6: "N of M answered" counts only cards that need an answer; a numbered plain
// card, commented or not, counts nowhere (assumption C).
test('the count counts only cards that need an answer, numbered or not', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2, kind: 'finding' }), node({ id: '3', n: 3, kind: 'topic' })]);
  const s = deciding(['1', 'acknowledged'], ['2', 'commented']);
  assert.equal(regionState(region, v, s, drawn('1', '2', '3')).countLabel, '1 of 1 answered');
  assert.equal(regionState(region, v, deciding(['1', 'commented']), drawn('1', '2', '3')).countLabel, '0 of 1 answered', 'a note never answers');
  assert.equal(regionState(region, view([node({ id: '3', n: 3, kind: 'topic' })]), board(), drawn('3')).countText, '');
});

test('the count only looks at the nodes of this region', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2, region: 'other' })]);
  const s = deciding(['1', 'acknowledged'], ['2', 'acknowledged']);
  assert.equal(regionState(region, v, s, drawn('1', '2')).countLabel, '1 of 1 answered');
});

test('Reset places is enabled when any node of the region is pinned, and not for another region', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3, region: 'other' })]);
  const pin = { x: 1, y: 1 };
  assert.equal(regionState(region, v, board(), drawn('1', '2')).canReset, false);
  assert.equal(regionState(region, v, board({ pins: new Map([['2', pin]]) }), drawn('1', '2')).canReset, true);
  assert.equal(regionState(region, v, board({ pins: new Map([['3', pin]]) }), drawn('1', '2')).canReset, false);
});

test('the empty message shows only when the layout drew none of the region\'s nodes', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3, region: 'other' })]);
  assert.equal(regionState(region, v, board(), drawn('1', '2', '3')).showEmpty, false);
  assert.equal(regionState(region, v, board(), drawn('2', '3')).showEmpty, false, 'one drawn is enough');
  assert.equal(regionState(region, v, board(), drawn('3')).showEmpty, true, 'only another region is drawn');
  assert.equal(regionState(region, v, board(), drawn()).showEmpty, true);
});

test('a region with no nodes shows the empty message and no count', () => {
  const st = regionState(region, view([]), board(), drawn());
  assert.deepEqual(st, { mode: 'grid', widths: 'match', countText: '', countLabel: '', canReset: false, canPutBack: false, commentLabel: 'Comment on container R', showEmpty: true });
});

test('Put container back is enabled only while the container itself has a place (3_FE_04 ruling 7)', () => {
  const v = view([node({ id: '1', n: 1 })]);
  assert.equal(regionState(region, v, board(), drawn('1')).canPutBack, false);
  assert.equal(regionState(region, v, board({ regionPins: new Map([['r', { x: 5, y: 5 }]]) }), drawn('1')).canPutBack, true);
  assert.equal(regionState(region, v, board({ regionPins: new Map([['other', { x: 5, y: 5 }]]) }), drawn('1')).canPutBack, false);
  // A card's pin is not the container's place.
  assert.equal(regionState(region, v, board({ pins: new Map([['1', { x: 1, y: 1 }]]) }), drawn('1')).canPutBack, false);
  assert.equal(PUT_BACK_NONE_HINT, 'Not moved');
});

test('a container note: the latest note\'s stage, badge, state line and words (step 4G ruling 1)', () => {
  const v = view([node({ id: '1', n: 1 })]);
  const note = (seq: number, text: string, sent?: true) => ({ seq, kind: 'comment' as const, text, at: 'x', region: 'r', ...(sent && { sent }) });
  const none = regionState(region, v, board(), drawn('1'));
  assert.equal('note' in none, false, 'left out with no note');
  assert.equal(none.commentLabel, 'Comment on container R');
  const one = regionState(region, v, board({ regionNotes: new Map([['r', [note(4, 'Split it?')]]]) }), drawn('1'));
  assert.deepEqual(one.note, {
    seq: 4, stage: 'unsent', badge: 'unsent', stateText: 'Unsent', text: 'Split it?', editable: true, readOnlyText: '',
  });
  assert.equal(one.commentLabel, 'Comment on container R, 1 unsent note');
  const two = regionState(region, v, board({ regionNotes: new Map([['r', [note(4, 'Old', true), note(9, 'New')]]]) }), drawn('1'));
  assert.deepEqual([two.note!.seq, two.note!.stage, two.note!.text], [9, 'unsent', 'New'], 'the latest note');
  const sentNotes = board({ regionNotes: new Map([['r', [note(4, 'Old', true)]]]) });
  const sent = regionState(region, v, sentNotes, drawn('1'));
  assert.deepEqual([sent.note!.stage, sent.note!.badge, sent.note!.stateText, sent.note!.editable, sent.note!.readOnlyText],
    ['sent', 'sent', 'Sent, waiting for the agent', false, 'Read-only until the agent answers'], 'waiting when owed is not given');
  assert.equal(sent.commentLabel, 'Comment on container R, 1 sent note waiting for the agent');
  // `owed` from pendingItems: still listed, still waiting; no longer listed, answered and no badge.
  assert.equal(regionState(region, v, sentNotes, drawn('1'), undefined, new Set(['r'])).note!.badge, 'sent');
  const answered = regionState(region, v, sentNotes, drawn('1'), undefined, new Set(['other']));
  assert.deepEqual([answered.note!.stage, answered.note!.badge, answered.note!.stateText, answered.note!.readOnlyText],
    ['answered', 'none', 'Sent, answered', 'Read-only']);
  assert.equal(answered.commentLabel, 'Comment on container R');
  // An unsent note keeps its badge whatever `owed` says: only a sent note can be answered.
  assert.equal(regionState(region, v, board({ regionNotes: new Map([['r', [note(4, 'x')]]]) }), drawn('1'), undefined, new Set()).note!.badge, 'unsent');
});

test('noteStage, noteBadge and commentLabel: the badge from the note\'s state', () => {
  assert.equal(noteStage({}, true), 'unsent');
  assert.equal(noteStage({}, false), 'unsent');
  assert.equal(noteStage({ sent: true }, true), 'sent');
  assert.equal(noteStage({ sent: true }, false), 'answered');
  assert.deepEqual([undefined, 'unsent', 'sent', 'answered'].map((s) => noteBadge(s as RegionNoteStage | undefined)), ['none', 'unsent', 'sent', 'none']);
  assert.deepEqual(NOTE_STAGE_TEXT, { unsent: 'Unsent', sent: 'Sent, waiting for the agent', answered: 'Sent, answered' });
  assert.equal(commentLabel('Risks', 'unsent'), 'Comment on container Risks, 1 unsent note');
  assert.equal(commentLabel('Risks', 'sent'), 'Comment on container Risks, 1 sent note waiting for the agent');
  assert.equal(commentLabel('Risks', 'none'), 'Comment on container Risks');
  assert.equal(regionNote(undefined), undefined);
  assert.equal(regionNote([]), undefined);
});

test('every region takes the neutral frame colour for now, a token and never a literal colour', () => {
  assert.equal(regionColour(region), REGION_COLOUR_DEFAULT);
  assert.equal(regionColour({ id: 'other' }), 'var(--vb-line-contrast)');
  assert.doesNotMatch(REGION_COLOUR_DEFAULT, /#|rgb|hsl/);
});

test('holders: left out when none are given; creator first, and only the others removable', () => {
  const v = view([node({ id: '1', n: 1 })]);
  assert.equal('holders' in regionState(region, v, board(), drawn('1')), false);
  assert.equal('holders' in regionState(region, v, board(), drawn('1'), []), false);
  const st = regionState(region, v, board(), drawn('1'), [
    { agent: 'a-bbbb2222', label: 'Docs chat' },
    { agent: 'a-aaaa1111', label: 'Pricing chat', creator: true },
  ]);
  assert.deepEqual(st.holders, [
    { agent: 'a-aaaa1111', label: 'Pricing chat', removable: false },
    { agent: 'a-bbbb2222', label: 'Docs chat', removable: true },
  ]);
  assert.deepEqual(regionHolders([{ agent: 'a-bbbb2222', label: 'Docs chat' }]), [{ agent: 'a-bbbb2222', label: 'Docs chat', removable: true }]);
});

// Field report batch 2 ruling 1: a container cards were retired from says how many, and a press
// opens the board version where they last appeared; with no version to open it only says how many.
// Round 2 ruling 1: it shows "3 retired" (the number alone with an icon when the line has no room);
// the full words stay in its name and tooltip.
test('retiredMarker: "N retired", named in full words with the version it opens', () => {
  assert.deepEqual(retiredMarker(1, 40), { count: 1, text: '1 retired', label: '1 card retired from this container. Show v40, where it last appeared', version: 40 });
  assert.deepEqual(retiredMarker(3, 12), { count: 3, text: '3 retired', label: '3 cards retired from this container. Show v12, where they last appeared', version: 12 });
  assert.deepEqual(retiredMarker(2), { count: 2, text: '2 retired', label: '2 cards retired from this container' });
  // Review polish ruling 10: the line the past view's answers run to rides with the version, never alone.
  assert.deepEqual(retiredMarker(3, 12, 15), { ...retiredMarker(3, 12), until: 15 });
  assert.deepEqual(retiredMarker(2, undefined, 15), retiredMarker(2));
});

// Field report batch 3 ruling 5: the widths in force are the person's, else the agent's, else the
// shown mode's default (match for grid and column, own for the rest), as the layout reads them.
test('regionState: the card widths in force, the person\'s first, then the agent\'s, then the shown mode\'s default', () => {
  const v = view([node({})]);
  assert.equal(regionState({ id: 'r', mode: 'grid' }, v, board(), drawn('1')).widths, 'match');
  assert.equal(regionState({ id: 'r', mode: 'flow' }, v, board(), drawn('1')).widths, 'own');
  const agent: View = { ...v, regions: [{ ...region, widths: 'own' }] };
  assert.equal(regionState({ id: 'r', mode: 'grid' }, agent, board(), drawn('1')).widths, 'own');
  assert.equal(regionState({ id: 'r', mode: 'grid' }, agent, board({ widths: new Map([['r', 'match']]) }), drawn('1')).widths, 'match');
  assert.equal(regionState({ id: 'r', mode: 'flow' }, v, board({ widths: new Map([['other', 'match']]) }), drawn('1')).widths, 'own');
  assert.equal(WIDTHS_LABEL, 'Match card widths');
  assert.deepEqual([widthsTip('match'), widthsTip('own')], ['Card widths: Match', 'Card widths: Own']);
});

test('noteStage and regionNote: a container note the agent answered before a Send is history: answered, read-only (ruling 5)', () => {
  assert.equal(noteStage({ locked: true }, true), 'answered');
  const n = regionNote([{ seq: 4, kind: 'comment', text: 'Order?', at: '2026-10-14T10:00:00Z', locked: true }], true)!;
  assert.deepEqual([n.stage, n.badge, n.stateText, n.editable, n.readOnlyText], ['answered', 'none', 'Answered', false, 'Read-only']);
});
