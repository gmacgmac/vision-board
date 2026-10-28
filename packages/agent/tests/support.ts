// Test support: the recorded Claude streams (two real turns, scrubbed of ids, paths and secrets)
// and the fake CLI that replays them. Not a test itself (no .test.ts).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AgentUpdate } from '../src/index.ts';

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

/** Turn 1: draw two cards on a new board (ToolSearch, then one write_board). */
export const DRAW = here('./fixtures/claude-draw.jsonl');
/** Turn 2, resumed: a Write the gate refused. */
export const REFUSED = here('./fixtures/claude-refused.jsonl');
export const FAKE_CLAUDE = here('./fake-claude.ts');
/** One real Kiro turn (kiro-cli 2.28.0, ACP v2): two parallel tool calls, a board write and a file
 * create, both refused at the permission request; the agent's side of the stream, scrubbed. */
export const KIRO_DENIED = here('./fixtures/kiro-denied.jsonl');
/** One real Kiro turn (kiro-cli 2.28.0, ACP v2, FIX_01): a successful board write of a region and
 * one card, its result in the update's `rawOutput`; the agent's side, scrubbed. */
export const KIRO_DRAW = here('./fixtures/kiro-draw.jsonl');
export const FAKE_KIRO = here('./fake-kiro.ts');
export const SESSION = '3f1c2a9e-5b7d-4e21-9a0c-6d8e2f4b1a37';

export const events = (file: string): unknown[] => readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

export async function collect(updates: AsyncIterable<AgentUpdate>): Promise<AgentUpdate[]> {
  const out: AgentUpdate[] = [];
  for await (const u of updates) out.push(u);
  return out;
}

/** A real board folder on disk for the access rules (symlinks, a hard link, a folder outside it). */
export { accessFixture } from './access-fixture.ts';
export type { AccessFixture } from './access-fixture.ts';
