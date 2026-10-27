// Words: check-args. How a tool call's arguments are refused.
// Keys: board.check-args.<name>. Plain code: no imports but other words files and types.

// ---- check-args.ts
export const theArguments = 'the arguments';
export const mustBeAtLeastCharacters = (place: string, minLength: number): string => `${place}: must be at least ${minLength} characters`;
export const mustBeAtMostCharacters = (place: string, maxLength: number): string => `${place}: must be at most ${maxLength} characters`;
export const mustNotBeBlank = (place: string): string => `${place}: must not be blank`;
export const mustMatch = (place: string, pattern: string): string => `${place}: must match ${pattern}`;
export const mustBeAtLeast = (place: string, minimum: number): string => `${place}: must be at least ${minimum}`;
export const mustBeAtMost = (place: string, maximum: number): string => `${place}: must be at most ${maximum}`;
export const mustBeMoreThan = (place: string, exclusiveMinimum: number): string => `${place}: must be more than ${exclusiveMinimum}`;
export const mustBeLessThan = (place: string, exclusiveMaximum: number): string => `${place}: must be less than ${exclusiveMaximum}`;
export const needsAtLeastEntries = (place: string, minItems: number): string => `${place}: needs at least ${minItems} entries`;
export const takesAtMostEntries = (place: string, maxItems: number): string => `${place}: takes at most ${maxItems} entries`;
export const isRequired = (at: string, name: string): string => `${at}/${name}: is required`;
export const isNotAFieldHere = (at: string, name: string): string => `${at}/${name}: is not a field here`;
export const typeMustBeOneOf = (at: string, map: string): string => `${at}/type: must be one of ${map}`;
export const doesNotMatchAnyForm = (place: string): string => `${place}: does not match any form allowed here`;
export const isNotAllowed = (place: string): string => `${place}: is not allowed`;
export const mustBe = (place: string, show: string): string => `${place}: must be ${show}`;
export const mustBeOneOf = (place: string, map: string): string => `${place}: must be one of ${map}`;
export const mustBeNot = (place: string, join: string, typeOf: string): string => `${place}: must be ${join}, not ${typeOf}`;
