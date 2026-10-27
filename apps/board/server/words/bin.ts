// Words: bin. The board's command-line tools.
// Keys: board.bin.<name>. Plain code: no imports but other words files and types.

// ---- validate.ts
export const lineSchema = (i: number, pointer: string, detail: string): string => `line ${i}: schema ${pointer}: ${detail}`;
export const cannotRead = (value: string): string => `cannot read: ${value}`;
