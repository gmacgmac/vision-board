// Words: args. How a flag is refused.
// Keys: vision-board.args.<name>. Plain code: no imports but other words files and types.

// ---- args.ts
export const needsAValue = (flag: string): string => `${flag} needs a value.`;
export const mustBeAWholeNumber = (flag: string, raw: string): string => `${flag} must be a whole number, not "${raw}".`;
export const mustBeANumberNot = (flag: string, raw: string): string => `${flag} must be a number, not "${raw}".`;
export const mustBeTrueOrFalse = (flag: string, raw: string): string => `${flag} must be true or false, not "${raw}".`;
