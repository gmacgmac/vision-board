// The one I/O layer for session files (project rule 7). Every view is validated on read; every
// transcript record is validated before it is appended.
import fs from 'node:fs';
import path from 'node:path';
import { ID_PATTERN } from '../../../packages/format/src/index.ts';
import type { View } from '../../../packages/format/src/index.ts';
import type { TranscriptRecord } from '../../../packages/format/src/index.ts';
import { validateView } from '../../../packages/format/src/index.ts';
import { makeRecord, validateRecord } from '../../../packages/actions/src/index.ts';
import { HttpError } from './guard.ts';

const VIEW_FILE = /^view-v(\d+)\.json$/;
const TRANSCRIPT = 'transcript.jsonl';
const RECORD_FIELDS = ['action', 'node', 'text', 'x', 'y', 'region', 'mode'] as const;

export function sessionDir(root: string, id: string): string {
  if (!ID_PATTERN.test(id)) throw new HttpError(400, 'Invalid session id');
  const dir = path.resolve(root, id);
  if (path.dirname(dir) !== path.resolve(root)) throw new HttpError(400, 'Invalid session id');
  return dir;
}

export function listVersions(dir: string): number[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((f) => VIEW_FILE.exec(f)?.[1])
    .filter((v): v is string => v !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

export function readView(dir: string, version: number): View {
  const file = path.join(dir, `view-v${version}.json`);
  if (!fs.existsSync(file)) throw new HttpError(404, `No view v${version}`);
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new HttpError(422, `view-v${version}.json is not valid JSON`);
  }
  const problems = validateView(data);
  if (problems.length) throw new HttpError(422, `view-v${version}.json is invalid`, problems);
  return data as View;
}

export function latestView(dir: string): View {
  const versions = listVersions(dir);
  if (!versions.length) throw new HttpError(404, 'Session has no views yet');
  return readView(dir, versions[versions.length - 1]!);
}

export function readTranscript(dir: string): TranscriptRecord[] {
  const file = path.join(dir, TRANSCRIPT);
  if (!fs.existsSync(file)) return [];
  const out: TranscriptRecord[] = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as TranscriptRecord); } catch { /* a torn last line; skip */ }
  }
  return out;
}

/** Appends one person record, stamped by the server. The browser cannot claim to be an agent. */
export function appendRecord(dir: string, body: unknown): TranscriptRecord {
  const view = latestView(dir);
  const src = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const fields: Record<string, unknown> = { by: 'person', version: view.version };
  for (const k of RECORD_FIELDS) if (src[k] !== undefined) fields[k] = src[k];
  const record = makeRecord(fields as Omit<TranscriptRecord, 'at'>);
  const problems = validateRecord(record, view);
  if (problems.length) throw new HttpError(422, 'Invalid action', problems);
  fs.appendFileSync(path.join(dir, TRANSCRIPT), `${JSON.stringify(record)}\n`);
  return record;
}

export function listSessions(root: string) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((id) => ID_PATTERN.test(id) && fs.statSync(path.join(root, id)).isDirectory())
    .map((id) => {
      const dir = path.join(root, id);
      const versions = listVersions(dir);
      let title = id;
      try { title = latestView(dir).title; } catch { /* listed, shown as broken on open */ }
      return { id, title, versions };
    })
    .filter((s) => s.versions.length > 0);
}

/** Copies each fixture into sessions/ once, so the demo runs on the same path as a live board. */
export function seedFixtures(root: string, fixturesDir: string): string[] {
  fs.mkdirSync(root, { recursive: true });
  const seeded: string[] = [];
  for (const f of fs.readdirSync(fixturesDir).filter((x) => x.endsWith('.json'))) {
    const view = JSON.parse(fs.readFileSync(path.join(fixturesDir, f), 'utf8')) as View;
    if (validateView(view).length) continue;
    const dir = sessionDir(root, view.session);
    if (fs.existsSync(dir)) continue;
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, `view-v${view.version}.json`), `${JSON.stringify(view, null, 2)}\n`);
    seeded.push(view.session);
  }
  return seeded;
}
