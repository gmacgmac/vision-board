// One chat session's approvals (chat-panel PLAN ruling 5, BE_03 ruling 4, api.md 100, 107; D-066), after
// nclite's askAboutFolder. The access rules decide first, every time (`policy`, packages/agent; the
// server is the authority, whatever the gate decided): a refused call is denied and an allowed one
// approved, neither asked (`asked: false`), whatever was answered before. What they ask about is then
// answered by a kept yes when one covers it (`coverOf`: a write's folder, a read's file, a search's
// folder, a command's first words; for the `session`, or for the `folder` from `chat-permissions.ts`),
// and else becomes a pending
// approval and an `approval_request` event with the scopes its yes may have (`folder` only inside the
// board's folder; `once` only for a call that can't be remembered). The person's answer, the time limit
// (silence is a denial: `expired`), or a Stop or a new message (`released`) settles it, once, as an
// `approval_result` event, and the gate is told the outcome. With no time limit (`ttlMs` null, the
// approvalHold flag, PLAN ruling 335) a question waits until the person answers, Stops or sends a new
// message; the request then carries no `expiresAt`.
import { randomBytes } from 'node:crypto';
import type { ApprovalAnswer, ApprovalOutcome, ApprovalStatus, AskScope, Cover, Facts, PathReader } from '#agent';
import { coverOf, policy } from '#agent';
import type { Permissions } from './chat-permissions.ts';
import { problem } from './problem.ts';
import * as serverChatWords from './words/server-chat.ts';

/** How long the person has to answer (BE_03 ruling 4). */
export const APPROVAL_TTL_MS = 120_000;

export type ApprovalDraft =
  | { kind: 'approval_request'; approvalId: string; facts: Facts; expiresAt?: string; scopes: AskScope[] }
  | { kind: 'approval_result'; approvalId: string; approved: boolean; status: ApprovalStatus; scope?: AskScope };

export interface Approvals<E> {
  /** Decide by the access rules, then a kept yes, else ask the person and wait until it is settled.
   * An abort (the gate went away) releases it. */
  ask(facts: Facts, signal?: AbortSignal): Promise<ApprovalOutcome>;
  /** The person's answer: the `approval_result` event. Unknown: `not-found`; settled: `conflict`; a
   * scope the request did not offer: `invalid`. */
  answer(approvalId: string, answer: ApprovalAnswer): E;
  /** Settle every pending approval as `released` (a Stop, a new message, the session ending). */
  release(): void;
}

export interface ApprovalOptions {
  /** The board's folder: the agent's working folder, which the access rules are relative to. */
  folder: string;
  /** How long a question waits, or `null` for as long as the person takes. */
  ttlMs?: number | null | undefined;
  /** `true` when the first question opens and `false` when the last one settles, however it does (the
   * session tells the agent to hold its turn clock). */
  onWait?: ((waiting: boolean) => void) | undefined;
  /** The `agentAccessRules` flag off: nothing goes ahead unasked, nothing is kept for the folder. */
  strict?: boolean | undefined;
  /** The folder's kept yeses; without them `folder` is never offered. */
  kept?: Permissions | undefined;
  /** The disk as the rules see it (tests). */
  reader?: PathReader | undefined;
}

interface Pending { cover: Cover | null; scopes: AskScope[]; timer: NodeJS.Timeout | undefined; resolve: (o: ApprovalOutcome) => void }

const keyOf = (c: Cover) => (c.kind === 'command' ? `command\0${c.head}` : `${c.kind}\0${c.path}`);

/** `emit` stamps and sends a draft, and returns the event. */
export function createApprovals<E>(emit: (draft: ApprovalDraft) => E, options: ApprovalOptions): Approvals<E> {
  const { folder, ttlMs = APPROVAL_TTL_MS, onWait, strict = false, kept, reader } = options;
  const pending = new Map<string, Pending>();
  const settled = new Map<string, ApprovalStatus>();
  /** The covers of yeses for the session. */
  const session = new Set<string>();
  const decided = (o: ApprovalOutcome) => Promise.resolve({ ...o, asked: false as const });

  function settle(id: string, status: ApprovalStatus, scope?: AskScope): E {
    const p = pending.get(id)!;
    pending.delete(id);
    clearTimeout(p.timer);
    if (pending.size === 0) onWait?.(false);
    settled.set(id, status);
    const approved = status === 'approved';
    if (approved && p.cover && scope === 'session') session.add(keyOf(p.cover));
    if (approved && p.cover && scope === 'folder') kept?.add(p.cover);
    const how = approved ? { scope: scope ?? 'once' } : {};
    const event = emit({ kind: 'approval_result', approvalId: id, approved, status, ...how });
    p.resolve({ approved, status, approvalId: id, ...how });
    return event;
  }

  return {
    ask(facts, signal) {
      // A command's words are judged from the shell's folder, which the gate's facts carry when it is not the board's.
      const at = { ...(reader && { reader }), ...(facts.kind === 'command' && facts.cwd !== undefined && { cwd: facts.cwd }) };
      let rules = policy(facts, folder, { strict, ...at });
      // What the gate asked about, the server never lets through unasked (VERIFY_01 F4).
      if (facts.kind === 'command' && 'allow' in rules) rules = policy(facts, folder, { strict: true, ...at });
      if ('refuse' in rules) return decided({ approved: false, status: 'denied' });
      if ('allow' in rules) return decided({ approved: true, status: 'approved' });
      const cover = coverOf(facts, folder, reader);
      const scopes = cover === null ? ['once' as const] : rules.scopes.filter((sc) => sc !== 'folder' || kept);
      if (cover && scopes.includes('session') && session.has(keyOf(cover))) return decided({ approved: true, status: 'approved', scope: 'session' });
      if (cover && scopes.includes('folder') && kept?.covers(cover)) return decided({ approved: true, status: 'approved', scope: 'folder' });
      const approvalId = `ap-${randomBytes(6).toString('hex')}`;
      return new Promise((resolve) => {
        const timer = ttlMs === null ? undefined : setTimeout(() => settle(approvalId, 'expired'), ttlMs);
        if (pending.size === 0) onWait?.(true);
        pending.set(approvalId, { cover, scopes, timer, resolve });
        emit({ kind: 'approval_request', approvalId, facts, ...(ttlMs !== null && { expiresAt: new Date(Date.now() + ttlMs).toISOString() }), scopes });
        signal?.addEventListener('abort', () => { if (pending.has(approvalId)) settle(approvalId, 'released'); }, { once: true });
      });
    },
    answer(approvalId, answer) {
      const p = pending.get(approvalId);
      if (p && answer.approved && answer.scope && !p.scopes.includes(answer.scope)) {
        const detail = serverChatWords.thisApprovalDoesNotOffer(answer.scope, p.scopes.join(', '));
        throw problem('invalid', detail, { errors: [{ pointer: '/scope', detail }] });
      }
      if (p) return settle(approvalId, answer.approved ? 'approved' : 'denied', answer.scope);
      const status = settled.get(approvalId);
      if (status) throw problem('conflict', serverChatWords.thisApprovalIsAlreadySettled(status));
      throw problem('not-found', serverChatWords.thereIsNoApprovalIn(approvalId));
    },
    release() {
      for (const id of [...pending.keys()]) settle(id, 'released');
    },
  };
}
