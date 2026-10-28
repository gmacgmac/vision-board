// Words: go-to-card. Go to card and the open-items chip.
// Keys: board.go-to-card.<name>. Plain code: no imports but other words files and types.

// ---- go-to-card.ts
export const noCard = (n: number): string => `No card ${n}`;
export const cardIsHiddenWithThe = (n: number): string => `Card ${n} is hidden with the answered cards (H shows them)`;
export const cardWasRemoved = (n: number): string => `Card ${n} was removed`;
export const showVWhereItLast = (version: number): string => `Show v${version}, where it last appeared`;
// Search (cardSearch flag): what the box says of the words typed.
export const noMatches = 'No matches';
export const matchOf = (at: number, count: number): string => `${at} of ${count}`;
/** Each part of a card a search reads (`#actions` SEARCH_FIELDS), as "in …" names it. */
export const PART: Record<string, string> = { title: 'the title', body: 'the text', container: 'the container\'s name', note: 'a note', reply: 'a reply' };
/** The current match and the parts of it that matched: "Card 12, in the title and a note". */
export const cardMatchedIn = (n: string, parts: readonly string[]): string =>
  `Card ${n}, in ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] ?? ''}`;
