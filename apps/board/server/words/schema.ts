// Words: schema. How a schema failure is told to the agent.
// Keys: board.schema.<name>. Plain code: no imports but other words files and types.

// ---- schema.ts
export const doesNotFitAnyOf = 'does not fit any of the shapes the tool takes';
export const theLineIsNotJSON = 'the line is not JSON';
export const theEvent = 'the event';
export const isNotAValidId = 'is not a valid id: lowercase letters, digits and hyphens, up to 64, not starting with a hyphen';
export const isNotAnAgentId = 'is not an agent id: "a-" and 8 lowercase letters or digits, as join gives it';
export const mustNotBeBlank = 'must not be blank';
export const isNotAUTCTimestamp = 'is not a UTC timestamp like 2026-10-05T09:00:00Z';
export const isNotAnAppS = 'is not an app\'s hash: 64 lowercase hex characters, as list_apps gives it';
export const isNotAnHttpsOrigin = 'is not an https origin with an exact host, like https://api.example.com (no wildcard, no path)';
export const isNotAToolName = 'is not a tool name: lower-case letters, digits and _, starting with a letter, up to 40';
export const isNotAVersionUp = 'is not a version: up to 40 characters, no spaces';
export const aWholeNumber = 'a whole number';
export const trueOrFalse = 'true or false';
export const anObject = 'an object';
export const mustBeANodeNumber = 'must be a node number or { "key": "…" }';
export const isRequired = (missing: string): string => `\`${missing}\` is required`;
export const unknownField = (extra: string): string => `unknown field \`${extra}\``;
export const eventType = 'event type';
export const unknown = (what: string, quote: string): string => `unknown ${what} ${quote}`;
export const mustBeTextNamingThe = (tag: string, what: string): string => `\`${tag}\` must be text naming the ${what}`;
export const mustBe = (f: string, String: string): string => `${f} must be ${String}`;
export const isNotInTheExpected = 'is not in the expected form';
export const isLongerThanCharacters = (f: string, String: string): string => `${f} is longer than ${String} characters`;
export const isShorterThanCharacters = (f: string, String: string): string => `${f} is shorter than ${String} characters`;
export const mustBeAtMost = (f: string, String: string): string => `${f} must be at most ${String}`;
export const mustBeAtLeast = (f: string, String: string): string => `${f} must be at least ${String}`;
export const hasMoreThanEntries = (f: string, String: string): string => `${f} has more than ${String} entries`;
export const needsAtLeast = (f: string, String: string, limit: string): string => `${f} needs at least ${String} ${limit}`;
export const namesTheSameEntryTwice = (f: string): string => `${f} names the same entry twice`;
export const mustBeOneOf = (f: string, value: string): string => `${f} must be one of ${value}`;
export const mustBeHere = (f: string, quote: string): string => `${f} must be ${quote} here`;
export const isNotAllowedHere = (f: string): string => `${f} is not allowed here`;
export const isNotAllowedHere2 = (f: string, words: string): string => `${f} is not allowed here. ${words}`;
export const isNotValid = (f: string): string => `${f} is not valid`;
