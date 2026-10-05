// The one formatter behind `--text` (api.md 51): any JSON answer as `key: value` lines. Nested
// objects and lists are flattened to a path (`boards[0].title: Roadmap`), so every line can be
// read, searched and cut on its own. No command has a layout of its own.

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A leaf as one line of text: strings as they are unless they hold a line break. */
function leaf(value: unknown): string {
  if (typeof value === 'string') return /[\r\n]/.test(value) ? JSON.stringify(value) : value;
  return JSON.stringify(value) ?? String(value);
}

function lines(value: unknown, at: string, out: string[]): void {
  if (Array.isArray(value) && value.length) value.forEach((v, i) => lines(v, `${at}[${i}]`, out));
  else if (isObject(value) && Object.keys(value).length) {
    for (const [k, v] of Object.entries(value)) lines(v, at ? `${at}.${k}` : k, out);
  } else {
    const text = Array.isArray(value) ? '[]' : isObject(value) ? '{}' : leaf(value);
    out.push(at ? `${at}: ${text}` : text);
  }
}

/** The answer as text, one `key: value` per line (a bare value when the answer is one). */
export function formatText(value: unknown): string {
  const out: string[] = [];
  lines(value, '', out);
  return out.join('\n');
}
