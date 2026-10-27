// Words: format-view. Why a view or a card's state is refused.
// Keys: board.format-view.<name>. Plain code: no imports but other words files and types.

// ---- validate.ts
export const viewMustBeAnObject = 'view: must be an object';
export const formatMustBe = (FORMAT_VERSION: number): string => `format: must be ${FORMAT_VERSION}`;
export const sessionInvalidId = 'session: invalid id';
export const idInvalidId = (at: string): string => `${at}.id: invalid id`;
export const idDuplicate = (at: string, id: string): string => `${at}.id: duplicate "${id}"`;
export const titleRequired = (at: string): string => `${at}.title: required`;
export const modeOneOf = (at: string, join: string): string => `${at}.mode: one of ${join}`;
export const noCoordinatesInViewsThe = (at: string, k: string): string => `${at}.${k}: no coordinates in views; the engine places nodes`;
export const regionUnknown = (at: string, String: string): string => `${at}.region: unknown "${String}"`;
export const kindOneOf = (at: string, join: string): string => `${at}.kind: one of ${join}`;
export const sizeOneOf = (at: string, join: string): string => `${at}.size: one of ${join}`;
export const nAlreadyUsedBy = (at: string, n: unknown, get: string | undefined): string => `${at}.n: ${n} already used by "${get}"`;
export const laneOneOf = (at: string, join: string): string => `${at}.lane: one of ${join}`;
export const regionsCenterUnknownNode = (i: number, String: string): string => `regions[${i}].center: unknown node "${String}"`;
export const linksMustBeAnObject = (i: number): string => `links[${i}]: must be an object`;
export const linksFromUnknownNode = (i: number, String: string): string => `links[${i}].from: unknown node "${String}"`;
export const linksToUnknownNode = (i: number, String: string): string => `links[${i}].to: unknown node "${String}"`;
