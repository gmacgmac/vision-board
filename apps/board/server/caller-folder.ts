// Which folder an agent works in (folder-mismatch task, U12, api.md 114-117): the only module that
// reads the `VB-Project` header and the only one that looks for a secret in other folders. A call
// whose header names a folder that is not the open one, or inside it (real paths), is refused with
// `wrong-folder` before anything is read or written; no header, nothing is checked. A secret this
// folder does not know is looked for in the recent folders' `agents.json` (hashes only), so an agent
// left behind by a switch is told where its work is instead of "join again"; one whose header names
// the open folder is told to join again here (field report batch 1, ruling 2). Agents are per ledger
// (D-084 3): every ledger of each folder is looked in, in either layout (`ledgers.ts`), and a secret
// from another ledger of the open folder is `wrong-folder` naming both ledgers (api.md 115a).
import type { IncomingMessage } from 'node:http';
import { PROJECT_HEADER, ledgerFolder } from '#format';
import { isOldLayout, listLedgers } from './ledgers.ts';
import { openAgents } from './agents.ts';
import { displayName, isUnder, realPath } from './folders.ts';
import { REALM } from './callers.ts';
import type { ProblemError } from './problem.ts';
import { problem } from './problem.ts';
import { readRecent } from './recent.ts';
import { schemaProblems } from './schema.ts';
import * as httpWords from './words/http.ts';

const HEADER_SCHEMA = 'https://vision-board.invalid/schema/api/project.schema.json#/$defs/folderHeader';
const BAD_HEADER = httpWords.projectHeaderMustBeAbsolute;

/** What the check needs: the person's home folder, the open folder (both real paths) and the open
 * ledger's name (none in the old layout). */
export interface FolderEnv { home: string; dir: string; ledger?: string | undefined }

/** The refusal (ruling 1): names the open folder and the caller's, says not to join here. */
export const wrongFolder = ({ home, dir }: FolderEnv, theirs: string): ProblemError => problem('wrong-folder',
  httpWords.theBoardHasSwitchedTo(displayName(home, dir), displayName(home, theirs)));

/** The refusal for an agent whose secret is from ledger `theirs` of the open folder (D-084 3): it names
 * the folder and both ledgers, and says to stop and tell the person. */
export const wrongLedger = ({ home, dir, ledger }: FolderEnv, theirs: string): ProblemError => problem('wrong-folder',
  httpWords.theBoardHasLedgerOpen(displayName(home, dir), ledger ?? '', theirs));

/** The refusal for an agent working in the open folder whose secret is from `theirs`, a folder it
 * joined earlier (ruling 2): its folder is open now, so it joins again here. */
export const joinAgain = ({ home, dir }: FolderEnv, theirs: string): ProblemError => problem('not-authenticated',
  httpWords.thisBoardNowHasYour(displayName(home, dir), displayName(home, theirs)), { headers: REALM });

/** The folder the `VB-Project` header names, decoded; undefined when there is none. */
export function headerFolder(req: IncomingMessage): string | undefined {
  const raw = req.headers[PROJECT_HEADER.toLowerCase()];
  if (raw === undefined) return undefined;
  if (Array.isArray(raw) || schemaProblems(HEADER_SCHEMA, raw).length) throw problem('bad-request', BAD_HEADER);
  try { return decodeURIComponent(raw); } catch { throw problem('bad-request', BAD_HEADER); }
}

/** Refuse an agent call whose header names a folder other than the open one or one inside it;
 * true when the header names the open folder (or one inside it), false with no header. */
export function checkFolder(req: IncomingMessage, env: FolderEnv): boolean {
  const theirs = headerFolder(req);
  if (theirs === undefined) return false;
  const dir = realPath(theirs);
  if (!isUnder(env.dir, dir)) throw wrongFolder(env, dir);
  return true;
}

/** The ledger folders of project `dir` in either layout: the old layout's, then each named one's. */
const ledgerDirs = (dir: string): string[] =>
  [...(isOldLayout(dir) ? [ledgerFolder(dir)] : []), ...listLedgers(dir).map((name) => ledgerFolder(dir, name))];

/** Ledger folder `dir`'s agents know `secret` (hashes only, read, never written). */
function knows(dir: string, secret: string): boolean {
  try { return openAgents(dir).find(secret, () => true) !== undefined; } catch { return false; /* gone or not a valid agents file */ }
}

/** The refusal for a secret the open ledger does not know but another's agents do: another ledger of
 * the open folder, `wrong-folder` naming both ledgers; a ledger of a recent folder, join again when the
 * caller's header named the open folder (`here`), else `wrong-folder`. */
export function secretElsewhere(env: FolderEnv, secret: string, here = false): ProblemError | undefined {
  const { ledger } = env;
  const sibling = ledger === undefined ? undefined : listLedgers(env.dir).find((name) => name !== ledger && knows(ledgerFolder(env.dir, name), secret));
  if (sibling !== undefined) return wrongLedger(env, sibling);
  for (const folder of readRecent(env.home)) {
    if (realPath(folder) === env.dir) continue;
    if (ledgerDirs(folder).some((dir) => knows(dir, secret))) return (here ? joinAgain : wrongFolder)(env, folder);
  }
  return undefined;
}
