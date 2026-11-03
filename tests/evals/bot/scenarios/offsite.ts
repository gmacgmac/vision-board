// The board most scenarios share, from the live run: a team offsite, three venues as decision cards in a row. The
// setup draws it as the bot's own earlier turn (through the bot's tools, with the keys the live run's bot chose), so a
// scenario starts where a host's conversation would be, with nothing of that turn in the model's context: the case
// after a compaction, or a new chat on an old board.
import type { FakeBot, Stage } from '../types.ts';

export const BOARD = 'team-offsite';
export const DRAW = 'We are planning a one-day team offsite next month and I need to pick where. Put the three options on the board as a row, one card each: our own office, a rented cabin an hour away, or a meeting room in a city hotel. I will answer each one.';
export const NOTE = 'How long is the drive back in the evening? Some of us have kids to collect.';

const VENUES = [
  ['Our own office', 'No travel and the lowest cost, but easy to get pulled back into daily work.', 'office'],
  ['Rented cabin, an hour away', 'A change of scene with room to focus, but it needs transport and a booking.', 'cabin'],
  ['Meeting room in a city hotel', 'Catering and screens included and easy to reach, but it costs more.', 'hotel'],
] as const;

/** The three venue cards as `write_board` items, keyed `<prefix>-f1..3`. */
export const offsiteItems = (prefix: string) => [
  { type: 'board', key: `${prefix}-b`, title: 'Team offsite venue', summary: 'Choosing where to hold next month\'s one-day team offsite.' },
  { type: 'region', key: `${prefix}-r1`, region: { id: 'venues', title: 'Venue options', mode: 'row' } },
  ...VENUES.map(([title, body, short], i) => ({
    type: 'node', key: `${prefix}-f${i + 1}`,
    node: { region: 'venues', kind: 'decision', title, body: `${body}\n\n✓ pick the ${short} · ✗ rule it out` },
  })),
];

/** The bot's earlier turn: the board drawn, cards 1 to 3. */
export async function drawOffsite(s: Stage): Promise<void> {
  await s.tool('write_board', { board: BOARD, items: offsiteItems('offsite') });
}

/** The earlier turns of a round: the person's ✗ and note on card 1, their Send, and the bot's reply to the note. */
export async function answeredRound(s: Stage): Promise<void> {
  await drawOffsite(s);
  await s.person.mark(BOARD, 1, 'drop');
  s.facts.noteSeq = await s.person.note(BOARD, 1, NOTE);
  await s.person.send(BOARD);
  await s.tool('write_board', { board: BOARD, items: [{ type: 'reply', key: 'offsite-reply-n1', n: 1, to: s.facts.noteSeq, text: 'From the office there is no drive; from the cabin it is about an hour. ✓ if ruling out the office still holds.' }] });
}

/** The fake bot's draw, keeping every rule. */
export async function fakeDraw(bot: FakeBot): Promise<void> {
  await bot.call('list_boards', {});
  await bot.call('write_board', { board: BOARD, items: offsiteItems('offsite-venue') });
  bot.say('Done.');
}

/** The fake bot's answer to the note on card 1: read the card, reply with the mark asked again. */
export async function fakeReply(bot: FakeBot, key: string): Promise<void> {
  const node = await bot.call('show_node', { board: BOARD, n: 1 });
  const seq = node.notes.at(-1).seq;
  await bot.call('write_board', { board: BOARD, items: [{ type: 'reply', key, n: 1, to: seq, text: 'The cabin is about an hour back. ✓ if ruling out the office holds.' }] });
  bot.say('Done.');
}
