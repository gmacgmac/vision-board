// Approval card pattern, layer 1 (core): what a card asking to change a file or run a command says
// (PLAN ruling 5; nclite's ApprovalAsk is the reference). The facts as facts, never a sentence the
// agent wrote: the kind of change, the path or the command exactly, a preview, the risks and the
// paths a command names. Three answers, Deny last; once settled, one line saying how. No DOM.
import type { ApprovalAnswer, Facts, WriteOp } from '../events.ts';
import type { ApprovalEntry, Settled } from '../feed/feed-core.ts';

export type ChoiceId = 'once' | 'session' | 'deny';
export interface ApprovalChoice { id: ChoiceId; label: string; answer: ApprovalAnswer; primary?: true }

/** The answers, in their order on the card: the allows first, Deny alone at the end. */
export const APPROVAL_CHOICES: readonly ApprovalChoice[] = [
  { id: 'once', label: 'Allow once', answer: { approved: true, scope: 'once' }, primary: true },
  { id: 'session', label: 'Allow for this session', answer: { approved: true, scope: 'session' } },
  { id: 'deny', label: 'Deny', answer: { approved: false } },
];

/** `open`: waiting for an answer. `settled`: answered (or lapsed, or released). `closed`: the turn
 *  ended before any result reached the feed. `expired`: the time ran out on this page's clock. */
export type ApprovalPhase = 'open' | 'settled' | 'closed' | 'expired';
export type OutcomeTone = 'ok' | 'danger' | 'quiet';

export interface ApprovalView {
  /** The band's word for the kind of change, and the question in a few words. */
  family: string;
  title: string;
  /** The path or the command, exactly. */
  subject: string;
  preview?: string;
  risks: readonly string[];
  paths: readonly string[];
  phase: ApprovalPhase;
  outcome?: { text: string; tone: OutcomeTone };
}

const WRITE_TITLE: Record<WriteOp, string> = {
  create: 'Create a file', replace: 'Overwrite a file', edit: 'Edit a file', append: 'Add to the end of a file',
};

function factsView(f: Facts): Pick<ApprovalView, 'family' | 'title' | 'subject' | 'preview' | 'risks' | 'paths'> {
  if (f.kind === 'write') {
    return { family: 'File change', title: WRITE_TITLE[f.op], subject: f.path, ...(f.preview && { preview: f.preview }), risks: [], paths: [] };
  }
  return { family: 'Shell command', title: 'Run a command', subject: f.command, risks: f.risks, paths: f.paths };
}

/** The line a settled card shows in place of its buttons. */
export function outcomeOf(r: Settled): { text: string; tone: OutcomeTone } {
  switch (r.status) {
    case 'approved': return { text: r.scope === 'session' ? 'Allowed for this session' : 'Allowed once', tone: 'ok' };
    case 'denied': return { text: 'Denied', tone: 'danger' };
    case 'expired': return { text: 'No answer in time, so denied', tone: 'danger' };
    case 'released': return { text: 'Not needed: the turn was stopped or a new message sent', tone: 'quiet' };
  }
}

/** Milliseconds until `expiresAt`, never below 0. */
export const msLeft = (expiresAt: string, now: number): number => Math.max(0, Date.parse(expiresAt) - now);

/** "1:52 left", or "Expired". */
export function timeLeft(expiresAt: string, now: number): string {
  const s = Math.ceil(msLeft(expiresAt, now) / 1000);
  return s === 0 ? 'Expired' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`;
}

/** The card for one approval entry; `open` when the feed still waits on it (ChatState.pending). */
export function approvalView(e: ApprovalEntry, open: boolean, now: number): ApprovalView {
  const base = factsView(e.facts);
  if (e.result) return { ...base, phase: 'settled', outcome: outcomeOf(e.result) };
  if (!open) return { ...base, phase: 'closed', outcome: { text: 'No longer waiting: the turn ended', tone: 'quiet' } };
  if (msLeft(e.expiresAt, now) === 0) return { ...base, phase: 'expired', outcome: { text: 'No answer in time, so denied', tone: 'danger' } };
  return { ...base, phase: 'open' };
}
