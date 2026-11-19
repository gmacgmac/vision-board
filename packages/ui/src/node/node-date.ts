// Node pattern: a dated node's header (D-105 4, PLAN decision 16, call 10): the short form the node shows, the full form
// assistive technology reads, and the `datetime` of its <time>, from the precision the agent wrote (`#format`
// `timelinePrecision`). Month first, no year on a day or a time (the year is on the line); the time as written. The
// words are words/node.ts's; upper case is CSS's. Pure.
import { isTimeline, timelinePrecision } from '#format';
import * as nodeWords from '../words/node.ts';

export interface TimelineLabel {
  /** On the node: `Oct 13`, `Oct 2026`, `2026`, `Oct 13 · 14:30`. */
  short: string;
  /** Read aloud: "13 October 2026", "October 2026", "2026", "13 October 2026, 14:30". */
  full: string;
  /** The stored value, a valid `<time datetime>` in each of the four forms. */
  datetime: string;
}

/** The header of a node dated `value` (one of the four stored forms, `isTimeline`). */
export function timelineLabel(value: string): TimelineLabel {
  const precision = timelinePrecision(value);
  const year = value.slice(0, 4);
  if (precision === 'year') return { short: year, full: year, datetime: value };
  const month = Number(value.slice(5, 7)) - 1;
  const [short, long] = [nodeWords.monthsShort[month]!, nodeWords.monthsLong[month]!];
  if (precision === 'month') return { short: nodeWords.dateMonth(short, year), full: nodeWords.dateMonth(long, year), datetime: value };
  const day = String(Number(value.slice(8, 10)));
  const onDay = { short: nodeWords.dateDay(short, day), full: nodeWords.dateDayFull(day, long, year), datetime: value };
  if (precision === 'day') return onDay;
  const time = value.slice(11, 16);
  return { short: nodeWords.dateTime(onDay.short, time), full: nodeWords.dateTimeFull(onDay.full, time), datetime: value };
}

/** A node's date, when it is drawn as one: a stored date on any kind but an app card (T_01 refuses one there; the node
 *  ignores it if it ever arrives). The template, the element (`data-timeline`) and the Markdown entries read this. */
export const datedOf = (n: { kind: string; timeline?: unknown }): string | undefined =>
  n.kind !== 'app' && isTimeline(n.timeline) ? n.timeline : undefined;
