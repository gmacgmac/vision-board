// The person's side of agent access as page actions (agentAccess flag, D-027): Allow or Refuse a
// grant request, and Remove access, each sent through the controller's one act path. The words and
// acts themselves are plain data in access.ts. Split out of controller.ts (N12_FE_01).
import type { ActFields, BoardData } from './io.ts';
import { answerAct, answerWords, revokeAct, revokeWords } from './access.ts';
import { askConfirm, shell, toast } from '../shell/shell.svelte.ts';

export interface AccessDeps {
  stage: HTMLElement;
  data(): BoardData;
  /** Send one act; true when it was recorded (and drawn). */
  record(fields: ActFields): Promise<boolean>;
}

export interface AccessFlow {
  answer(request: number, answer: 'grant' | 'deny', text?: string): Promise<boolean>;
  revoke(region: string, holder: string): Promise<void>;
}

export function createAccessFlow(d: AccessDeps): AccessFlow {
  return {
    async answer(request, a, text) {
      const row = shell.requests.find((r) => r.seq === request);
      if (!(await d.record(answerAct(request, a, text)))) return false;
      toast(answerWords(row, a));
      return true;
    },
    async revoke(region, holder) {
      const words = revokeWords(d.data(), region, holder);
      if (!(await askConfirm(words.heading, words.body, words.confirm))) return;
      if (!(await d.record(revokeAct(region, holder)))) return;
      toast(words.done);
      // The holder's button is gone; keep keyboard focus on the board.
      if (!document.activeElement || document.activeElement === document.body) d.stage.focus({ preventScroll: true });
    },
  };
}
