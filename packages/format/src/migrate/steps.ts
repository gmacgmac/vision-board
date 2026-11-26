// The upgrade chain's steps (D-103; ledger review § 3 "The steps the chain needs"): one per ledger format, each mapping
// one parsed line of its `from` format to one line of its `to` format, or stopping with its words. The only code that
// knows what an older format held: the old names live here as literals, never in the reader. A step never adds,
// removes or reorders a line, and never changes `seq`, `at`, `by`, `type`, a card's identity (`n`) or a board id
// (D-103 1, review V2): lines point at each other by `seq` and an agent holds a `head`. Pure; no `node:` import.
import { LATER_REGION } from '../ledger.ts';
import { AGENT_ID_PATTERN } from '../ledger-shape.ts';
import { isRecord } from '../records.ts';
import * as formatLedgerWords from '../words/format-ledger.ts';

type Line = Record<string, unknown>;

/** Why a line can't be upgraded: the whole migration stops, and nothing is written. */
export interface UpgradeStop { stop: string }

/** One format that did more than add. `up` maps one parsed line to one line, or stops with its words. */
export interface UpgradeStep {
  /** The format it reads; `'none'`: a line with no `v`. */
  from: number | 'none';
  to: number;
  up(line: Readonly<Line>): Line | UpgradeStop;
}

/** `line` stamped `to`, its keys in their places (`v` replaced where it stands). */
const stamped = (line: Readonly<Line>, to: number): Line => ({ ...line, v: to });

// Marked free of side effects, so a bundle that never upgrades a line (the board's page and view: the server upgrades
// first) leaves the chain out (performance.md).
/** A format that only added: its lines are the next format's as they are. */
/* @__NO_SIDE_EFFECTS__ */
function restamp(from: number): UpgradeStep {
  return { from, to: from + 1, up: (line) => stamped(line, from + 1) };
}

/** Format 2 named its agent by any text and made no creator (review V3). Current lines need an agent id and do make a
 * creator, and no `join` can be added, so the name is dropped: access stays as it was (no creator) and only the name
 * shown on old versions goes. A format-2 `join` keeps an agent that is already an id; any other stops. */
const fromFormat2: UpgradeStep = {
  from: 2,
  to: 3,
  up(line) {
    if (line.agent === undefined) return stamped(line, 3);
    if (line.type === 'join') {
      return typeof line.agent === 'string' && AGENT_ID_PATTERN.test(line.agent)
        ? stamped(line, 3) : { stop: formatLedgerWords.joinNotAnAgentId(String(line.agent)) };
    }
    const { agent: _agent, ...rest } = stamped(line, 3);
    return rest;
  },
};

/** Format 6 made `later` every board's own Later container (api.md 66): a container an agent named so before then
 * means something else, and which one it was can't be told from one line. */
const toFormat6: UpgradeStep = {
  from: 5,
  to: 6,
  up(line) {
    if (line.type === 'region' && isRecord(line.region) && line.region.id === LATER_REGION) {
      return { stop: formatLedgerWords.laterBeforeFormat6(String(line.board)) };
    }
    return stamped(line, 6);
  },
};

/** Format 11 took `item` away from a node: the kind decides (api.md 118). Every reader ignored it already. */
const toFormat11: UpgradeStep = {
  from: 10,
  to: 11,
  up(line) {
    if (line.type !== 'node' || !isRecord(line.node) || !('item' in line.node)) return stamped(line, 11);
    const { item: _item, ...node } = line.node;
    return { ...stamped(line, 11), node };
  },
};

/** The mode format 12 renamed (api.md 129): `list` is `column`. */
const RENAMED: Readonly<Record<string, string>> = { list: 'column' };
const renamed = (mode: unknown): unknown => (typeof mode === 'string' && RENAMED[mode]) || mode;

/** Format 12 renamed mode `list` to `column`, in a container's `region.mode` and the person's `mode` act. */
const toFormat12: UpgradeStep = {
  from: 11,
  to: 12,
  up(line) {
    const out = stamped(line, 12);
    if (line.type === 'region' && isRecord(line.region) && line.region.mode !== undefined) {
      out.region = { ...line.region, mode: renamed(line.region.mode) };
    }
    if (line.type === 'act' && line.mode !== undefined) out.mode = renamed(line.mode);
    return out;
  },
};

/** The person's private mark format 20 renamed (D-099 2, api.md 182): `flag` is `bookmark`, `unflag` `unbookmark`. */
const BOOKMARKED: Readonly<Record<string, string>> = { flag: 'bookmark', unflag: 'unbookmark' };

/** Format 20 renamed the flag Bookmark: a `flag` or `unflag` act becomes a `bookmark` or `unbookmark`. Nothing else
 * changes; every other line only takes the new format. */
const toFormat20: UpgradeStep = {
  from: 19,
  to: 20,
  up(line) {
    const out = stamped(line, 20);
    if (line.type === 'act' && typeof line.action === 'string' && Object.hasOwn(BOOKMARKED, line.action)) out.action = BOOKMARKED[line.action];
    return out;
  },
};

/** The steps from format 2, oldest first, one per format below LEDGER_FORMAT. */
export const FORMAT_STEPS: readonly UpgradeStep[] = [
  fromFormat2,
  restamp(3), restamp(4), toFormat6, restamp(6), restamp(7), restamp(8), restamp(9), toFormat11, toFormat12,
  restamp(12), restamp(13), restamp(14), restamp(15), restamp(16), restamp(17), restamp(18), toFormat20,
  restamp(20), restamp(21), restamp(22),
];
