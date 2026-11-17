// Ask now's side of the board (nodeEdges flag, D-099 3, FE_03), split out of controller.ts: why no message can go
// (a past version, a read-only ledger, a locked board, the chat's agent mid-turn), whether an agent is there to hear
// it, the `ask` itself with the page's context setting (`askContextOf`, call 1), the notes it sent, and a node's replies
// marked read when its box shows them (a card `seen` at the version already seen, which moves only when the person last looked).
import type { AskContext } from '#format';
import type { LedgerState } from '#actions';
import { seenDue, seenVer } from '#actions';
import type { BoxDeps } from '../notes/index.ts';
import * as notesWords from '../words/notes.ts';

export interface AskNowDeps {
  state(): LedgerState | null;
  board(): string;
  /** The node's board number and the version drawn. */
  node(id: string): { n: number; ver: number } | undefined;
  /** Why nothing can be written now (a past version, a read-only ledger, a locked board); null when it can. */
  paused(): string | null;
  /** The chat's agent is mid-turn (the host's `ChatStatus.now`). */
  working(): boolean;
  /** The engine takes every agent as the folder's one bot (`singleAgent`): there is always one to hear. */
  oneAgent(): boolean;
  context(): AskContext;
  attempt(fields: { action: 'ask'; board: string; lines: number[]; context: AskContext }): Promise<string | null>;
  seen(marks: readonly { n: number; ver: number }[]): Promise<boolean>;
}

export function createAskNow(d: AskNowDeps): BoxDeps {
  const looking = new Set<string>();
  return {
    blocked: () => d.paused() ?? (d.working() ? notesWords.theAgentIsWorking : null),
    listening: () => d.oneAgent() || (d.state()?.agents.size ?? 0) > 0,
    ask: (seq) => d.attempt({ action: 'ask', board: d.board(), lines: [seq], context: d.context() }),
    asked: () => new Set(d.state()?.asked.get(d.board())?.keys() ?? []),
    looked(id) {
      const s = d.state();
      const at = d.node(id);
      if (!s || !at || d.paused() || looking.has(id)) return;
      // At the version already seen, so the card's updates stay as they were; a card never seen is seen as drawn.
      const ver = seenVer(s, d.board(), at.n) || at.ver;
      if (!seenDue(s, d.board(), at.n, ver)) return;
      looking.add(id);
      void d.seen([{ n: at.n, ver }]).finally(() => looking.delete(id));
    },
  };
}
