// Timeline T_02, scenario 54 (D-105, PLAN.md decision 23): how an incident unfolded on one day, the moments given out of
// order and never called a timeline (no "timeline", "date" or "key" in the request). The bot reads
// `references/timeline.md`, gives each moment's card its time in the minute form, and leaves the order to the board: it
// may write the cards in any order. No date or time leads a title or body.
import { doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { datesAsSaid, noDateLead, noTimelineMode, oneTimelineContainer, secretArg } from './timeline-checks.ts';

const BOARD = 'sync-outage';
const MOMENTS = [
  ['fix', 'Fix deployed', /fix/i, '11:05'], ['alerts', 'Alerts fire', /alert/i, '09:12'], ['rollback', 'Config change rolled back', /roll/i, '10:20'],
  ['confirmed', 'Outage confirmed', /confirm/i, '09:20'], ['clear', 'All clear', /all clear/i, '11:40'],
] as const;
const DAY = '2027-03-04';

const items = (dated: boolean) => [
  { type: 'board', key: 'sync-board', title: 'Sync outage', summary: 'How the sync outage unfolded.' },
  { type: 'region', key: 'sync-region-moments', region: { id: 'moments', title: 'How it unfolded' } },
  ...MOMENTS.map(([id, title, , time]) => ({ type: 'node', key: `sync-card-${id}`, node: {
    region: 'moments', kind: 'finding', title: dated ? title : `${time} ${title}`, ...(dated && { timeline: `${DAY} ${time}` }),
  } })),
];

/** Writes the moments in the order the person gave them, with a space before the time (the board reads it as `T`). */
async function good(bot: FakeBot) {
  const secret = await secretArg(bot);
  bot.read('timeline');
  await bot.call('write_board', { ...secret, board: BOARD, items: items(true) });
  bot.say('Done.');
}
/** Puts each time in the title and dates nothing, reading nothing. */
async function bad(bot: FakeBot) {
  const secret = await secretArg(bot);
  await bot.call('write_board', { ...secret, board: BOARD, items: items(false) });
  bot.say('Done.');
}

export const timelineUnprompted: Scenario = {
  id: 'timeline-unprompted',
  title: 'An incident\'s moments with times, never called a timeline: each dated to the minute, the order left to the board',
  turns: [{ say: 'Our sync service went down on 4 March 2027. Draw how it unfolded on a new board, one card per moment, in one container. My notes are out of order: the fix was deployed at 11:05; alerts first fired at 09:12; we rolled back the config change at 10:20; the on-call engineer confirmed the outage at 09:20; we called all clear at 11:40.' }],
  checks: [datesAsSaid(MOMENTS.map(([id, , about, time]) => [id, about, `${DAY}T${time}`] as const)), noDateLead(), oneTimelineContainer(MOMENTS.length), noTimelineMode(), everyItemKeyed(), noCoordinates(), doneOnly()],
  reads: { need: ['timeline'] },
  fake: { good: [good], bad: [bad], badFails: ['dates-as-said', 'no-date-lead', 'one-timeline-container', 'reads-references'] },
};
