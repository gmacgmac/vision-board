// The browser's one I/O module (project rule 7): the only code that calls the server.
import type { View } from '/pkg/format/src/index.ts';
import type { TranscriptRecord } from '/pkg/format/src/index.ts';

export interface SessionSummary { id: string; title: string; versions: number[] }
export interface SessionData { versions: number[]; view: View; transcript: TranscriptRecord[] }
export type RecordFields = Omit<TranscriptRecord, 'at' | 'by' | 'version'>;

export class ApiError extends Error {
  problems: string[];
  constructor(message: string, problems: string[] = []) {
    super(message);
    this.problems = problems;
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('The board server is not reachable. Is it running?');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, body.problems ?? []);
  return body as T;
}

export const listSessions = () => call<SessionSummary[]>('/api/sessions');

export const loadSession = (id: string) =>
  call<SessionData>(`/api/sessions/${encodeURIComponent(id)}`);

export const sendRecord = (id: string, fields: RecordFields) =>
  call<TranscriptRecord>(`/api/sessions/${encodeURIComponent(id)}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

/** Calls back whenever a file in the session changes (a new view, or another tab's action). */
export function watchSession(id: string, onChange: () => void): () => void {
  const es = new EventSource(`/api/sessions/${encodeURIComponent(id)}/events`);
  es.addEventListener('change', onChange);
  return () => es.close();
}
