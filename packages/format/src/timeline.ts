// A node's date (D-105, api.md 190-196): the one grammar of the `timeline` key, imported by the server (the write edge
// normalises with it), the layout (the line's order) and the page (the header). Four stored forms, each a precision:
// `2026`, `2026-10`, `2026-10-13`, `2026-10-13T14:30`. Pure, and string arithmetic only: no `Date`, so no time zone can
// creep into a value or its order. `common.schema.json` `$defs.timeline` is the pattern's twin (`timeline.test.ts`).
import * as formatLedgerWords from './words/format-ledger.ts';

/** The four stored forms, one example each, coarsest first: the words name them. */
export const TIMELINE_FORMS = ['2026', '2026-10', '2026-10-13', '2026-10-13T14:30'] as const;

/** How precise a date is: what was written, never a separate field (D-105 1). */
export type TimelinePrecision = 'year' | 'month' | 'day' | 'minute';

/** The longest value an agent may send, in characters as sent (spaces, seconds and a zone included). */
export const TIMELINE_MAX = 40;

/** The stored grammar: four digits; then optionally `-MM`; then `-DD`; then `THH:mm`. Whether the day exists in its
 * month is `isTimeline`'s (the schema can't say it). */
export const TIMELINE_PATTERN = /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01])(?:T(?:[01]\d|2[0-3]):[0-5]\d)?)?)?$/;

/** What an agent may send (decision 2): a date; then, after `T`, `t` or one space, `HH:mm`, then optionally seconds
 * and a fraction, then optionally a zone (`Z`, `z`, `±HH:mm`, `±HHmm`, `±HH`). Group 1 is the date, group 2 the time. */
const SENT = /^(\d{4}(?:-\d{2}(?:-\d{2})?)?)(?:[Tt ](\d{2}:\d{2})(?::[0-5]\d(?:\.\d+)?)?(?:[Zz]|[+-](?:[01]\d|2[0-3])(?::?[0-5]\d)?)?)?$/;

const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeap = (y: number): boolean => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);

/** Whether a value the pattern takes names a day its month has (Gregorian leap years). */
function dayExists(v: string): boolean {
  if (v.length < 10) return true;
  const year = Number(v.slice(0, 4));
  const month = Number(v.slice(5, 7));
  return Number(v.slice(8, 10)) <= (month === 2 && isLeap(year) ? 29 : DAYS_IN[month - 1]!);
}

/** Whether `v` is a stored date: one of the four forms, and a real one (month 01-12, a day its month has, hour 00-23,
 * minute 00-59). */
export const isTimeline = (v: unknown): v is string => typeof v === 'string' && TIMELINE_PATTERN.test(v) && dayExists(v);

/** An agent's value in its one stored spelling, or undefined when it can't be (D-105 1, decision 2). Surrounding
 * spaces are trimmed; a whole number from 1000 to 9999 is a year; a space or `t` before the time is `T`; seconds,
 * their fraction and a zone are dropped, the time digits kept as written (no conversion). The precision never changes:
 * a date with no time never gains one, and a zone on a date alone is refused. */
export function normaliseTimeline(raw: unknown): string | undefined {
  if (Number.isInteger(raw)) return (raw as number) >= 1000 && (raw as number) <= 9999 ? String(raw) : undefined;
  if (typeof raw !== 'string' || [...raw].length > TIMELINE_MAX) return undefined;
  const sent = SENT.exec(raw.trim());
  if (!sent) return undefined;
  const v = sent[2] === undefined ? sent[1]! : `${sent[1]}T${sent[2]}`;
  return isTimeline(v) ? v : undefined;
}

/** A stored date's precision, from its length. */
export function timelinePrecision(v: string): TimelinePrecision {
  return v.length <= 4 ? 'year' : v.length <= 7 ? 'month' : v.length <= 10 ? 'day' : 'minute';
}

/** A stored date's year, as written (the line shows it where it turns, D-105 3). */
export const timelineYear = (v: string): string => v.slice(0, 4);

/** Where a date starts, as `YYYY-MM-DDTHH:mm`: `2026` starts on 1 January, `2026-10` on 1 October, a day at 00:00. */
const startOf = (v: string): string => v + '0000-01-01T00:00'.slice(v.length);

/** The timeline's order (D-105 3, decision 9): by start; at the same start, the coarser first (`2026-10` before
 * `2026-10-01` before `2026-10-01T00:00`). 0 only for equal values. */
export function compareTimeline(a: string, b: string): number {
  const sa = startOf(a), sb = startOf(b);
  return sa < sb ? -1 : sa > sb ? 1 : a.length - b.length;
}

/** Numbers first, smallest first; a node with none after them. */
const byNumber = (a: number | undefined, b: number | undefined): number =>
  a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a - b;

/** Nodes in timeline order: by `compareTimeline`, equal dates by card number (`n`, the order they were made), then as
 * given (a stable sort). A node with no date goes after every dated one. The layout and `show_layout` both use it, so
 * there is one order everywhere. A new array; the input is never changed. */
export function sortByTimeline<T extends { timeline?: string | undefined; n?: number | undefined }>(nodes: readonly T[]): T[] {
  return [...nodes].sort((a, b) => {
    if (a.timeline === undefined || b.timeline === undefined) return a.timeline === b.timeline ? byNumber(a.n, b.n) : a.timeline === undefined ? 1 : -1;
    return compareTimeline(a.timeline, b.timeline) || byNumber(a.n, b.n);
  });
}

/** The shape rule for a stored `timeline` (the ledger and a view never normalise): one of the four forms, a real date.
 * The twin of `common.schema.json` `$defs.timeline`; ledger-shape.ts and validate.ts call it. */
export function timelineProblems(v: unknown, f: string, p: string[]): void {
  if (!isTimeline(v)) p.push(formatLedgerWords.timelineForms(f, TIMELINE_FORMS));
}
