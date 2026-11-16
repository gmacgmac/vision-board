// The hand-written twin of the schema pieces for how a board looks (ledger v20, D-100, api.md 183-189): a node's
// `icon` (common.schema.json `iconName`) and `tone` (`tone`), a library icon's name and its drawing's hash (the
// `icon` line, `libraryIconName`, `iconHash`), a board's `skin` (`skin`) and a flow's `direction` (`direction`).
// ledger-shape.ts and validate.ts call these, as they call app-shape.ts, so the schema and the hand checks give one
// verdict.
import { APP_HASH_PATTERN } from './apps.ts';
import { DIRECTIONS, isIconName, isLibraryIcon, isTone, SKINS, TONES } from './view.ts';
import * as formatLedgerWords from './words/format-ledger.ts';

/** A node's icon: a built-in name or a library name (api.md 184). */
export function iconProblems(v: unknown, f: string, p: string[]): void {
  if (!isIconName(v)) p.push(formatLedgerWords.iconName(f));
}

/** A name of the project's icon library, as an `icon` line names it (api.md 185). */
export function libraryIconProblems(v: unknown, f: string, p: string[]): void {
  if (typeof v !== 'string' || !isLibraryIcon(v)) p.push(formatLedgerWords.libraryIconName(f));
}

/** A drawing's hash: the SHA-256 of its file, in lowercase hex, in the form an app's has (api.md 185). */
export function iconHashProblems(v: unknown, f: string, p: string[]): void {
  if (typeof v !== 'string' || !APP_HASH_PATTERN.test(v)) p.push(formatLedgerWords.iconHash(f));
}

/** A node's tone: a palette name, or a whole OKLCH hue angle from 0 to 359; 360, a fraction or a number written as
 * text is refused, so each colour has one spelling (api.md 184). */
export function toneProblems(v: unknown, f: string, p: string[]): void {
  if (!isTone(v)) p.push(formatLedgerWords.toneOneOf(f, TONES.join(', ')));
}

/** A board's skin (api.md 183). */
export function skinProblems(v: unknown, f: string, p: string[]): void {
  if (!(SKINS as readonly unknown[]).includes(v)) p.push(formatLedgerWords.oneOf(f, SKINS.join(', ')));
}

/** A container's flow direction, as the agent sets it (api.md 189). */
export function directionProblems(v: unknown, f: string, p: string[]): void {
  if (!(DIRECTIONS as readonly unknown[]).includes(v)) p.push(formatLedgerWords.oneOf(f, DIRECTIONS.join(', ')));
}
