// Words: selection-bar. The selection bar: how many are selected.
// Keys: vision-board.selection-bar.<name>. Plain code: no imports but other words files and types.

// ---- selection-bar-core.ts
export const selected = (n: number): string => `${n} selected`;
/** The grid's count with why its acting cells are off: "1 selected · locked". */
export const selectedBecause = (selectedCount: string, why: string): string => `${selectedCount} · ${why}`;
export const area = 'Area';
export const selection = (selectedCount: string): string => `Selection: ${selectedCount}`;
