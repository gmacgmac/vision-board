// One chat session's approvals (chat-panel PLAN ruling 5, BE_03 ruling 4, api.md 100), after
// nclite's askAboutFolder: the gate's facts become a pending approval and an `approval_request`
// event; the person's answer, the time limit (silence is a denial: `expired`), or a Stop or a new
// message (`released`) settles it, once, as an `approval_result` event, and the gate is told the
// outcome. A yes for the `session` is kept for that kind of change (a file write, or a command)
// for the rest of the session, and answers later asks at once without asking (`asked: false`).
import { randomBytes } from 'node:crypto';
import type { ApprovalAnswer, ApprovalOutcome, ApprovalStatus, Facts } from '../../../packages/agent/src/index.ts';
import { problem } from './problem.ts';

/** How long the person has to answer (BE_03 ruling 4). */
export const APPROVAL_TTL_MS = 120_000;

export type ApprovalDraft =
  | { kind: 'approval_request'; approvalId: string; facts: Facts; expiresAt: string }
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

interface Pending { kind: Facts['kind']; timer: NodeJS.Timeout; resolve: (o: ApprovalOutcome) => void }

/** `emit` stamps and sends a draft, and returns the event. */
export function createApprovals<E>(emit: (draft: ApprovalDraft) => E, ttlMs = APPROVAL_TTL_MS): Approvals<E> {
  const pending = new Map<string, Pending>();
  const settled = new Map<string, ApprovalStatus>();
  const kept = new Set<Facts['kind']>();

  function settle(id: string, status: ApprovalStatus, scope?: 'once' | 'session'): E {
    const p = pending.get(id)!;
    pending.delete(id);
    clearTimeout(p.timer);
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
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();
      return new Promise((resolve) => {
        const timer = setTimeout(() => settle(approvalId, 'expired'), ttlMs);
        pending.set(approvalId, { kind: facts.kind, timer, resolve });
        emit({ kind: 'approval_request', approvalId, facts, expiresAt });
        signal?.addEventListener('abort', () => { if (pending.has(approvalId)) settle(approvalId, 'released'); }, { once: true });
      });
    },
    answer(approvalId, answer) {
      if (pending.has(approvalId)) return settle(approvalId, answer.approved ? 'approved' : 'denied', answer.scope);
      const status = settled.get(approvalId);
      if (status) throw problem('conflict', `This approval is already settled (${status}); the first answer stands.`);
      throw problem('not-found', `There is no approval "${approvalId}" in this session.`);
    },
    release() {
      for (const id of [...pending.keys()]) settle(id, 'released');
    },
  };
}
