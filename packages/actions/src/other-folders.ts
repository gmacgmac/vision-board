// Agents from other folders (ledger v23, api.md 215, D-120): the person lets agents working in another folder call this
// ledger's board with `folders-allow`, and stops that with `folders-revoke`. The fold keeps the `seq` of the allow while
// it stands and nothing else: like an app's allow it is on no board and no card, so it moves no head, answers nothing and
// no board's lock holds it (lock.ts `passesLock`). The standalone server's folder check reads it (`otherFoldersIn`);
// every other guard stays: the board grant before a write, the other-ledger refusal, the reads' `project`. Pure.
import type { ActEvent } from '#format';
import type { LedgerState } from './fold.ts';
import * as actionsRefusalsWords from './words/actions-refusals.ts';

/** What the fold keeps: the `seq` of the person's `folders-allow` while it stands. */
export interface OtherFolders { otherFolders?: number | undefined }

/** Fold one `folders-allow` or `folders-revoke`. */
export function foldOtherFolders(s: OtherFolders, e: ActEvent): void {
  s.otherFolders = e.action === 'folders-allow' ? e.seq : undefined; // left out until the first, as off
}

/** Whether agents from other folders are let in now. */
export const otherFoldersIn = (s: OtherFolders): boolean => s.otherFolders !== undefined;

/** An allow while they are not let in; a stop while they are. */
export function otherFoldersRules(e: ActEvent, s: LedgerState, p: string[]): void {
  const on = otherFoldersIn(s);
  if (on === (e.action === 'folders-allow')) p.push(actionsRefusalsWords.otherFoldersAre(on));
}
