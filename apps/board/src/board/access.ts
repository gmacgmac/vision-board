// The person's side of agent access on the page (agentAccess flag, D-027, api.md 16, 23-26):
// the rows the requests strip shows, the holders each frame shows, and the acts Allow, Refuse,
// Remove access and Send send. Plain data in, plain data out; the controller sends the acts
// through the one act path, so the server's checks (validateAct) judge every one.
import type { View } from '../../../../packages/format/src/index.ts';
import type { AccessHolder } from '../../../../packages/actions/src/index.ts';
import type { AccessRequestRow } from '../shell/shell.svelte.ts';
import type { ActFields, BoardData } from './io.ts';

/** What a request with no label (an agent that never said who it is) is called. */
const UNNAMED = 'An agent';

const titleOf = (view: View, region: string) => view.regions.find((r) => r.id === region)?.title ?? region;

/** The open requests, oldest first, with the container's title and the agent's label. */
export function requestRows(data: BoardData): AccessRequestRow[] {
  return (data.access.requests ?? []).map((r) => ({
    seq: r.seq, label: r.label ?? UNNAMED, container: titleOf(data.view, r.region), reason: r.reason,
  }));
}

/** Region id -> its holders; empty when the board has none. */
export const holdersOf = (data: BoardData): Readonly<Record<string, AccessHolder[]>> => data.access.holders ?? {};

/** Allow or Refuse one request; a refusal's note is optional (api.md 16). */
export const answerAct = (request: number, answer: 'grant' | 'deny', text?: string): ActFields =>
  ({ action: answer, request, ...(answer === 'deny' && text?.trim() && { text: text.trim() }) });

/** Remove one holder from one container; io.ts adds the board. */
export const revokeAct = (region: string, holder: string): ActFields => ({ action: 'revoke', region, holder });

/** The confirm step's words for Remove access, and the toast after it. */
export function revokeWords(data: BoardData, region: string, holder: string) {
  const label = holdersOf(data)[region]?.find((h) => h.agent === holder)?.label ?? UNNAMED;
  const title = titleOf(data.view, region);
  return {
    heading: `Remove ${label}'s access?`,
    body: `${label} will no longer be able to write in ${title}. Its items stay on the board, and it can ask again.`,
    confirm: 'Remove access',
    done: `${label} can no longer write in ${title}`,
  };
}

/** The toast after Allow or Refuse. */
export function answerWords(row: AccessRequestRow | undefined, answer: 'grant' | 'deny'): string {
  const who = row?.label ?? UNNAMED;
  return answer === 'grant' ? `${who} can now write in ${row?.container ?? 'the container'}` : `Refused ${who}`;
}
