// Which folder an agent works in (folder-mismatch task, U12, api.md 114-117): the only module that
// reads the `VB-Project` header and the only one that looks for a secret in other folders. A call
// whose header names a folder that is not the open one, or inside it (real paths), is refused with
// `wrong-folder` before anything is read or written; no header, nothing is checked. A secret this
// folder does not know is looked for in the recent folders' `agents.json` (hashes only), so an agent
// left behind by a switch is told where its work is instead of "join again"; one whose header names
// the open folder is told to join again here (field report batch 1, ruling 2).
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import { PROJECT_HEADER } from '#format';
import { openAgents } from './agents.ts';
import { displayName, isUnder, realPath } from './folders.ts';
import { DATA_DIR } from './ledger.ts';
import { REALM } from './callers.ts';
import type { ProblemError } from './problem.ts';
import { problem } from './problem.ts';
import { readRecent } from './recent.ts';
import { schemaProblems } from './schema.ts';
import * as httpWords from './words/http.ts';

const HEADER_SCHEMA = 'https://vision-board.invalid/schema/api/project.schema.json#/$defs/folderHeader';
const BAD_HEADER = httpWords.projectHeaderMustBeAbsolute;

/** What the check needs: the person's home folder and the open folder (both real paths). */
export interface FolderEnv { home: string; dir: string }

/** The refusal (ruling 1): names the open folder and the caller's, says not to join here. */
export const wrongFolder = ({ home, dir }: FolderEnv, theirs: string): ProblemError => problem('wrong-folder',
  httpWords.theBoardHasSwitchedTo(displayName(home, dir), displayName(home, theirs)));

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

/** The refusal for a secret this folder does not know but a recent folder's agents do: join again
 * when the caller's header named the open folder (`here`), else `wrong-folder`. */
export function secretElsewhere(env: FolderEnv, secret: string, here = false): ProblemError | undefined {
  for (const folder of readRecent(env.home)) {
    if (realPath(folder) === env.dir) continue;
    try {
      if (openAgents(path.join(folder, DATA_DIR)).find(secret, () => true)) return (here ? joinAgain : wrongFolder)(env, folder);
    } catch { /* gone or not a valid agents file: not this one */ }
  }
  return undefined;
}
