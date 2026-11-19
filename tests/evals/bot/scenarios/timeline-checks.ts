// Checks the timeline scenarios share (timeline T_02, D-105): what the bot dated, read as the board stores it. A sent
// `timeline` is judged by `#format` `normaliseTimeline`, the write edge's own normaliser, so a check takes exactly what
// the server keeps (a zone or seconds dropped) and nothing it refuses (a quarter, a week).
import path from 'node:path';
import { normaliseTimeline } from '#format';
import { callsTo, check, itemsOf } from '../checks.ts';
import type { Check, FakeBot, RunRecord } from '../types.ts';
import { accepted } from './layout-checks.ts';

/** A card the bot drew: its accepted node item's content, its stored date (or undefined) and its number. */
export interface Drawn { title: string; body: string; region: string; timeline: string | undefined; n: number | undefined }

/** Every card the bot drew, the latest accepted version of each (by number, else by key). */
export function drawn(r: RunRecord): Drawn[] {
  const out = new Map<string, Drawn>();
  for (const { item, done } of accepted(r, 'node')) {
    const node = item.node ?? {};
    const id = typeof done.n === 'number' ? `n${done.n}` : `k${item.key}`;
    out.set(id, { title: String(node.title ?? ''), body: String(node.body ?? ''), region: String(node.region ?? ''), timeline: normaliseTimeline(node.timeline), n: done.n });
  }
  return [...out.values()];
}

/** The card about `about`: the first whose title matches, else the first whose body does. */
export const cardAbout = (cards: Drawn[], about: RegExp) => cards.find((c) => about.test(c.title)) ?? cards.find((c) => about.test(c.body));

/** Each event's card carries the date as said, at the precision said: `[name, what finds its card, stored value]`. */
export const datesAsSaid = (events: readonly (readonly [string, RegExp, string])[]): Check => check(
  'dates-as-said', `each event's card carries \`timeline\` at the precision said: ${events.map(([name, , v]) => `${name} ${v}`).join(', ')}`,
  (r) => {
    const cards = drawn(r);
    const got = events.map(([name, about, want]) => { const c = cardAbout(cards, about); return [name, c ? c.timeline ?? 'no key' : 'no card', want] as const; });
    return [got.every(([, have, want]) => have === want), got.map(([name, have, want]) => `${name}: ${have}${have === want ? '' : ` (want ${want})`}`).join('; ')];
  },
);

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)';
/** A date at the start of a line, past any Markdown that opens it: a year, a time, `14 Oct`, `Oct 14`, `March:`, a
 * quarter or "week of". A weekday alone ("Monday") names an entry, not the date. */
const DATE_LEAD = new RegExp(`^(?:\\d{4}\\b|\\d{1,2}:\\d{2}|\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}|${MONTH}[a-z]*\\.?(?:\\s+\\d|\\s*[:·—–-]|\\s*$)|q[1-4]\\b|week of\\b)`, 'i');
const startsWithDate = (text: string) => DATE_LEAD.test(text.trim().replace(/^(?:[#>*_`\s-]|\d+[.)]\s)*/, ''));

/** No card's title or body starts with a date: the date is the card's header. */
export const noDateLead = (): Check => check('no-date-lead', 'no card\'s title or body starts with a date (the date is the card\'s header)', (r) => {
  const cards = drawn(r);
  const led = cards.filter((c) => startsWithDate(c.title) || startsWithDate(c.body));
  return [cards.length > 0 && led.length === 0, led.length ? led.map((c) => `"${c.title}"`).join(', ') : `${cards.length} cards, none led by a date`];
});

/** The dated cards (at least `least`) sit in one container. */
export const oneTimelineContainer = (least: number): Check => check('one-timeline-container', `the dated cards (${least} or more) sit in one container`, (r) => {
  const dated = drawn(r).filter((c) => c.timeline !== undefined);
  const regions = [...new Set(dated.map((c) => c.region))];
  return [dated.length >= least && regions.length === 1, `${dated.length} dated card(s) in ${regions.join(', ') || 'no container'}`];
});

/** No container is sent with a `timeline` mode: the line sits beside the container's own layout. */
export const noTimelineMode = (): Check => check('no-timeline-mode', 'no container is sent with `mode: "timeline"` (there is no such mode)', (r) => {
  const sent = itemsOf(r).filter(({ item }) => item.type === 'region' && item.region?.mode === 'timeline').map(({ item }) => item.region.id);
  return [sent.length === 0, sent.length ? `timeline mode on ${sent.join(', ')}` : 'none'];
});

/** The round is one `write_board` call. */
export const oneWrite = (): Check => check('one-write', 'one write_board call for the round', (r) => {
  const n = callsTo(r, 'write_board').length;
  return [n === 1, `${n} write_board call(s)`];
});

/** No node item is sent with a `timeline` key: a date in passing stays in the text. */
export const noTimelineKey = (): Check => check('no-timeline-key', 'no card is sent with a `timeline` key (a date in passing is only text)', (r) => {
  const keyed = itemsOf(r).filter(({ item }) => item.type === 'node' && item.node?.timeline !== undefined).map(({ item }) => `"${item.node.title}": ${item.node.timeline}`);
  return [keyed.length === 0, keyed.join(', ') || 'none'];
});

/** A `###` heading, or a paragraph or list item opening with a bold name: an entry's first line (FE_01, call 9). */
const LEAD = /^(?:###\s+\S|(?:[-*+]\s+|\d+[.)]\s+)?\*\*[^*\n]+\*\*)/;
/** A heading or a rule ends a `###` entry; a blank line ends a bold-lead one. */
const ENDS = /^(?:#{1,6}\s|---|\*\*\*|___)/;

/** A body's entries, each its lead line and the lines that belong to it. */
export function entriesOf(body: string): string[] {
  const blocks: string[] = [];
  let open: string[] | null = null;
  let bold = false;
  for (const line of body.split('\n')) {
    if (LEAD.test(line)) { if (open) blocks.push(open.join('\n')); open = [line]; bold = !line.startsWith('###'); continue; }
    if (open && (ENDS.test(line) || (bold && !line.trim()))) { blocks.push(open.join('\n')); open = null; continue; }
    open?.push(line);
  }
  if (open) blocks.push(open.join('\n'));
  return blocks;
}

/** The card about `about` writes each event as an entry of its own (`###` or a bold lead), and has no `##` line. */
export const eventsAsEntries = (about: RegExp, events: readonly (readonly [string, RegExp])[]): Check => check(
  'events-as-entries', `the card holding ${events.map(([name]) => name).join(', ')} writes each as a \`###\` heading or a bold lead, never \`##\` or a plain bullet`,
  (r) => {
    const card = cardAbout(drawn(r), about);
    if (!card) return [false, 'no card'];
    const blocks = entriesOf(card.body);
    const at = events.map(([, says]) => blocks.findIndex((b) => says.test(b)));
    const h2 = /^##\s/m.test(card.body);
    const ok = at.every((i) => i >= 0) && new Set(at).size === at.length && !h2;
    return [ok, `"${card.title}": ${blocks.length} entries; ${events.map(([name], i) => `${name} in ${at[i]! >= 0 ? `entry ${at[i]! + 1}` : 'none'}`).join(', ')}${h2 ? '; a ## line' : ''}`];
  },
);

/** The fake bot's `secret` argument: standalone it joins first (`join` is its host's tool); a host's bot sends none. So
 * one script plays both `SCENARIOS` and `STANDALONE`. */
export async function secretArg(bot: FakeBot): Promise<{ secret?: string }> {
  if (!bot.tools.includes('join')) return {};
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  return { secret };
}
