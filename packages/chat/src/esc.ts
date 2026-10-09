// Escaping for the chat's templates: every text run goes into markup through here.
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!);

/** Turns the agent's text into safe markup. The host passes its Markdown renderer (which must
 *  escape every text run); without one the text is shown as typed. */
export type RenderText = (src: string) => string;
export const plainText: RenderText = (src) => `<p class="chat-plain">${esc(src)}</p>`;
