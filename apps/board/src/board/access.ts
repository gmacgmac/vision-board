// The person's side of agent access on the page (agentAccess flag, D-027, D-034, api.md 16, 23-26,
// 81-86): the rows the requests strip shows, the holders the toolbar lists for the board and each
// frame shows for its container, and the acts Allow, Refuse, Remove access and Send send. Plain data in, plain data out; the controller sends the acts
// through the one act path, so the server's checks (validateAct) judge every one.
import type { View } from '#format';
import type { AccessHolder } from '#actions';
import type { ActFields, BoardData } from './io.ts';
import * as accessWords from './words/access.ts';
import * as commonWords from './words/common.ts';

/** One open grant request as the strip shows it (agentAccess flag): `container` is the region's
 * title, left out for a request for the whole board (D-034); `label` the asking agent's. */
export interface AccessRequestRow { seq: number; label: string; container?: string; reason: string }

/** What a request with no label (an agent that never said who it is) is called. */
const UNNAMED = accessWords.anAgent;

const titleOf = (view: View, region: string) => view.regions.find((r) => r.id === region)?.title ?? region;

/** The open requests, oldest first, with the container's title (none for a request for the whole
 * board) and the agent's label. */
export function requestRows(data: BoardData): AccessRequestRow[] {
  return (data.access.requests ?? []).map((r) => ({
    seq: r.seq, label: r.label ?? UNNAMED, reason: r.reason,
    ...(r.region !== undefined && { container: titleOf(data.view, r.region) }),
  }));
}

/** What a request asks, after the agent's label (the strip's row and its announcement). */
export const askWords = (row: AccessRequestRow): string =>
  row.container === undefined ? accessWords.wantsToDrawOnThis : accessWords.asksToWriteIn(row.container);

/** Region id -> its holders; empty when the board has none. */
export const holdersOf = (data: BoardData): Readonly<Record<string, AccessHolder[]>> => data.access.holders ?? {};

/** The board's own holders, creator first; empty when it has none (a board drawn before agents). */
export const boardHoldersOf = (data: BoardData): AccessHolder[] => data.access.boardHolders ?? [];

/** Allow or Refuse one request; a refusal's note is optional (api.md 16). */
export const answerAct = (request: number, answer: 'grant' | 'deny', text?: string): ActFields =>
  ({ action: answer, request, ...(answer === 'deny' && text?.trim() && { text: text.trim() }) });

/** Remove one holder from one container, or with no `region` from the board; io.ts adds the board. */
export const revokeAct = (region: string | undefined, holder: string): ActFields =>
  ({ action: 'revoke', ...(region !== undefined && { region }), holder });

/** The confirm step's words for Remove access, and the toast after it. */
export function revokeWords(data: BoardData, region: string | undefined, holder: string) {
  const list = region === undefined ? boardHoldersOf(data) : holdersOf(data)[region];
  const label = list?.find((h) => h.agent === holder)?.label ?? UNNAMED;
  const where = region === undefined ? accessWords.drawOnThisBoard : accessWords.writeIn(titleOf(data.view, region));
  return {
    heading: accessWords.removeSAccess(label),
    body: accessWords.willNoLongerBeAble(label, where),
    confirm: commonWords.removeAccess,
    done: accessWords.canNoLonger(label, where),
  };
}

/** The toast after Allow or Refuse. */
export function answerWords(row: AccessRequestRow | undefined, answer: 'grant' | 'deny'): string {
  const who = row?.label ?? UNNAMED;
  if (answer === 'deny') return accessWords.refused(who);
  return row && row.container === undefined ? accessWords.canNowDrawOnThis(who) : accessWords.canNowWriteIn(who, row?.container ?? accessWords.theContainer);
}
