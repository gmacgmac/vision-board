<!-- The toolbar's "N bookmarked" chip (cardBookmark flag, board/cards/bookmark-flow.ts): a chip that is a button. A
     press focuses the next bookmarked card, in number order from the focused one, wrapping; the board
     pans it into view. Its words are "N bookmarked" (the count stays on a narrow toolbar, the word for
     screen readers); the title says what a press does. With `row` (adaptiveHeader flag, the narrowest
     bar) it is a row of the "⋯" menu. The toolbar and the gallery both draw this. -->
<script lang="ts">
  import ButtonIcon from './ButtonIcon.svelte';
  import { bookmarkedWords } from '../cards/index.ts';

  let { count, onclick, id, row }: { count: number; onclick: () => void; id?: string; row?: string } = $props();
  const words = $derived(bookmarkedWords(count));
</script>

{#if row}
  <button type="button" {id} class="vb-menu-item" title={words.title} {onclick}>
    <ButtonIcon name="bookmark" /><span class="vb-menu-label">{row}</span><span class="vb-menu-value">{words.count}</span>
  </button>
{:else}
  <button type="button" {id} class="vb-chip vb-chip-btn" data-tone="bookmark" title={words.title} {onclick}>
    <ButtonIcon name="bookmark" /><b>{words.count}</b> <span class="vb-chip-word">{words.word}</span>
  </button>
{/if}
