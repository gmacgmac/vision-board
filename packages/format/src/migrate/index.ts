// The ledger migration's upgrade chain (D-103; ledger review § 3): the one module that knows the old ledger formats.
// `upgradeLine` brings one parsed line to `LEDGER_FORMAT` through the steps (steps.ts); `upgradeLines` does it to the
// text of a whole file, keeping every line it does not change byte for byte. Used two ways: written back by the
// server's runner (apps/board/server/ledger-migrate.ts) when the opener may write, and in memory in front of the reader
// when it may not (D-085: a read-only open writes nothing). Pure; no `node:` import (the page loads `#format`).
import { LEDGER_FORMAT } from '../ledger.ts';
import { eventProblems } from '../ledger-shape.ts';
import { isRecord } from '../records.ts';
import * as formatLedgerWords from '../words/format-ledger.ts';
import type { UpgradeStep, UpgradeStop } from './steps.ts';
import { FORMAT_STEPS } from './steps.ts';

export type { UpgradeStep, UpgradeStop } from './steps.ts';

type Line = Record<string, unknown>;

/** Whether an upgrade stopped. */
export const isUpgradeStop = (x: Line | UpgradeStop): x is UpgradeStop =>
  Object.keys(x).length === 1 && typeof (x as Partial<UpgradeStop>).stop === 'string';

/** A line with no `v` (review § 3): read as format 2 only when, so read, it upgrades to a well-formed current line;
 * else it stops. Never guessed at. */
const noVersion: UpgradeStep = {
  from: 'none',
  to: 2,
  up(line) {
    const as2 = { v: 2, ...line };
    const up = upgradeLine(as2);
    const problems = isUpgradeStop(up) ? [up.stop] : eventProblems(up);
    return problems.length ? { stop: formatLedgerWords.noFormatNotFormat2(problems.join('; ')) } : as2;
  },
};

/** Every step, the line with no `v` first, then one per format from 2. */
export const UPGRADE_STEPS: readonly UpgradeStep[] = /* @__PURE__ */ [noVersion].concat(FORMAT_STEPS);

/** The steps by the format they upgrade from, made on the first upgrade: nothing runs when this module loads, so a
 * bundle that never upgrades a line (the board's page and view: the server upgrades first) leaves the chain out. */
let byFrom: Map<number | 'none', UpgradeStep> | undefined;

/** One parsed line in the current format, or why it can't be. A line already current comes back untouched (the same
 * object), and so does one whose `v` the chain does not know (newer, or not a format): the reader judges it. */
export function upgradeLine(line: Readonly<Line>): Line | UpgradeStop {
  let v: unknown = line.v === undefined ? 'none' : line.v;
  let cur = line as Line;
  while (v !== LEDGER_FORMAT) {
    const step = (byFrom ??= new Map(UPGRADE_STEPS.map((s) => [s.from, s]))).get(v as number | 'none');
    if (!step) return cur;
    const out = step.up(cur);
    if (isUpgradeStop(out)) return out;
    cur = out;
    v = step.to;
  }
  return cur;
}

/** A whole file upgraded, as text. */
export interface UpgradedLines {
  /** The lines, as many as were given, in their order. */
  lines: string[];
  /** How many were changed. */
  changed: number;
  /** Lines that can't be upgraded (0-based index) and why: nothing may be written while there is one. */
  stops: { index: number; stop: string }[];
  /** Lines written in a format newer than this build's (0-based index): the ledger is read-only (D-103 4). */
  newer: number[];
  /** The changed lines counted by the format they were in (`none` for no `v`), for `ledger:migrate --check`. */
  byFormat: Record<string, number>;
}

/** What a line already current starts with, as the server stamps it (`v` first): it is kept without a parse. */
const CURRENT = `{"v":${LEDGER_FORMAT},`;

/** Text in, text out: a current line, a blank one, a line that is not JSON and a line whose upgrade fails the current
 * shape (one that failed its shape before: the migration fixes formats, it does not repair or drop data) are kept byte
 * for byte; an upgraded line keeps its key order with `v` replaced in place. Running it twice gives the bytes of running
 * it once. */
export function upgradeLines(lines: readonly string[]): UpgradedLines {
  const out: UpgradedLines = { lines: [], changed: 0, stops: [], newer: [], byFormat: {} };
  lines.forEach((text, index) => {
    const keep = () => void out.lines.push(text);
    if (text.startsWith(CURRENT) || !text.trim()) return keep();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return keep(); }
    if (!isRecord(parsed)) return keep();
    if (Number.isInteger(parsed.v) && (parsed.v as number) > LEDGER_FORMAT) {
      out.newer.push(index);
      return keep();
    }
    const up = upgradeLine(parsed);
    if (isUpgradeStop(up)) {
      out.stops.push({ index, stop: up.stop });
      return keep();
    }
    if (up === parsed || eventProblems(up).length) return keep();
    out.lines.push(JSON.stringify(up));
    out.changed += 1;
    const from = parsed.v === undefined ? 'none' : String(parsed.v);
    out.byFormat[from] = (out.byFormat[from] ?? 0) + 1;
  });
  return out;
}
