// A small check on parsed JSON that every module repeated (ARCH_06): one home.

/** A parsed JSON object: not null, not an array. */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
