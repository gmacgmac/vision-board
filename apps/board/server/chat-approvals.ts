// One chat session's approvals (chat-panel PLAN ruling 5, BE_03 ruling 4, api.md 100), after
// nclite's askAboutFolder: the gate's facts become a pending approval and an `approval_request`
// event; the person's answer, the time limit (silence is a denial: `expired`), or a Stop or a new
// message (`released`) settles it, once, as an `approval_result` event, and the gate is told the
// outcome. With no time limit (`ttlMs` null, the approvalHold flag, PLAN ruling 335) a question waits
// until the person answers, Stops or sends a new message; the request then carries no `expiresAt`. A yes for the `session` is kept for that kind of change (a file write, or a command)
// for the rest of the session, and answers later asks at once without asking (`asked: false`).
import { randomBytes } from 'node:crypto';
import type { ApprovalAnswer, ApprovalOutcome, ApprovalStatus, Facts } from '#agent';
import { problem } from './problem.ts';
import * as serverChatWords from './words/server-chat.ts';

/** How long the person has to answer (BE_03 ruling 4). */
export const APPROVAL_TTL_MS = 120_000;

export type ApprovalDraft =
  | { kind: 'approval_request'; approvalId: string; facts: Facts; expiresAt?: string }
  | { kind: 'approval_result'; approvalId: string; approved: boolean; status: ApprovalStatus; scope?: 'once' | 'session' };

export interface Approvals<E> {
  /** Ask the person (or answer at once from a kept yes), and wait until it is settled. An abort
   * (the gate went away) releases it. */
  ask(facts: Facts, signal?: AbortSignal): Promise<ApprovalOutcome>;
  /** The person's answer: the `approval_result` event. Unknown: `not-found`; settled: `conflict`. */
  answer(approvalId: string, answer: ApprovalAnswer): E;
  /** Settle every pending approval as `released` (a Stop, a new message, the session ending). */
  release(): void;
}

interface Pending { kind: Facts['kind']; timer: NodeJS.Timeout | undefined; resolve: (o: ApprovalOutcome) => void }

/**
 * `emit` stamps and sends a draft, and returns the event. `ttlMs`: how long a question waits, or
 * `null` for as long as the person takes. `onWait(true)` when the first question opens and
 * `onWait(false)` when the last one settles, however it does (the session tells the agent to hold
 * its turn clock).
 */
export function createApprovals<E>(
  emit: (draft: ApprovalDraft) => E, ttlMs: number | null = APPROVAL_TTL_MS, onWait?: (waiting: boolean) => void,
): Approvals<E> {
  const pending = new Map<string, Pending>();
  const settled = new Map<string, ApprovalStatus>();
  const kept = new Set<Facts['kind']>();

  function settle(id: string, status: ApprovalStatus, scope?: 'once' | 'session'): E {
    const p = pending.get(id)!;
    pending.delete(id);
    clearTimeout(p.timer);
    if (pending.size === 0) onWait?.(false);
    settled.set(id, status);
    const approved = status === 'approved';
    if (approved && scope === 'session') kept.add(p.kind);
    const how = approved ? { scope: scope ?? 'once' } : {};
    const event = emit({ kind: 'approval_result', approvalId: id, approved, status, ...how });
    p.resolve({ approved, status, approvalId: id, ...how });
    return event;
  }

  return {
    ask(facts, signal) {
      if (kept.has(facts.kind)) return Promise.resolve({ approved: true, status: 'approved', scope: 'session', asked: false });
      const approvalId = `ap-${randomBytes(6).toString('hex')}`;
      return new Promise((resolve) => {
        const timer = ttlMs === null ? undefined : setTimeout(() => settle(approvalId, 'expired'), ttlMs);
        if (pending.size === 0) onWait?.(true);
        pending.set(approvalId, { kind: facts.kind, timer, resolve });
        emit({ kind: 'approval_request', approvalId, facts, ...(ttlMs !== null && { expiresAt: new Date(Date.now() + ttlMs).toISOString() }) });
        signal?.addEventListener('abort', () => { if (pending.has(approvalId)) settle(approvalId, 'released'); }, { once: true });
      });
    },
    answer(approvalId, answer) {
      if (pending.has(approvalId)) return settle(approvalId, answer.approved ? 'approved' : 'denied', answer.scope);
      const status = settled.get(approvalId);
      if (status) throw problem('conflict', serverChatWords.thisApprovalIsAlreadySettled(status));
      throw problem('not-found', serverChatWords.thereIsNoApprovalIn(approvalId));
    },
    release() {
      for (const id of [...pending.keys()]) settle(id, 'released');
    },
  };
}
