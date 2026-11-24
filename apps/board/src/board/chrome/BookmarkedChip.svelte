<!-- The toolbar's "N bookmarked" chip (cardBookmark flag, board/cards/bookmark-flow.ts), drawn while any card is
     bookmarked: the "N open" chip's pattern (OpenChip, MenuSelect), a menu dropdown of the bookmarked cards, "12 · title"
     in number order; choosing one goes to it as Go to card does (`onpick`). Its words are "N bookmarked" (the count
     stays on a narrow toolbar, the word for screen readers). With `row` (adaptiveHeader flag, the narrowest bar) it is a
     row of the "⋯" menu. The toolbar and the gallery both draw this. Page-only: a bookmark is never an agent's. -->
<script lang="ts">
  import ButtonIcon from './ButtonIcon.svelte';
  import OpenChip from './OpenChip.svelte';
  import type { OpenCard } from '#actions';
  import * as cardsWords from '../words/cards.ts';
  import * as goWords from '../words/chrome-go-to-card.ts';

  let { cards, onpick, id, row, look }: {
    /** The bookmarked cards, by board number. */
    cards: readonly OpenCard[];
    /** Go to card `n`. */
    onpick: (n: number) => void;
    id?: string;
    /** A row of the "⋯" menu, with this label. */
    row?: string;
    /** A state drawn without the pointer or keys: the gallery's samples only (MenuSelect). */
    look?: 'hover' | 'focus' | 'pressed';
  } = $props();
</script>

{#snippet menuRow()}
  <ButtonIcon name="bookmark" /><span class="vb-menu-label">{row}</span><span class="vb-menu-value">{cards.length}</span>
{/snippet}

<OpenChip {id} count={cards.length} {cards} {onpick} {look} icon="bookmark" word={cardsWords.bookmarkedWord} tone="bookmark"
  label={goWords.goToABookmarkedCard} title={goWords.bookmarkedChooseOneTo(cards.length)} row={row ? menuRow : undefined} />
