// The chat sessions index (chat-panel BE_03 ruling 2, api.md 101): the only module that reads or
// writes `<project>/.visionboard/chat-sessions.json`. One entry per session ever started, oldest
// first: the session as list_chats shows it, plus `agentId`, the board identity the server joined
// for it (never a secret). A session started in the folder has no board until its agent creates
// one (panel-send ruling 2); then `attach` gives it that board, once. Every entry is checked on
// read and before a write (rule 7); a damaged file is refused, never silently rewritten.
// Git-ignored from the first write.
import fs from 'node:fs';
import path from 'node:path';
import { ignoreInGit } from './agents.ts';
import { SCHEMA_BASE, schemaProblems } from './schema.ts';

export const CHAT_SESSIONS_FILE = 'chat-sessions.json';
const SESSION_ID = `${SCHEMA_BASE}schema/api/chat-session.schema.json`;
const AGENT_ID = /^a-[a-z0-9]{8}$/;

/** One session as the chat routes show it (`chat-session.schema.json`). */
export interface ChatSession {
  session: string;
  /** None yet for a session started in the folder (api.md 122). */
  board?: string;
  agent: 'claude' | 'kiro';
  model?: string;
  created: string;
}

/** What the index keeps: the session and the agent id it writes on the board as. */
export interface StoredSession extends ChatSession { agentId: string }

export interface ChatIndex {
  /** Every session, oldest first. */
  all(): readonly StoredSession[];
  /** Record a new session (file first). */
  add(entry: StoredSession): void;
  /** Give a session with no board its board (file first). The entry is changed in place, so a
   * loaded session's record sees it. */
  attach(session: string, board: string): void;
}

/** The public shape: the stored entry without its agent id. */
export const publicSession = ({ agentId: _, ...session }: StoredSession): ChatSession => session;

/** Problems with one entry, as text; empty means valid. */
export function entryProblems(entry: unknown): string[] {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return ['an entry is not an object'];
  const { agentId, ...session } = entry as Record<string, unknown>;
  const out = schemaProblems(SESSION_ID, session).map((p) => `${p.pointer || '/'} ${p.detail}`);
  if (typeof agentId !== 'string' || !AGENT_ID.test(agentId)) out.push('/agentId must be an agent id such as a-k3m9x2pq');
  return out;
}

function readEntries(file: string): StoredSession[] {
  if (!fs.existsSync(file)) return [];
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as { sessions?: unknown };
  const list = doc?.sessions;
  if (!Array.isArray(list) || list.some((x) => entryProblems(x).length > 0)) {
    throw new Error(`${file} is not a valid chat sessions file; fix or remove it`);
  }
  return list as StoredSession[];
}

/** Write atomically (a temp file renamed over the old one), readable by this user only. */
function writeEntries(file: string, entries: StoredSession[]): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ sessions: entries }, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

/** The index in the project's data folder (`.visionboard`). Read once, on first use. */
export function openChatIndex(dir: string): ChatIndex {
  const file = path.join(dir, CHAT_SESSIONS_FILE);
  let entries: StoredSession[] | undefined;
  const all = () => (entries ??= readEntries(file));
  const save = (next: StoredSession[]) => {
    const problems = next.flatMap(entryProblems);
    if (problems.length) throw new Error(`not a valid chat session: ${problems.join('; ')}`);
    fs.mkdirSync(dir, { recursive: true });
    ignoreInGit(dir, CHAT_SESSIONS_FILE);
    writeEntries(file, next);
  };
  return {
    all,
    add(entry) {
      const next = [...all(), entry];
      save(next);
      entries = next;
    },
    attach(session, board) {
      const entry = all().find((e) => e.session === session);
      if (!entry || entry.board !== undefined) return;
      save(all().map((e) => (e === entry ? { ...e, board } : e)));
      entry.board = board;
    },
  };
}
