// Timeline T_02, scenario 55 (D-105 2: the key is intentional): four review findings, one naming a deadline in passing.
// Nothing here is a plan or a history, so no card gets a `timeline` key and `references/timeline.md` is not read: the
// deadline stays in the finding's text.
import { doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { noTimelineKey, secretArg } from './timeline-checks.ts';

const BOARD = 'payments-review';
const FINDINGS = [
  ['retry', 'The retry loop has no back-off', 'It retries at once, forever, when the bank is slow.'],
  ['tokens', 'Full tokens are logged in debug mode', 'This has to be fixed before the audit on 12 January 2027.'],
  ['limits', 'Two endpoints skip the rate limiter', 'Refunds and payouts are not limited.'],
  ['traces', 'Error messages show stack traces', 'A failed payment returns the server\'s stack trace.'],
] as const;

const items = (dated: boolean) => [
  { type: 'board', key: 'payments-board', title: 'Payments review', summary: 'What the code review found.' },
  { type: 'region', key: 'payments-region-findings', region: { id: 'findings', title: 'Findings' } },
  ...FINDINGS.map(([id, title, body]) => ({ type: 'node', key: `payments-card-${id}`, node: {
    region: 'findings', kind: 'finding', title, body, ...(dated && id === 'tokens' && { timeline: '2027-01-12' }),
  } })),
];

async function good(bot: FakeBot) {
  const secret = await secretArg(bot);
  await bot.call('write_board', { ...secret, board: BOARD, items: items(false) });
  bot.say('Done.');
}
/** Reads the timeline reference and dates the finding that names a deadline. */
async function bad(bot: FakeBot) {
  const secret = await secretArg(bot);
  bot.read('timeline');
  await bot.call('write_board', { ...secret, board: BOARD, items: items(true) });
  bot.say('Done.');
}

export const timelineNotForProse: Scenario = {
  id: 'timeline-not-for-prose',
  title: 'Review findings, one naming a deadline in passing: no `timeline` key, and no timeline reference read',
  turns: [{ say: `Put these four findings from the payments code review on a new board, in a row: ${FINDINGS.map(([, t, b]) => `${t.charAt(0).toLowerCase()}${t.slice(1)} (${b.charAt(0).toLowerCase()}${b.slice(1, -1)})`).join('; ')}.` }],
  checks: [noTimelineKey(), everyItemKeyed(), noCoordinates(), doneOnly()],
  fake: { good: [good], bad: [bad], badFails: ['no-timeline-key', 'reads-references'] },
};
