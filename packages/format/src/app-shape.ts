// The hand-written twin of the app card's schema pieces (ledger v17, api.md 150, D-047): the `app`
// of an app card (common.schema.json `appRef`), the rule that an app card names its app and no other
// card does (node.schema.json `appRule`), and what an app act names (act.schema.json `rules`).
// ledger-shape.ts and validate.ts call these, so the schema and the hand checks give one verdict.
import { APP_HASH_PATTERN, APP_SIZE } from './apps.ts';
import { APP_ACTIONS } from './ledger.ts';
import type { ActionId } from './ledger.ts';
import { ID_PATTERN } from './view.ts';
import * as formatCommonWords from './words/format-common.ts';
import * as formatLedgerWords from './words/format-ledger.ts';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Problems with an app card's `app`, named from `f` (`node.app`): its id, and a size in range. */
export function appRefProblems(v: unknown, f: string, p: string[]): void {
  if (!isRec(v)) return void p.push(formatCommonWords.mustBeAnObject(f));
  for (const k of Object.keys(v)) if (!['id', 'w', 'h'].includes(k)) p.push(formatLedgerWords.unknownField(f, k));
  if (typeof v.id !== 'string' || !ID_PATTERN.test(v.id)) p.push(`${f}.id: the app's id, its folder's name in .visionboard/apps/`);
  for (const d of ['w', 'h'] as const) {
    const x = v[d];
    const { min, max } = APP_SIZE[d];
    if (x !== undefined && (!Number.isInteger(x) || (x as number) < min || (x as number) > max)) p.push(formatLedgerWords.wholeNumberFromTo(f, d, min, max));
  }
}

/** An app card names its app and takes its size from it; no other card names one. `f` names the
 * node in messages (`node`, or a view's `nodes[3]`). */
export function appNodeRules(node: Rec, f: string, p: string[]): void {
  if (node.kind === 'app') {
    if (node.app === undefined) p.push(formatLedgerWords.appRequiredOnAnApp(f));
    if (node.size !== undefined) p.push(formatLedgerWords.sizeAnAppCardIs(f));
  } else if (node.app !== undefined) p.push(formatLedgerWords.appOnlyAnAppCard(f));
}

/** The SHA-256 of an app's code, in lowercase hex (`hash` on an `app-allow`). */
export function appHashProblems(v: unknown, f: string, p: string[]): void {
  if (typeof v !== 'string' || !APP_HASH_PATTERN.test(v)) p.push(formatLedgerWords.theAppSHash64(f));
}

/** An `app-allow` names its app and the hash it allows; an `app-revoke` its app; neither names
 * anything else (api.md 150). */
export function appActRules(e: Rec, p: string[]): void {
  const a = e.action as ActionId;
  if (!APP_ACTIONS.has(a)) return;
  if (e.app === undefined) p.push(formatLedgerWords.appRequiredTheIdOf(a === 'app-allow' ? 'allow' : 'stop'));
  if (a === 'app-allow' && e.hash === undefined) p.push(formatLedgerWords.hashRequiredTheVersionOf);
  if (a === 'app-revoke' && e.hash !== undefined) p.push(formatLedgerWords.hashAStopNamesThe);
  for (const k of ['n', 'ver', 'nodes', 'region', 'board']) if (e[k] !== undefined) p.push(formatLedgerWords.anNamesItsAppAnd(k, a));
}
