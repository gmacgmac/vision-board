// The transcript: what the person did on the board (sessions/<id>/transcript.jsonl).
// Append-only, one record per line. Records are written by the action layer only.
import type { Mode } from './view.ts';

export const ACTION_IDS = [
  'ack', 'drop', 'comment', 'context', 'later', 'reopen', 'pin', 'unpin', 'mode',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export interface TranscriptRecord {
  at: string;
  by: 'person' | 'agent';
  action: ActionId;
  /** The view version the person was looking at. */
  version: number;
  node?: string;
  text?: string;
  /** pin: region-local coordinates the person chose. */
  x?: number;
  y?: number;
  /** mode: the person's preferred layout for a region. */
  region?: string;
  mode?: Mode;
}
