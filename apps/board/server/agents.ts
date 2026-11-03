// Agent secrets (D-027, api.md 21-22): the only module that reads or writes
// a ledger folder's `agents.json` (`ledgerFiles(dir).agents`, data-folder.ts). It holds one SHA-256 per agent, never a secret, and the
// file is git-ignored from the moment the first agent joins. A hash counts only once the ledger
// has that agent's `join` event, so a hash written before a failed append is ignored. Lookups
// compare every stored hash with `timingSafeEqual`.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AGENTS_FILE, GITIGNORE_FILE, ledgerFiles } from '#format';
import { writeFileAtomic } from './atomic-file.ts';

const AGENT_ID = /^a-[a-z0-9]{8}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** One stored identity: the agent id and the SHA-256 (hex) of its secret. */
export interface AgentHash { agent: string; sha256: string }

export interface Agents {
  /** A new agent id, not in `taken` and not already stored. */
  mint(taken: ReadonlySet<string>): string;
  /** Store the hash of `secret` for `agent` (file first, api.md 21). */
  add(agent: string, secret: string): void;
  /** The agent whose secret this is, if it is stored and `joined` says it has a `join` event. */
  find(secret: string, joined: (agent: string) => boolean): string | undefined;
}

const sha256 = (text: string): Buffer => createHash('sha256').update(text, 'utf8').digest();

/** `a-` and 8 lowercase letters or digits, unbiased (bytes of 252 and above are redrawn). */
function randomId(): string {
  let out = 'a-';
  while (out.length < 10) {
    for (const b of randomBytes(16)) if (b < 252 && out.length < 10) out += ALPHABET[b % 36];
  }
  return out;
}

/** The stored hashes, checked: a file that is not `{ agents: [{ agent, sha256 }] }` is refused,
 * so a damaged file is never silently rewritten (rule 7). */
function readHashes(file: string): AgentHash[] {
  if (!fs.existsSync(file)) return [];
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as { agents?: unknown };
  const list = doc?.agents;
  const ok = Array.isArray(list) && list.every((x) =>
    typeof x === 'object' && x !== null && Object.keys(x).length === 2 &&
    AGENT_ID.test(String((x as AgentHash).agent)) && SHA256.test(String((x as AgentHash).sha256)));
  if (!ok) throw new Error(`${file} is not a valid agents file; fix or remove it`);
  return list as AgentHash[];
}

/** Write atomically (a temp file renamed over the old one), readable by this user only. */
function writeHashes(file: string, hashes: AgentHash[]): void {
  writeFileAtomic(file, `${JSON.stringify({ agents: hashes }, null, 2)}\n`, 0o600);
}

/** The data folder `dir`'s own `.gitignore` names `name`, so the file is never committed. A `*` line
 * already keeps every name out (a ledger kept out of git, ledgers.ts), so nothing is added after it. */
export function ignoreInGit(dir: string, name: string): void {
  const file = path.join(dir, GITIGNORE_FILE);
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (text.split(/\r?\n/).some((line) => line.trim() === name || line.trim() === '*')) return;
  fs.writeFileSync(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${name}\n`);
}

/** The agents store in ledger folder `dir` (`ledgerFolder`). Read once, on first use. */
export function openAgents(dir: string): Agents {
  const file = ledgerFiles(dir).agents;
  let hashes: AgentHash[] | undefined;
  const all = () => (hashes ??= readHashes(file));
  return {
    mint(taken) {
      const stored = new Set(all().map((h) => h.agent));
      let id = randomId();
      while (taken.has(id) || stored.has(id)) id = randomId();
      return id;
    },
    add(agent, secret) {
      const next = [...all(), { agent, sha256: sha256(secret).toString('hex') }];
      fs.mkdirSync(dir, { recursive: true });
      ignoreInGit(dir, AGENTS_FILE);
      writeHashes(file, next);
      hashes = next;
    },
    find(secret, joined) {
      const want = sha256(secret);
      let found: string | undefined;
      for (const h of all()) {
        if (timingSafeEqual(want, Buffer.from(h.sha256, 'hex')) && joined(h.agent)) found = h.agent;
      }
      return found;
    },
  };
}
