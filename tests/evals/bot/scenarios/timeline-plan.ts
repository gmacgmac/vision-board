// Timeline T_02, scenario 53 (D-105, PLAN.md decisions 22-23): a launch plan "as a timeline", five dated cards at every
// precision (a month, a day, a day and a time, a week, a year), the year said once. The bot reads `references/timeline.md`
// and no other, dates each card in its stored form at the precision said (the week by its first day; never a day
// invented for a month), keeps the date out of titles and bodies, puts the week's three events in one card as entries
// (`###` or bold leads), the dated cards in one container with no `timeline` mode, in one `write_board` call.
import { doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { datesAsSaid, eventsAsEntries, noDateLead, noTimelineMode, oneTimelineContainer, oneWrite, secretArg } from './timeline-checks.ts';

const BOARD = 'lumen-launch';
const WEEK = /launch week|partner briefing/i;
const EVENTS = [
  ['beta', /beta/i, '2027-09'], ['pricing', /pric/i, '2027-10-22'], ['go/no-go', /go.{0,3}no.{0,3}go/i, '2027-11-03T09:45'],
  ['launch week', WEEK, '2027-11-15'], ['review', /review/i, '2028'],
] as const;
const ENTRIES = [['partner briefing', /partner|briefing/i], ['store listing', /store|listing/i], ['community Q&A', /community|Q\s?&\s?A/i]] as const;

const card = (id: string, title: string, timeline: string | number | undefined, body: string, kind = 'topic') =>
  ({ type: 'node', key: `lumen-card-${id}`, node: { region: 'plan', kind, title, body, ...(timeline !== undefined && { timeline }) } });
const head = [
  { type: 'board', key: 'lumen-board', title: 'Lumen Notes launch', summary: 'The launch plan, in date order.' },
  { type: 'region', key: 'lumen-region-plan', region: { id: 'plan', title: 'Launch plan' } },
];

/** Writes the cards out of date order: the board orders them. */
async function good(bot: FakeBot) {
  const secret = await secretArg(bot);
  bot.read('timeline');
  await bot.call('write_board', { ...secret, board: BOARD, items: [...head,
    card('week', 'Launch week', '2027-11-15', '### Monday\nPartner briefing.\n\n### Wednesday\nThe store listing goes live.\n\n### Friday\nCommunity Q&A.'),
    card('beta', 'Private beta opens', '2027-09', 'First testers from the waiting list.'),
    card('pricing', 'Pricing signed off', '2027-10-22', 'Plans and prices final.'),
    card('go', 'Go/no-go call', '2027-11-03T09:45', '✓ launch as planned · ✗ move launch week', 'decision'),
    card('review', 'First-year review', 2028, 'What the first year taught us.'),
  ] });
  bot.say('Done.');
}

/** Dates in titles with no key, a quarter for the year, `##` for the week's events, a second call, a reference it
 * doesn't need. */
async function bad(bot: FakeBot) {
  const secret = await secretArg(bot);
  bot.read('timeline');
  bot.read('layouts');
  await bot.call('write_board', { ...secret, board: BOARD, items: [...head,
    card('beta', 'September: private beta opens', undefined, 'First testers.'),
    card('pricing', 'Pricing signed off', '2027-10-22', '22 October: plans and prices final.'),
    card('go', 'Go/no-go call', '2027-11-03T09:45', '✓ launch · ✗ move it', 'decision'),
    card('week', 'Launch week', '2027-11-15', '## Monday\nPartner briefing.\n\n## Wednesday\nThe store listing goes live.\n\n## Friday\nCommunity Q&A.'),
    card('review', 'First-year review', '2028-Q1', 'What the first year taught us.'),
  ] });
  await bot.call('write_board', { ...secret, board: BOARD, items: [card('review', 'First-year review', '2028-Q1', 'What the first year taught us.')] });
  bot.say('Done.');
}

export const timelinePlan: Scenario = {
  id: 'timeline-plan',
  title: 'A launch plan as a timeline: dates in their stored forms at the precision said, a week\'s events as entries',
  turns: [{ say: 'Put our launch plan for Lumen Notes on a new board as a timeline. Everything is in 2027 unless I say otherwise. The private beta opens in September. Pricing is signed off on 22 October. The go/no-go call is on 3 November at 09:45. Launch week is the week of 15 November; keep it on one card with its three events: the partner briefing on the Monday, the store listing goes live on the Wednesday, and the community Q&A on the Friday. The first-year review is some time in 2028.' }],
  checks: [datesAsSaid(EVENTS), eventsAsEntries(WEEK, ENTRIES), noDateLead(), oneTimelineContainer(EVENTS.length), noTimelineMode(), oneWrite(), everyItemKeyed(), noCoordinates(), doneOnly()],
  reads: { need: ['timeline'] },
  fake: { good: [good], bad: [bad], badFails: ['dates-as-said', 'events-as-entries', 'no-date-lead', 'one-timeline-container', 'one-write', 'reads-references'] },
};
