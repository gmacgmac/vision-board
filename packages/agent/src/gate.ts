// The gate (PLAN ruling 5): the CLI's "before tool use" hook for file edits and shell commands.
// bin/gate.ts runs this with the hook input on stdin: it posts the facts to the host's approval
// route with the session's run token, waits for the person, and prints the CLI's decision. Every
// path that is not a yes is a denial: an unreachable host, a bad answer, a gate that crashed.
import http from 'node:http';
import https from 'node:https';
import type { ApprovalOutcome, Facts } from './approvals.ts';
import { factsFor, refusalFor } from './approvals.ts';

/** The environment the gate reads its route and token from (set by the adapter on the CLI). */
export const GATE_URL_ENV = 'AGENT_GATE_URL';
export const GATE_TOKEN_ENV = 'AGENT_GATE_TOKEN';
/** How long the gate may wait, in milliseconds, when it is not the default (set with `approvalHold`). */
export const GATE_WAIT_ENV = 'AGENT_GATE_WAIT_MS';
/** The CLI's own limit on the hook, in seconds; past it the CLI would go on without an answer. */
export const HOOK_TIMEOUT_S = 600;
/** With `approvalHold`: a question waits for the person, so the hook may wait a day (PLAN ruling 335). */
export const HELD_HOOK_TIMEOUT_S = 86_400;
/** How much sooner than the CLI's limit the gate gives up (denies), so the CLI never decides for it. */
const GATE_MARGIN_S = 15;
/** The gate's wait, from the hook limit it runs under. */
export const gateWaitMs = (hold = false): number => ((hold ? HELD_HOOK_TIMEOUT_S : HOOK_TIMEOUT_S) - GATE_MARGIN_S) * 1000;
export const GATE_WAIT_MS = gateWaitMs();
/** The gate's wait as its environment sets it: a whole number of milliseconds a timer can hold, else the default. */
export function gateWaitFrom(env: NodeJS.ProcessEnv): number {
  const ms = Number(env[GATE_WAIT_ENV]);
  return Number.isInteger(ms) && ms > 0 && ms < 2 ** 31 ? ms : GATE_WAIT_MS;
}

export const UNREACHABLE =
  'Not done: the approval could not be asked (the board did not answer), so this was refused. Tell the person; do not work around it.';

/** Claude Code's PreToolUse answer. */
export interface HookOutput {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'allow' | 'deny';
    permissionDecisionReason: string;
  };
}

const decision = (allow: boolean, reason: string): HookOutput => ({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: allow ? 'allow' : 'deny', permissionDecisionReason: reason },
});

/** Ask the person about `facts`; `signal` ends the wait (the connection closes, which releases the ask). */
export type Ask = (facts: Facts, signal?: AbortSignal) => Promise<ApprovalOutcome>;

/** Read the outcome off an answer body, or throw: anything that is not one is a denial upstream. */
function outcomeOf(body: string): ApprovalOutcome {
  const value: unknown = JSON.parse(body);
  if (typeof value !== 'object' || value === null || typeof (value as ApprovalOutcome).approved !== 'boolean') {
    throw new Error('the approval answer has no `approved`');
  }
  return value as ApprovalOutcome;
}

/**
 * POST the facts and wait for the answer. node:http rather than fetch: fetch gives up waiting for
 * headers after 300 s, and a person may take longer than that to answer.
 */
export function askOverHttp(url: string, token: string, waitMs = GATE_WAIT_MS): Ask {
  return (facts, signal) => new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(facts);
    const request = (target.protocol === 'https:' ? https : http).request(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Authorization: `Bearer ${token}` },
      signal: signal ? AbortSignal.any([AbortSignal.timeout(waitMs), signal]) : AbortSignal.timeout(waitMs),
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { text += chunk; });
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`the approval route answered ${res.statusCode}`));
        try { resolve(outcomeOf(text)); } catch (err) { reject(err); }
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

/** The decision for one hook input. Never throws: anything that goes wrong is a denial. */
export async function decide(stdin: string, ask: Ask, exists: (path: string) => boolean): Promise<HookOutput> {
  let input: unknown;
  try { input = JSON.parse(stdin); } catch { return decision(false, 'The gate could not read the tool call, so it was refused.'); }
  const facts = factsFor(input, exists);
  if ('refuse' in facts) return decision(false, facts.refuse);
  let outcome: ApprovalOutcome;
  try { outcome = await ask(facts); } catch { return decision(false, UNREACHABLE); }
  const refusal = refusalFor(outcome);
  return refusal === null ? decision(true, 'The person allowed it.') : decision(false, refusal);
}

/** The gate's run: the route and token from the environment; none is a denial. */
export async function runGate(stdin: string, env: NodeJS.ProcessEnv, exists: (path: string) => boolean): Promise<HookOutput> {
  const url = env[GATE_URL_ENV];
  const token = env[GATE_TOKEN_ENV];
  if (!url || !token) return decision(false, UNREACHABLE);
  return decide(stdin, askOverHttp(url, token, gateWaitFrom(env)), exists);
}
