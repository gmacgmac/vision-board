// What a failed call prints to stderr (api.md 51): a problem's `detail`, then each error's pointer
// and detail; anything else (no server, a dropped connection) as one plain line.
import { ApiProblem } from '#client';

/** The lines to print for an error thrown by a call. */
export function failureLines(err: unknown, base: string): string[] {
  if (err instanceof ApiProblem) {
    return [err.detail, ...err.errors.map((e) => `  ${e.pointer || '/'}: ${e.detail}`), ...(err.example === undefined ? [] : [`Example: ${JSON.stringify(err.example)}`])];
  }
  const why = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err);
  return [`Could not get an answer from ${base}: ${why}`];
}
