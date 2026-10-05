// `--json-body <file or ->`: the whole request body from a file or from stdin. It must be a JSON
// object; the reason it is not comes back as text for the caller to print (exit code 2).
import type { Failure } from './args.ts';

export interface BodySource {
  readStdin(): Promise<string>;
  readFile(path: string): string;
}

/** The parsed body, or why it could not be read. */
export async function readJsonBody(spec: string, io: BodySource): Promise<{ ok: true; value: Record<string, unknown> } | Failure> {
  let text: string;
  try {
    text = spec === '-' ? await io.readStdin() : io.readFile(spec);
  } catch (err) {
    return { ok: false, message: `--json-body: cannot read ${spec === '-' ? 'stdin' : spec} (${err instanceof Error ? err.message : String(err)}).` };
  }
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { ok: false, message: `--json-body: ${spec === '-' ? 'stdin' : spec} is not JSON.` }; }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, message: `--json-body: ${spec === '-' ? 'stdin' : spec} must hold one JSON object.` };
  }
  return { ok: true, value: value as Record<string, unknown> };
}
