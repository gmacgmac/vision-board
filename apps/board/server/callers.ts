// Who is calling (api.md 20-22, 28, 41), worked out from the operation's `security` in
// openapi.json before its handler runs. The person is the board page: it carries the `vb_person`
// cookie the server set when it served the page, minted fresh at each start. An agent sends its
// Bearer secret from `join`. Person routes refuse a Bearer header; agent writes refuse the person
// cookie; refusals never name the cookie. This stops mistakes, not attackers (api.md 27).
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { OperationId } from '#format';
import type { Agents } from './agents.ts';
import { ONLY_PERSON } from './engine/index.ts';
import type { Caller, Ledger } from './ledger.ts';
import type { ProblemError } from './problem.ts';
import { problem } from './problem.ts';
import { SPECS } from './spec.ts';

export const PERSON_COOKIE = 'vb_person';
export const REALM = { 'WWW-Authenticate': 'Bearer realm="vision-board"' };

/** A fresh person token for one server start: 32 random bytes, base64url. */
export const newPersonToken = (): string => randomBytes(32).toString('base64url');

/** The `Set-Cookie` value the page gets with the page itself (api.md 20). */
export const personCookie = (token: string): string =>
  `${PERSON_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api`;

/** The value of the person cookie in a request, if it sends one. */
export function cookieOf(req: IncomingMessage): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === PERSON_COOKIE) return part.slice(eq + 1).trim();
  }
  return undefined;
}

const same = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const ONLY_AGENT = 'Only an agent can do this, with the secret join gave it. The person acts on the board itself.';
const NO_SECRET = 'This needs your agent secret, sent as Authorization: Bearer <secret>. If you have none, call join, then request_grant for each container you need.';
const UNKNOWN_SECRET = 'The server does not know this secret. Call join again, then request_grant for each container you need; the person must approve again.';
const ONLY_GATE = 'Only a chat session\'s gate hook calls this, with its run token. The person answers approvals on the board.';
const NO_RUN_TOKEN = 'This needs the chat session\'s run token, sent as Authorization: Bearer <token>.';
const STALE_PAGE = 'The board page has an old session (the board restarted): reload the page. An agent sends its secret from join instead.';
const BEARER = /^Bearer +(\S+)\s*$/i;

/** The token of an `Authorization: Bearer` header, if the request sends one. */
export const bearerOf = (req: IncomingMessage): string | undefined => BEARER.exec(req.headers.authorization ?? '')?.[1];

/** What the caller check needs from the server. `elsewhere` is the refusal for a secret another
 * folder's agents know (caller-folder.ts), asked before the generic "join again". */
export interface CallerEnv {
  person: string;
  agents: () => Agents;
  ledger: Ledger;
  elsewhere?: ((secret: string) => ProblemError | undefined) | undefined;
}

/** The agent a Bearer secret names; 401 with `WWW-Authenticate` when it is missing or unknown. */
function agentOf(req: IncomingMessage, env: CallerEnv): Caller {
  const auth = req.headers.authorization;
  const m = auth === undefined ? null : BEARER.exec(auth);
  if (!m) throw problem('not-authenticated', NO_SECRET, { headers: REALM });
  const index = env.ledger.state().index;
  const agent = env.agents().find(m[1]!, (id) => index.agents.has(id));
  if (!agent) throw env.elsewhere?.(m[1]!) ?? problem('not-authenticated', UNKNOWN_SECRET, { headers: REALM });
  return { by: 'agent', agent };
}

/** The caller of operation `id`: the person, an agent, or nobody (a read without credentials).
 * Throws the refusal when the request does not fit the operation. */
export function callerOf(req: IncomingMessage, id: OperationId, env: CallerEnv): Caller | undefined {
  const { security, agent: agentOp } = SPECS[id];
  const cookie = cookieOf(req);
  if (security === 'person') {
    if (req.headers.authorization !== undefined || cookie === undefined || !same(cookie, env.person))
      throw problem('forbidden', ONLY_PERSON);
    return { by: 'person' };
  }
  // The gate route: the cookie is refused and a Bearer token required here; whether the token
  // names a running session is the handler's to check (api.md 102).
  if (security === 'run') {
    if (cookie !== undefined) throw problem('forbidden', ONLY_GATE);
    if (!BEARER.test(req.headers.authorization ?? '')) throw problem('not-authenticated', NO_RUN_TOKEN, { headers: REALM });
    return undefined;
  }
  // An agent's secret or the person's cookie (api.md 152): a Bearer header names an agent; else the
  // page's cookie, refused `forbidden` when stale so the page reloads (api.md 20).
  if (security === 'agent-or-person') {
    if (req.headers.authorization !== undefined) return agentOf(req, env);
    if (cookie === undefined) throw problem('not-authenticated', NO_SECRET, { headers: REALM });
    if (!same(cookie, env.person)) throw problem('forbidden', STALE_PAGE);
    return { by: 'person' };
  }
  if (agentOp && req.method !== 'GET' && cookie !== undefined) throw problem('forbidden', ONLY_AGENT);
  if (security === 'agent') return agentOf(req, env);
  if (security === 'optional-agent' && req.headers.authorization !== undefined) return agentOf(req, env);
  return undefined;
}
