// A line of text cut to at most `max` characters, ending in "…" when cut, its white space runs made
// one space first: the chat's chip labels (chat-bridge.ts) and the open list's titles (finder.ts).
export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
