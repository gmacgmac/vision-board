// Test helper: run `vb` whole, in process, with everything outside it supplied by the test.
import { run } from '../src/index.ts';
import type { Io } from '../src/index.ts';

export interface Seen { method: string; url: string; headers: Record<string, string>; body: unknown }
export interface Setup {
  env?: Record<string, string>;
  stdin?: string;
  files?: Record<string, string>;
  /** Answers the stub server gives, in order; the last repeats. Default: `{}` as JSON. */
  answers?: Response[];
  /** Replace fetch outright (for a dropped connection). */
  fetch?: typeof fetch;
}
export interface Result { code: number; out: string; err: string; requests: Seen[] }

export const json = (body: unknown, status = 200, media = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': media } });

export const problem = (code: string, status: number, detail: string, errors?: { pointer: string; detail: string }[]) =>
  json({ type: `https://vision-board.invalid/problems/${code}`, title: code, status, detail, ...(errors && { errors }) }, status, 'application/problem+json');

export async function exec(argv: string[], setup: Setup = {}): Promise<Result> {
  const result: Result = { code: -1, out: '', err: '', requests: [] };
  const answers = [...(setup.answers ?? [json({})])];
  const stub: typeof fetch = async (url, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as unknown : undefined;
    result.requests.push({ method: init?.method ?? 'GET', url: String(url), headers, body });
    return (answers.length > 1 ? answers.shift() : answers[0]!.clone())!;
  };
  const io: Io = {
    stdout: (t) => { result.out += t; },
    stderr: (t) => { result.err += t; },
    readStdin: async () => setup.stdin ?? '',
    readFile: (file) => setup.files?.[file] ?? (() => { throw new Error(`ENOENT: ${file}`); })(),
    env: setup.env ?? {},
    fetch: setup.fetch ?? stub,
  };
  result.code = await run(argv, io);
  return result;
}
