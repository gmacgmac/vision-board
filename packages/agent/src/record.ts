// A parsed JSON object: not null, not an array. The agent module imports nothing from this repo
// (index.ts), so it keeps its own one copy for its adapters, not one per file.
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
