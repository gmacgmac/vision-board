// Small chat event builders for the package's own tests: stamped events in the schema's shapes.
// The recorded Claude turns drive the reducer in apps/board/tests/chat-feed-fixture.test.ts, since
// this package may not read packages/agent (D-037).
import type { ChatEvent, Facts } from '../src/index.ts';

export const SESSION = '3f1c2a9e-5b7d-4e21-9a0c-6d8e2f4b1a37';

type Unstamped<E> = E extends ChatEvent ? Omit<E, 'at' | 'session' | 'seq'> : never;
export type Draft = Unstamped<ChatEvent>;

/** The drafts stamped in order from `from` (1 by default), one second apart. */
export function stamp(drafts: Draft[], from = 1, session = SESSION): ChatEvent[] {
  return drafts.map((d, i) => ({ ...d, at: `2026-10-08T09:00:${String(i % 60).padStart(2, '0')}Z`, session, seq: from + i }) as ChatEvent);
}

export const WRITE: Facts = { kind: 'write', op: 'edit', path: '/home/someone/project/notes.md', preview: '- old line\n+ new line' };
export const COMMAND: Facts = { kind: 'command', command: 'rm -rf build', risks: ['rm-recursive'], paths: ['build'] };

/** One whole turn: the person asks, a tool runs, the agent draws, answers and the turn ends. */
export const TURN: Draft[] = [
  { kind: 'message_in', text: 'Draw the two options.', chips: [{ kind: 'card', ref: 4, label: 'Pricing tiers' }] },
  { kind: 'tool_activity', call: 't1', tool: 'Read', state: 'running' },
  { kind: 'tool_activity', call: 't1', tool: 'Read', state: 'done' },
  { kind: 'message_out', text: 'Looking at the board first.', interim: true },
  { kind: 'tool_activity', call: 't2', tool: 'write_board', state: 'running', board: 'pricing' },
  { kind: 'tool_activity', call: 't2', tool: 'write_board', state: 'done', board: 'pricing', cards: [5, 6], head: 12 },
  { kind: 'message_out', text: 'I drew **two** options.' },
  { kind: 'system', text: 'Done.', turn: 'done' },
];
