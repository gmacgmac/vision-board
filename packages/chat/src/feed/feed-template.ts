// Chat feed pattern, layer 2 (template): the feed's own markup. The skeleton (the empty message,
// the log, the status line), a system line and a change chip; messages and approval cards are
// their own elements. Pure.
import { esc } from '../esc.ts';
import type { ChangeEntry, SystemEntry } from './feed-core.ts';
import { changeLabel } from './feed-core.ts';

/** Card numbers shown on a change chip; more are summed up. */
export const CHIP_NUMBERS = 6;

export function feedTemplate(empty: string, label: string): string {
  return `<p class="chat-empty">${esc(empty)}</p>`
    + `<div class="chat-log" role="log" aria-live="polite" aria-label="${esc(label)}" tabindex="0"></div>`
    + '<p class="chat-activity" role="status"></p>';
}

export function systemTemplate(e: SystemEntry): string {
  return `<p class="chat-system"${e.turn ? ` data-turn="${e.turn}"` : ''}>${esc(e.text)}</p>`;
}

const numbers = (cards: readonly number[]): string => {
  const shown = cards.slice(0, CHIP_NUMBERS).join(', ');
  return cards.length > CHIP_NUMBERS ? `${shown} +${cards.length - CHIP_NUMBERS}` : shown;
};

/** A button that shows the change on the board (the host zooms to it). */
export function changeTemplate(e: ChangeEntry, boardName?: (id: string) => string): string {
  const icon = '<svg class="chat-change-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">'
    + '<rect x="2" y="3" width="5" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>'
    + '<rect x="9" y="9" width="5" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>'
    + '<path d="M7 5h2.5a1.5 1.5 0 0 1 1.5 1.5V9" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  const cards = e.cards.length ? `<span class="chat-change-cards">${esc(numbers(e.cards))}</span>` : '';
  return `<button type="button" class="chat-change" data-board="${esc(e.board)}" data-cards="${e.cards.join(',')}">`
    + `${icon}<span class="chat-change-text">${esc(changeLabel(e, boardName))}</span>${cards}</button>`;
}
