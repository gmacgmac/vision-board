// The person's side of agent access as page actions (agentAccess flag, D-027, D-034): Allow or
// Refuse a grant request, and Remove access to a container or the board, each sent through the
// controller's one act path. The words and acts themselves are plain data in access.ts. Split out
// of controller.ts (N12_FE_01).
import type { ActFields, BoardData } from '../io.ts';
import { allowAllWords, answerAct, answerWords, revokeAct, revokeWords } from './access.ts';
import type { ConfirmAsk } from '../host.ts';
import type { Status } from '../status.ts';

export interface AccessDeps {
  stage: HTMLElement;
  data(): BoardData;
  /** Send one act; true when it was recorded (and drawn). */
  record(fields: ActFields): Promise<boolean>;
  status: Status;
  confirm(ask: ConfirmAsk): Promise<boolean>;
  notify(text: string): void;
}

export interface AccessFlow {
  answer(request: number, answer: 'grant' | 'deny', text?: string): Promise<boolean>;
  /** Allow every request in `requests` (one bot's), one `grant` each, stopping at the first that is
   * not recorded; one toast for those that were. True when all were. */
  answerAll(requests: readonly number[]): Promise<boolean>;
  /** Remove `holder` from the container in `region`, or with none from the board. */
  revoke(region: string | undefined, holder: string): Promise<void>;
}

export function createAccessFlow(d: AccessDeps): AccessFlow {
  return {
    async answer(request, a, text) {
      const row = d.status.now.requests.find((r) => r.seq === request);
      if (!(await d.record(answerAct(request, a, text)))) return false;
      d.notify(answerWords(row, a));
      return true;
    },
    async answerAll(requests) {
      const rows = d.status.now.requests.filter((r) => requests.includes(r.seq));
      const done: typeof rows = [];
      for (const row of rows) {
        if (!(await d.record(answerAct(row.seq, 'grant')))) break;
        done.push(row);
      }
      if (done.length) d.notify(allowAllWords(done));
      return done.length === rows.length;
    },
    async revoke(region, holder) {
      const words = revokeWords(d.data(), region, holder);
      if (!(await d.confirm({ heading: words.heading, body: words.body, confirm: words.confirm }))) return;
      if (!(await d.record(revokeAct(region, holder)))) return;
      d.notify(words.done);
      // The holder's button is gone; keep keyboard focus on the board.
      if (!document.activeElement || document.activeElement === document.body) d.stage.focus({ preventScroll: true });
    },
  };
}
