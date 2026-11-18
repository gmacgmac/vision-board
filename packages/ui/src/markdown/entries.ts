// Markdown, entries (D-105 5; the timeline set's PLAN call 9): inside a dated node, a `###` heading, a paragraph
// opening with a bold run, or a top-level list item opening with one draws as an entry: a bar, the bold name, then its
// text. The agent learns no syntax; the board does the presentation. This file answers the one question the grouping
// asks of rendered inline markup (already escaped by inline.ts): does it open with a bold name, and what is the rest.
// render.ts groups the blocks and writes the markup. Pure, no DOM.

/** What follows the name, from its start: spaces and hard breaks, then at most one `:`, `-`, `–` or `—` and the spaces
 *  and hard breaks after it. */
const SEPARATOR = /^(?:\s|<br \/>)*(?:[:\-–—](?:\s|<br \/>)*)?/;
const OPEN = '<strong>';
const CLOSE = '</strong>';

/** A bold lead: the bold run's markup (the name) and the rest with its leading separator dropped; undefined when the
 *  markup does not open with a bold run, or the run holds another bold run or nothing but spaces. */
export function boldLead(html: string): { name: string; rest: string } | undefined {
  if (!html.startsWith(OPEN)) return undefined;
  const end = html.indexOf(CLOSE);
  const name = end < 0 ? '' : html.slice(OPEN.length, end);
  if (!name.trim() || name.includes(OPEN)) return undefined;
  return { name, rest: html.slice(end + CLOSE.length).replace(SEPARATOR, '') };
}
