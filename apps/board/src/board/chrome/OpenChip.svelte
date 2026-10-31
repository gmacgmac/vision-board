<!-- A toolbar chip that lists cards and goes to the one chosen: the "N open" chip (open-list FE_01,
     openList flag) and the "N new" chip (new-and-updated Design 5, freshCards flag), one pattern.
     While it has cards it is a menu dropdown over the chip (MenuSelect, the Containers finder's
     pattern): its list holds the cards as "12 · title" in board order, an updated one ending
     "· updated" (board/find/finder.ts `openRow`), and choosing one goes to it as Go to card does
     (board/find/go-to-card.ts `to`). With no cards (or `cards` empty: the flag off) it is the plain chip.
     The count stays on a narrow toolbar, the word for screen readers (board.css). The toolbar and
     the gallery both draw this. With `row` (adaptiveHeader flag, the narrowest bar) it is a row of the "⋯"
     menu with `row` as its face, a plain line while it has no cards to list. -->
<script lang="ts">
  import * as chromeGoToCardWords from '../words/chrome-go-to-card.ts';
  import MenuSelect from './MenuSelect.svelte';
  import type { Snippet } from 'svelte';
  import type { RowCard } from '../find/index.ts';
  import { openRow } from '../find/index.ts';

  let {
    count, cards, onpick, id = 'open-cards', look, word = 'open', tone = 'open', label = chromeGoToCardWords.goToAnOpenCard,
    title = chromeGoToCardWords.openItemsChooseOneTo, plainTitle = chromeGoToCardWords.openItems, row,
  }: {
    /** Draw it as a row of the "⋯" menu, with this face. */
    row?: Snippet;
    count: number;
    /** The cards to list, by board number; none draws the plain chip. */
    cards: readonly RowCard[];
    /** Go to card `n`. */
    onpick: (n: number) => void;
    id?: string;
    /** A state drawn without the pointer or keys: the gallery's samples only (MenuSelect). */
    look?: 'hover' | 'focus' | 'pressed';
    /** The word after the count: "open", "new". */
    word?: string;
    /** The chip's tone (board.css `.vb-chip[data-tone]`). */
    tone?: string;
    /** The dropdown's accessible name. */
    label?: string;
    /** The tooltip, as a dropdown and as the plain chip. */
    title?: string;
    plainTitle?: string;
  } = $props();

  const rows = $derived(cards.map(openRow));
</script>

{#snippet face()}<b>{count}</b> <span class="vb-chip-word">{word}</span>{/snippet}

{#if rows.length}
  <MenuSelect {id} {label} name="{count} {word}" {rows} onpick={(v) => onpick(Number(v))}
    face={row ?? face} kind={row ? 'vb-menu-item' : 'vb-chip'} {look} {tone} {title} />
{:else if row}
  <p class="vb-menu-line" title={plainTitle}>{@render row()}</p>
{:else}
  <span class="vb-chip" data-tone={tone} title={plainTitle}>{@render face()}</span>
{/if}
